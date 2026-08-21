'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { StorageError } = require('../lib/order-store.js');
const { ROULETTE_CONFIG, selectPrize, validateRouletteConfig } = require('../lib/roulette-config.js');
const { createRouletteService, RouletteError } = require('../lib/roulette.js');
const { applyRouletteEvents, DuplicateSpinError, DuplicateUseError } = require('../lib/roulette-store.js');

const SECRET = 'roulette-test-secret-with-more-than-thirty-two-characters';
const ORDER_ID = 'SK-20260821-AAAAAAAAAAAAAAAA';
const START = new Date('2026-08-21T15:00:00.000Z');

class MemoryRouletteStore {
  constructor() {
    this.records = new Map();
    this.events = new Map();
  }
  key(day, phoneHash) { return `${day}:${phoneHash}`; }
  async create(record) {
    const key = this.key(record.day, record.phoneHash);
    if (this.records.has(key)) throw new DuplicateSpinError();
    this.records.set(key, structuredClone(record));
  }
  async getByPhone(day, phoneHash) {
    const key = this.key(day, phoneHash);
    const record = this.records.get(key);
    if (!record) return null;
    return applyRouletteEvents(record, this.events.get(key) || []);
  }
  async listDay(day) {
    const result = [];
    for (const record of this.records.values()) {
      if (record.day === day) result.push(await this.getByPhone(day, record.phoneHash));
    }
    return result;
  }
  async findByCodeHash(day, codeHash) {
    return (await this.listDay(day)).find(record => record.codeHash === codeHash) || null;
  }
  async findByOrderId(day, orderId) {
    return (await this.listDay(day)).filter(record => record.orderId === orderId || record.cancelledOrderId === orderId);
  }
  async claimUse(record, event) {
    const key = this.key(record.day, record.phoneHash);
    const current = await this.getByPhone(record.day, record.phoneHash);
    if (current.status !== 'issued') throw new DuplicateUseError();
    this.events.set(key, [...(this.events.get(key) || []), structuredClone(event)]);
  }
  async markExpired(record, event) {
    const key = this.key(record.day, record.phoneHash);
    this.events.set(key, [...(this.events.get(key) || []), structuredClone(event)]);
  }
  async markCancelled(record, event) {
    const key = this.key(record.day, record.phoneHash);
    this.events.set(key, [...(this.events.get(key) || []), structuredClone(event)]);
  }
}

function makeOrder({
  id = ORDER_ID,
  phone = '19999990000',
  subtotalCents = 10000,
  deliveryFeeCents = 0,
  totalIsFinal = true,
  coupon = null,
} = {}) {
  return {
    id,
    day: '2026-08-21',
    customer: { name: 'Cliente Teste', phone },
    coupon,
    pricing: {
      subtotalCents,
      discountCents: coupon ? 100 : 0,
      deliveryFeeCents,
      totalCents: subtotalCents + (deliveryFeeCents || 0),
      totalIsFinal,
    },
  };
}

function setup({ draw = 5500, order = makeOrder(), nowRef = { value: START }, store = new MemoryRouletteStore() } = {}) {
  const orders = new Map(order ? [[order.id, order]] : []);
  const service = createRouletteService({
    store,
    orderStore: { async get(id) { return orders.get(id) || null; } },
    secret: SECRET,
    enabled: true,
    now: () => nowRef.value,
    randomInt: () => draw,
  });
  return { service, store, orders, nowRef };
}

test('configuração soma 100% e todos os intervalos escolhem o prêmio correto', () => {
  const validation = validateRouletteConfig();
  assert.equal(validation.valid, true);
  assert.equal(validation.totalChancePercent, 100);
  const boundaries = [
    [0, 'try_again'], [5499, 'try_again'],
    [5500, 'discount_5'], [7999, 'discount_5'],
    [8000, 'discount_10'], [8999, 'discount_10'],
    [9000, 'discount_25'], [9099, 'discount_25'],
    [9100, 'fries_250'], [9899, 'fries_250'],
    [9900, 'fries_500'], [9999, 'fries_500'],
  ];
  for (const [draw, expected] of boundaries) {
    assert.equal(selectPrize(ROULETTE_CONFIG.prizes, draw).id, expected);
  }
});

test('bloqueia o segundo giro do mesmo telefone no mesmo dia', async () => {
  const { service } = setup();
  await service.spin({ phone: '(19) 99999-0000' });
  await assert.rejects(
    () => service.spin({ phone: '19999990000' }),
    error => error instanceof RouletteError && error.code === 'DAILY_SPIN_LIMIT',
  );
});

test('rejeita tentativa do navegador de escolher ou alterar o prêmio', async () => {
  const { service } = setup();
  await assert.rejects(
    () => service.spin({ phone: '19999990000', prizeId: 'discount_25' }),
    error => error instanceof RouletteError && error.code === 'CLIENT_PRIZE_REJECTED',
  );
  await assert.rejects(
    () => service.consume({ code: 'RS-ABCD-ABCDEFGH', orderId: ORDER_ID, discountAmount: 999 }),
    error => error instanceof RouletteError && error.code === 'CLIENT_PRIZE_REJECTED',
  );
});

test('benefício só é consumido após pedido persistido e não pode ser reutilizado', async () => {
  const { service, orders } = setup({ order: null });
  const spin = await service.spin({ phone: '19999990000' });
  await assert.rejects(
    () => service.consume({ code: spin.code, orderId: ORDER_ID }),
    error => error instanceof RouletteError && error.code === 'ORDER_NOT_PERSISTED',
  );
  orders.set(ORDER_ID, makeOrder());
  const used = await service.consume({ code: spin.code, orderId: ORDER_ID });
  assert.equal(used.status, 'used');
  assert.equal(used.benefit.discountAmount, 3);
  await assert.rejects(
    () => service.consume({ code: spin.code, orderId: ORDER_ID }),
    error => error instanceof RouletteError && error.code === 'PRIZE_ALREADY_USED',
  );
});

test('rejeita código vencido e registra a expiração', async () => {
  const nowRef = { value: START };
  const { service, store } = setup({ nowRef });
  const spin = await service.spin({ phone: '19999990000' });
  nowRef.value = new Date('2026-08-22T15:00:00.000Z');
  await assert.rejects(
    () => service.consume({ code: spin.code, orderId: ORDER_ID }),
    error => error instanceof RouletteError && error.code === 'PRIZE_EXPIRED',
  );
  const record = (await store.listDay('2026-08-21'))[0];
  assert.equal(record.status, 'expired');
  assert.ok(record.expiredAt);
});

test('respeita pedido mínimo antes de consumir o código', async () => {
  const { service } = setup({ draw: 8000, order: makeOrder({ subtotalCents: 3499 }) });
  const spin = await service.spin({ phone: '19999990000' });
  await assert.rejects(
    () => service.consume({ code: spin.code, orderId: ORDER_ID }),
    error => error instanceof RouletteError && error.code === 'MINIMUM_SUBTOTAL_NOT_MET',
  );
});

test('respeita os mínimos específicos das duas batatas', async () => {
  const smallDenied = setup({ draw: 9100, order: makeOrder({ subtotalCents: 3499 }) });
  const smallDeniedSpin = await smallDenied.service.spin({ phone: '19999990000' });
  await assert.rejects(
    () => smallDenied.service.consume({ code: smallDeniedSpin.code, orderId: ORDER_ID }),
    error => error instanceof RouletteError && error.code === 'MINIMUM_SUBTOTAL_NOT_MET',
  );

  const smallAllowed = setup({ draw: 9100, order: makeOrder({ subtotalCents: 3500 }) });
  const smallAllowedSpin = await smallAllowed.service.spin({ phone: '19999990000' });
  const smallBenefit = await smallAllowed.service.consume({ code: smallAllowedSpin.code, orderId: ORDER_ID });
  assert.equal(smallBenefit.benefit.freeItem.id, 'ROULETTE-FRIES-250');

  const largeDenied = setup({ draw: 9900, order: makeOrder({ subtotalCents: 5999 }) });
  const largeDeniedSpin = await largeDenied.service.spin({ phone: '19999990000' });
  await assert.rejects(
    () => largeDenied.service.consume({ code: largeDeniedSpin.code, orderId: ORDER_ID }),
    error => error instanceof RouletteError && error.code === 'MINIMUM_SUBTOTAL_NOT_MET',
  );

  const largeAllowed = setup({ draw: 9900, order: makeOrder({ subtotalCents: 6000 }) });
  const largeAllowedSpin = await largeAllowed.service.spin({ phone: '19999990000' });
  const largeBenefit = await largeAllowed.service.consume({ code: largeAllowedSpin.code, orderId: ORDER_ID });
  assert.equal(largeBenefit.benefit.freeItem.id, 'SK-P01');
});

test('aplica teto do desconto e nunca calcula desconto sobre a entrega', async () => {
  const capped = setup({ order: makeOrder({ subtotalCents: 10000, deliveryFeeCents: 6000 }) });
  const cappedSpin = await capped.service.spin({ phone: '19999990000' });
  const cappedUse = await capped.service.consume({ code: cappedSpin.code, orderId: ORDER_ID });
  assert.equal(cappedUse.benefit.discountAmount, 3);
  assert.equal(cappedUse.benefit.totalAfterBenefit, 157);

  const uncapped = setup({ order: makeOrder({ subtotalCents: 4000, deliveryFeeCents: 6000 }) });
  const uncappedSpin = await uncapped.service.spin({ phone: '19999990000' });
  const uncappedUse = await uncapped.service.consume({ code: uncappedSpin.code, orderId: ORDER_ID });
  assert.equal(uncappedUse.benefit.discountAmount, 2);
  assert.equal(uncappedUse.benefit.totalAfterBenefit, 98);
});

test('não acumula prêmio com outro cupom', async () => {
  const { service } = setup({ order: makeOrder({ coupon: { code: 'OUTRO' } }) });
  const spin = await service.spin({ phone: '19999990000' });
  await assert.rejects(
    () => service.consume({ code: spin.code, orderId: ORDER_ID }),
    error => error instanceof RouletteError && error.code === 'PRIZE_NOT_STACKABLE',
  );
});

test('cancelamento do pedido invalida o prêmio', async () => {
  const { service } = setup();
  const spin = await service.spin({ phone: '19999990000' });
  await service.cancel({ code: spin.code, orderId: ORDER_ID, reason: 'pedido_cancelado' });
  await assert.rejects(
    () => service.consume({ code: spin.code, orderId: ORDER_ID }),
    error => error instanceof RouletteError && error.code === 'PRIZE_CANCELLED',
  );
});

test('cancelamento administrativo invalida benefício já associado ao pedido', async () => {
  const { service, store } = setup();
  const spin = await service.spin({ phone: '19999990000' });
  await service.consume({ code: spin.code, orderId: ORDER_ID });
  const result = await service.cancelByOrderId(ORDER_ID);
  assert.equal(result.cancelledCount, 1);
  const record = (await store.listDay('2026-08-21'))[0];
  assert.equal(record.status, 'cancelled');
  assert.equal(record.cancelledOrderId, ORDER_ID);
});

test('falha de armazenamento não entrega resultado falso', async () => {
  const failingStore = new MemoryRouletteStore();
  failingStore.create = async () => { throw new StorageError('Falha simulada.'); };
  const { service } = setup({ store: failingStore });
  await assert.rejects(
    () => service.spin({ phone: '19999990000' }),
    error => error instanceof StorageError,
  );
  assert.equal(failingStore.records.size, 0);
});
