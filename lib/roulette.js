'use strict';

const crypto = require('crypto');
const {
  ROULETTE_CONFIG,
  selectPrize,
  validateRouletteConfig,
} = require('./roulette-config.js');
const {
  DuplicateSpinError,
  DuplicateUseError,
} = require('./roulette-store.js');
const { normalizeOrderId, orderDayFromId } = require('./orders.js');

const PHONE_RE = /^\d{10,11}$/;
const CODE_RE = /^RS-[A-Z0-9]{4}-[A-Z0-9]{8}$/;

class RouletteError extends Error {
  constructor(message, status = 400, code = 'ROULETTE_ERROR') {
    super(message);
    this.name = 'RouletteError';
    this.status = status;
    this.code = code;
  }
}

function parseEnabled(value) {
  return value === true || String(value || '').toLowerCase() === 'true';
}

function rouletteEnabledFromEnv(env = process.env) {
  return parseEnabled(env.ROULETTE_ENABLED) && parseEnabled(env.ROULETTE_LEGAL_APPROVED);
}

function dayKey(value = new Date(), timeZone = ROULETTE_CONFIG.timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizePhone(value) {
  const phone = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!PHONE_RE.test(phone)) throw new RouletteError('Informe um telefone válido.', 400, 'INVALID_PHONE');
  return phone;
}

function requireSecret(secret) {
  if (!secret || String(secret).length < 32) {
    throw new RouletteError('ORDER_DATA_SECRET não configurado para a roleta.', 503, 'ROULETTE_SECRET_MISSING');
  }
  return String(secret);
}

function hmac(secret, namespace, value) {
  return crypto.createHmac('sha256', secret).update(`${namespace}:${value}`, 'utf8').digest('hex');
}

function makePrizeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  let suffix = '';
  for (let i = 0; i < 8; i += 1) suffix += alphabet[bytes[i] % alphabet.length];
  let prefix = '';
  for (let i = 8; i < 12; i += 1) prefix += alphabet[bytes[i] % alphabet.length];
  return `RS-${prefix}-${suffix}`;
}

function normalizePrizeCode(value) {
  const code = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!CODE_RE.test(code)) throw new RouletteError('Código da Roleta inválido.', 400, 'INVALID_PRIZE_CODE');
  return code;
}

function rejectClientControlledPrize(payload) {
  const forbidden = ['prize', 'prizeId', 'chance', 'discount', 'discountAmount', 'benefit', 'result'];
  if (forbidden.some(key => Object.prototype.hasOwnProperty.call(payload || {}, key))) {
    throw new RouletteError('O prêmio só pode ser determinado e calculado pelo servidor.', 400, 'CLIENT_PRIZE_REJECTED');
  }
}

function publicPrize(prize) {
  return {
    id: prize.id,
    label: prize.label,
    description: prize.description,
    type: prize.type,
    chancePercent: prize.chancePercent,
    minimumSubtotal: Number(((prize.minimumSubtotalCents || 0) / 100).toFixed(2)),
    maximumDiscount: prize.maximumDiscountCents == null
      ? null
      : Number((prize.maximumDiscountCents / 100).toFixed(2)),
  };
}

function calculateBenefit(prize, order) {
  const subtotalCents = Number(order?.pricing?.subtotalCents);
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new RouletteError('Pedido persistido sem subtotal válido.', 409, 'ORDER_PRICING_INVALID');
  }
  if (subtotalCents < Number(prize.minimumSubtotalCents || 0)) {
    throw new RouletteError(
      `Este benefício exige pedido mínimo de R$ ${(prize.minimumSubtotalCents / 100).toFixed(2).replace('.', ',')}.`,
      409,
      'MINIMUM_SUBTOTAL_NOT_MET',
    );
  }

  const deliveryFeeCents = order.pricing.deliveryFeeCents;
  let discountCents = 0;
  if (prize.type === 'discount') {
    discountCents = Math.min(
      Math.round(subtotalCents * (prize.discountPercent / 100)),
      prize.maximumDiscountCents,
    );
  }
  const itemsSubtotalAfterBenefitCents = Math.max(0, subtotalCents - discountCents);
  const totalAfterBenefitCents = order.pricing.totalIsFinal
    ? itemsSubtotalAfterBenefitCents + (Number.isInteger(deliveryFeeCents) ? deliveryFeeCents : 0)
    : itemsSubtotalAfterBenefitCents;

  return {
    prizeId: prize.id,
    label: prize.label,
    type: prize.type,
    discountPercent: prize.type === 'discount' ? prize.discountPercent : null,
    discountAmount: Number((discountCents / 100).toFixed(2)),
    discountAmountCents: discountCents,
    freeItem: prize.type === 'free_item' ? { ...prize.freeItem } : null,
    minimumSubtotal: Number(((prize.minimumSubtotalCents || 0) / 100).toFixed(2)),
    itemsSubtotalAfterBenefit: Number((itemsSubtotalAfterBenefitCents / 100).toFixed(2)),
    deliveryFee: deliveryFeeCents == null ? null : Number((deliveryFeeCents / 100).toFixed(2)),
    totalAfterBenefit: Number((totalAfterBenefitCents / 100).toFixed(2)),
    totalIsFinal: Boolean(order.pricing.totalIsFinal),
    appliesToDeliveryFee: false,
  };
}

function createRouletteService({
  store,
  orderStore,
  secret,
  enabled = false,
  config = ROULETTE_CONFIG,
  now = () => new Date(),
  randomInt = upperBound => crypto.randomInt(0, upperBound),
} = {}) {
  if (!store) throw new Error('Roulette store obrigatório.');
  if (!orderStore) throw new Error('Order store obrigatório para validar benefícios.');
  const configValidation = validateRouletteConfig(config);
  if (!configValidation.valid) throw new Error(configValidation.errors.join(' '));
  const isEnabled = parseEnabled(enabled);
  const safeSecret = secret ? requireSecret(secret) : null;

  return {
    getPublicConfig() {
      return {
        enabled: isEnabled,
        maxSpinsPerPhonePerDay: config.maxSpinsPerPhonePerDay,
        validity: config.validity,
        timeZone: config.timeZone,
        stackable: config.stackable,
        appliesToDeliveryFee: config.appliesToDeliveryFee,
        prizes: config.prizes.map(publicPrize),
      };
    },

    async spin(payload = {}) {
      if (!isEnabled) throw new RouletteError('Roleta em homologação.', 403, 'ROULETTE_DISABLED');
      rejectClientControlledPrize(payload);
      requireSecret(safeSecret);
      const phone = normalizePhone(payload.phone);
      const current = now();
      const day = dayKey(current, config.timeZone);
      const phoneHash = hmac(safeSecret, 'phone', phone);
      if (await store.getByPhone(day, phoneHash)) {
        throw new RouletteError('Este telefone já girou hoje.', 409, 'DAILY_SPIN_LIMIT');
      }

      const prize = selectPrize(config.prizes, randomInt(10000));
      const code = prize.type === 'no_prize' ? null : makePrizeCode();
      const record = {
        schemaVersion: 1,
        id: crypto.randomUUID(),
        day,
        phoneHash,
        prizeId: prize.id,
        prizeSnapshot: JSON.parse(JSON.stringify(prize)),
        codeHash: code ? hmac(safeSecret, 'code', code) : null,
        status: prize.type === 'no_prize' ? 'no_prize' : 'issued',
        createdAt: current.toISOString(),
        validOn: day,
        usedAt: null,
        cancelledAt: null,
      };

      try {
        await store.create(record);
      } catch (error) {
        if (error instanceof DuplicateSpinError) {
          throw new RouletteError('Este telefone já girou hoje.', 409, 'DAILY_SPIN_LIMIT');
        }
        throw error;
      }

      return {
        spinId: record.id,
        prize: publicPrize(prize),
        code,
        status: record.status,
        validOn: day,
      };
    },

    async consume(payload = {}) {
      if (!isEnabled) throw new RouletteError('Roleta em homologação.', 403, 'ROULETTE_DISABLED');
      rejectClientControlledPrize(payload);
      requireSecret(safeSecret);
      const code = normalizePrizeCode(payload.code);
      const orderId = normalizeOrderId(payload.orderId);
      const orderDay = orderDayFromId(orderId);
      const codeHash = hmac(safeSecret, 'code', code);
      const record = await store.findByCodeHash(orderDay, codeHash);
      if (!record) throw new RouletteError('Código da Roleta não encontrado.', 404, 'PRIZE_NOT_FOUND');
      if (record.status === 'used') throw new RouletteError('Este código já foi utilizado.', 409, 'PRIZE_ALREADY_USED');
      if (record.status === 'cancelled') throw new RouletteError('Este código foi cancelado.', 409, 'PRIZE_CANCELLED');
      if (record.status === 'expired' || dayKey(now(), config.timeZone) !== record.day) {
        if (record.status === 'issued') {
          await store.markExpired(record, { kind: 'expired', ts: now().toISOString() });
        }
        throw new RouletteError('Este código venceu.', 410, 'PRIZE_EXPIRED');
      }
      if (record.status !== 'issued') throw new RouletteError('Este resultado não gera benefício.', 409, 'PRIZE_NOT_REDEEMABLE');

      const order = await orderStore.get(orderId);
      if (!order) throw new RouletteError('O benefício só pode ser usado após o pedido ser persistido.', 409, 'ORDER_NOT_PERSISTED');
      if (order.day !== record.day) throw new RouletteError('O pedido precisa ser do mesmo dia do giro.', 409, 'ORDER_DAY_MISMATCH');
      if (order.coupon || Number(order.pricing?.discountCents || 0) > 0) {
        throw new RouletteError('O benefício da Roleta não acumula com outro cupom.', 409, 'PRIZE_NOT_STACKABLE');
      }
      const orderPhoneHash = hmac(safeSecret, 'phone', normalizePhone(order.customer?.phone));
      if (orderPhoneHash !== record.phoneHash) {
        throw new RouletteError('O código pertence a outro telefone.', 403, 'PRIZE_PHONE_MISMATCH');
      }

      const benefit = calculateBenefit(record.prizeSnapshot, order);
      const event = {
        kind: 'used',
        ts: now().toISOString(),
        orderId,
        benefit,
      };
      try {
        await store.claimUse(record, event);
      } catch (error) {
        if (error instanceof DuplicateUseError) {
          throw new RouletteError('Este código já foi utilizado.', 409, 'PRIZE_ALREADY_USED');
        }
        throw error;
      }
      return { code, orderId, status: 'used', usedAt: event.ts, benefit };
    },

    async cancel(payload = {}) {
      requireSecret(safeSecret);
      const code = normalizePrizeCode(payload.code);
      const orderId = normalizeOrderId(payload.orderId);
      const orderDay = orderDayFromId(orderId);
      const record = await store.findByCodeHash(orderDay, hmac(safeSecret, 'code', code));
      if (!record) throw new RouletteError('Código da Roleta não encontrado.', 404, 'PRIZE_NOT_FOUND');
      if (record.status === 'cancelled') return { status: 'cancelled', cancelledAt: record.cancelledAt };
      const event = {
        kind: 'cancelled',
        ts: now().toISOString(),
        orderId,
        reason: String(payload.reason || 'pedido_cancelado').slice(0, 80),
      };
      await store.markCancelled(record, event);
      return { status: 'cancelled', cancelledAt: event.ts };
    },
  };
}

module.exports = {
  RouletteError,
  calculateBenefit,
  createRouletteService,
  dayKey,
  normalizePhone,
  rouletteEnabledFromEnv,
};
