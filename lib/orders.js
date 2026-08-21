'use strict';

const { randomBytes } = require('crypto');
const catalogDocument = require('./order-catalog.json');
const orderRules = require('./order-rules.json');

const ORDER_STATUSES = ['recebido', 'preparando', 'na_chapa', 'finalizando', 'saiu_entrega', 'entregue'];
const ORDER_ID_RE = /^SK-(\d{8})-([A-F0-9]{16})$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const catalog = new Map(catalogDocument.items.map(item => [item.id, {
  ...item,
  priceCents: Math.round(item.price * 100),
}]));

class OrderError extends Error {
  constructor(message, status = 400, code = 'ORDER_ERROR', fields = undefined) {
    super(message);
    this.name = 'OrderError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function cleanText(value, maxLength) {
  return String(value || '').trim().replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, maxLength);
}

function formatDayKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function makeOrderId(value = new Date()) {
  return `SK-${formatDayKey(value).replace(/-/g, '')}-${randomBytes(8).toString('hex').toUpperCase()}`;
}

function normalizeOrderId(value) {
  const id = cleanText(value, 40).toUpperCase();
  if (!ORDER_ID_RE.test(id)) {
    throw new OrderError('Código do pedido inválido.', 400, 'INVALID_ORDER_ID');
  }
  return id;
}

function orderDayFromId(value) {
  const id = normalizeOrderId(value);
  const compact = ORDER_ID_RE.exec(id)[1];
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function money(cents) {
  return Number((cents / 100).toFixed(2));
}

function validateAndPricePayload(payload, { now = new Date(), idFactory = makeOrderId } = {}) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = {};
  const name = cleanText(body.customer?.name, 80);
  const phone = String(body.customer?.phone || '').replace(/\D/g, '').slice(0, 11);

  if (name.length < 2) errors.name = 'Informe o nome do cliente.';
  if (phone.length < 10 || phone.length > 11) errors.phone = 'Informe um telefone válido.';

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length < 1 || rawItems.length > 30) errors.items = 'O pedido deve ter entre 1 e 30 itens.';

  const merged = new Map();
  let totalQuantity = 0;
  for (const raw of rawItems) {
    const id = cleanText(raw?.id, 20).toUpperCase();
    const quantity = Number(raw?.qty);
    const product = catalog.get(id);
    if (!product) {
      errors.items = 'O pedido contém um produto inválido.';
      continue;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      errors.items = 'A quantidade de um produto é inválida.';
      continue;
    }
    totalQuantity += quantity;
    const previous = merged.get(id);
    const note = cleanText(raw?.note, 120);
    if (previous) {
      previous.quantity += quantity;
      if (previous.quantity > 20) errors.items = 'A quantidade de um produto excede o limite.';
      if (note && !previous.note) previous.note = note;
    } else {
      merged.set(id, { product, quantity, note });
    }
  }
  if (totalQuantity > 50) errors.items = 'A quantidade total do pedido excede o limite.';

  const fulfillmentType = cleanText(body.fulfillment?.type, 20);
  if (!['pickup', 'delivery'].includes(fulfillmentType)) errors.fulfillment = 'Forma de entrega inválida.';

  let address = null;
  if (fulfillmentType === 'delivery') {
    address = {
      cep: String(body.fulfillment?.address?.cep || '').replace(/\D/g, '').slice(0, 8),
      street: cleanText(body.fulfillment?.address?.street, 100),
      number: cleanText(body.fulfillment?.address?.number, 20),
      complement: cleanText(body.fulfillment?.address?.complement, 80),
      neighborhood: cleanText(body.fulfillment?.address?.neighborhood, 80),
    };
    if (address.cep.length !== 8) errors.cep = 'CEP inválido.';
    if (!address.street) errors.street = 'Informe a rua.';
    if (!address.number) errors.number = 'Informe o número.';
    if (!address.neighborhood) errors.neighborhood = 'Informe o bairro.';
  }

  const paymentMethod = cleanText(body.payment?.method, 20);
  if (!['pix', 'card', 'cash'].includes(paymentMethod)) errors.payment = 'Forma de pagamento inválida.';
  const change = cleanText(body.payment?.change, 30);
  if (paymentMethod === 'cash' && !change) errors.change = 'Informe o valor para troco.';

  const couponCode = cleanText(body.couponCode, 30).toUpperCase();
  const coupon = couponCode ? orderRules.coupons[couponCode] : null;
  if (couponCode && !coupon) errors.coupon = 'Cupom inválido ou expirado.';

  if (Object.keys(errors).length) {
    throw new OrderError('Revise os dados do pedido.', 400, 'VALIDATION_ERROR', errors);
  }

  const items = Array.from(merged.values()).map(({ product, quantity, note }) => {
    const lineTotalCents = product.priceCents * quantity;
    return {
      id: product.id,
      name: product.name,
      quantity,
      note,
      unitPrice: money(product.priceCents),
      lineTotal: money(lineTotalCents),
      unitPriceCents: product.priceCents,
      lineTotalCents,
    };
  });

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  let discountCents = 0;
  if (coupon?.type === 'percent') discountCents = Math.round(subtotalCents * (coupon.value / 100));
  else if (coupon) discountCents = Math.round(Number(coupon.value || 0) * 100);
  discountCents = Math.min(subtotalCents, Math.max(0, discountCents));

  const deliveryFeeConfigured = Number.isFinite(orderRules.deliveryFee);
  const freeDeliveryConfigured = Number.isFinite(orderRules.freeDeliveryAbove);
  const deliveryFeePending = fulfillmentType === 'delivery' && !deliveryFeeConfigured;
  const deliveryFeeCents = fulfillmentType !== 'delivery'
    ? 0
    : deliveryFeePending
      ? null
      : (freeDeliveryConfigured && (subtotalCents - discountCents) >= Math.round(orderRules.freeDeliveryAbove * 100))
        ? 0
        : Math.round(orderRules.deliveryFee * 100);
  const totalCents = Math.max(0, subtotalCents - discountCents + (deliveryFeeCents || 0));
  const timestamp = now.toISOString();

  return {
    schemaVersion: 1,
    id: idFactory(now),
    day: formatDayKey(now),
    source: 'website',
    pricingStatus: catalogDocument.pricingStatus,
    customer: { name, phone },
    fulfillment: { type: fulfillmentType, address },
    payment: { method: paymentMethod, change: paymentMethod === 'cash' ? change : '' },
    coupon: coupon ? { code: couponCode, type: coupon.type, label: coupon.label } : null,
    items,
    pricing: {
      subtotal: money(subtotalCents),
      discount: money(discountCents),
      deliveryFee: deliveryFeeCents === null ? null : money(deliveryFeeCents),
      total: money(totalCents),
      subtotalCents,
      discountCents,
      deliveryFeeCents,
      totalCents,
      totalIsFinal: !deliveryFeePending,
      pendingReason: deliveryFeePending ? 'delivery_fee' : null,
    },
    status: 'recebido',
    createdAt: timestamp,
    updatedAt: timestamp,
    history: [{ status: 'recebido', ts: timestamp }],
  };
}

function toPublicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    fulfillmentType: order.fulfillment?.type === 'delivery' ? 'delivery' : 'pickup',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    history: order.history,
  };
}

function createOrderService({ store, now = () => new Date(), idFactory = makeOrderId }) {
  if (!store) throw new Error('Order store obrigatório.');

  return {
    async create(payload) {
      const current = now();
      const order = validateAndPricePayload(payload, { now: current, idFactory });
      await store.create(order);
      return order;
    },

    async getPublic(id) {
      const order = await store.get(normalizeOrderId(id));
      if (!order) throw new OrderError('Pedido não encontrado. Verifique o código.', 404, 'ORDER_NOT_FOUND');
      return toPublicOrder(order);
    },

    async list(day = formatDayKey(now())) {
      if (!DAY_RE.test(day)) throw new OrderError('Data inválida.', 400, 'INVALID_DAY');
      return store.list(day);
    },

    async updateStatus(id, requestedStatus) {
      const normalizedId = normalizeOrderId(id);
      const status = cleanText(requestedStatus, 30);
      const current = await store.get(normalizedId);
      if (!current) throw new OrderError('Pedido não encontrado.', 404, 'ORDER_NOT_FOUND');
      const currentIndex = ORDER_STATUSES.indexOf(current.status);
      const requestedIndex = ORDER_STATUSES.indexOf(status);
      if (requestedIndex !== currentIndex + 1) {
        throw new OrderError('Transição de status inválida.', 409, 'INVALID_STATUS_TRANSITION');
      }
      const event = { kind: 'status', status, ts: now().toISOString() };
      await store.appendStatus(normalizedId, event);
      return {
        ...current,
        status,
        updatedAt: event.ts,
        history: [...current.history, { status, ts: event.ts }],
      };
    },
  };
}

module.exports = {
  ORDER_STATUSES,
  OrderError,
  catalogDocument,
  createOrderService,
  formatDayKey,
  makeOrderId,
  normalizeOrderId,
  orderDayFromId,
  orderRules,
  toPublicOrder,
  validateAndPricePayload,
};
