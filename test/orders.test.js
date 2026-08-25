'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createOrderService, OrderError } = require('../lib/orders.js');
const { FileOrderStore, StorageError } = require('../lib/order-store.js');

const CREATED_AT = new Date('2026-08-13T15:00:00.000Z');
const ORDER_ID = 'SK-20260813-AAAAAAAAAAAAAAAA';

function validPayload(overrides = {}) {
  return {
    id: 'PEDIDO-FALSO-DO-NAVEGADOR',
    total: 0.01,
    discount: 999,
    customer: { name: 'Cliente Teste', phone: '(19) 99999-0000' },
    items: [{ id: 'SK-L01', qty: 2, note: 'Sem cebola', price: 0.01 }],
    fulfillment: { type: 'pickup', address: null },
    payment: { method: 'pix', change: '' },
    couponCode: '',
    ...overrides,
  };
}

test('persiste pedido, recalcula valores no servidor e sobrevive a nova instância', async t => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sanka-orders-'));
  t.after(() => fs.rm(rootDir, { recursive: true, force: true }));

  const store = new FileOrderStore({ rootDir });
  const service = createOrderService({
    store,
    now: () => CREATED_AT,
    idFactory: () => ORDER_ID,
  });

  const created = await service.create(validPayload());
  assert.equal(created.id, ORDER_ID);
  assert.equal(created.items[0].name, 'X-Americano');
  assert.equal(created.items[0].unitPrice, 37.9);
  assert.equal(created.pricing.total, 75.8);
  assert.equal(created.pricingStatus, 'informed_launch_menu');

  const restarted = createOrderService({ store: new FileOrderStore({ rootDir }) });
  const tracked = await restarted.getPublic(ORDER_ID);
  assert.equal(tracked.status, 'recebido');
  assert.equal(tracked.fulfillmentType, 'pickup');
  assert.equal('customer' in tracked, false);
  assert.equal('items' in tracked, false);
  assert.equal('pricing' in tracked, false);

  const listed = await restarted.list('2026-08-13');
  assert.equal(listed.length, 1);
  assert.equal(listed[0].customer.name, 'Cliente Teste');
  assert.equal(listed[0].items[0].quantity, 2);
});

test('recalcula pedido com vários produtos e ignora preços e total adulterados', async t => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sanka-orders-multi-'));
  t.after(() => fs.rm(rootDir, { recursive: true, force: true }));

  const service = createOrderService({
    store: new FileOrderStore({ rootDir }),
    now: () => CREATED_AT,
    idFactory: () => ORDER_ID,
  });
  const created = await service.create(validPayload({
    total: 0.01,
    discount: 999,
    items: [
      { id: 'SK-L14', qty: 2, price: 0.01 },
      { id: 'SK-L01', qty: 1, price: 999 },
    ],
  }));

  assert.deepEqual(
    created.items.map(item => ({ id: item.id, unitPrice: item.unitPrice, quantity: item.quantity })),
    [
      { id: 'SK-L14', unitPrice: 34.9, quantity: 2 },
      { id: 'SK-L01', unitPrice: 37.9, quantity: 1 },
    ],
  );
  assert.equal(created.pricing.subtotal, 107.7);
  assert.equal(created.pricing.discount, 0);
  assert.equal(created.pricing.total, 107.7);

  const listed = await service.list('2026-08-13');
  assert.equal(listed.length, 1);
  assert.deepEqual(listed[0].items.map(item => item.name), ['Bauru de Carne', 'X-Americano']);
});

test('recalcula combo no servidor e ignora preço adulterado pelo navegador', async t => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sanka-orders-combo-'));
  t.after(() => fs.rm(rootDir, { recursive: true, force: true }));

  const service = createOrderService({
    store: new FileOrderStore({ rootDir }),
    now: () => CREATED_AT,
    idFactory: () => ORDER_ID,
  });
  const created = await service.create(validPayload({
    total: 0.01,
    items: [{ id: 'SK-C02', qty: 1, price: 0.01 }],
  }));

  assert.equal(created.items[0].name, 'Combo Duplo Smash');
  assert.equal(created.items[0].unitPrice, 99.7);
  assert.equal(created.pricing.subtotal, 99.7);
  assert.equal(created.pricing.total, 99.7);
});

test('persiste avanços sequenciais e rejeita salto de status', async t => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sanka-status-'));
  t.after(() => fs.rm(rootDir, { recursive: true, force: true }));

  let tick = 0;
  const now = () => new Date(CREATED_AT.getTime() + tick++ * 1000);
  const service = createOrderService({
    store: new FileOrderStore({ rootDir }),
    now,
    idFactory: () => ORDER_ID,
  });
  await service.create(validPayload());
  await assert.rejects(
    () => service.updateStatus(ORDER_ID, 'na_chapa'),
    error => error instanceof OrderError && error.status === 409,
  );
  await service.updateStatus(ORDER_ID, 'preparando');

  const restarted = createOrderService({ store: new FileOrderStore({ rootDir }) });
  const tracked = await restarted.getPublic(ORDER_ID);
  assert.equal(tracked.status, 'preparando');
  assert.deepEqual(tracked.history.map(entry => entry.status), ['recebido', 'preparando']);
  const listed = await restarted.list('2026-08-13');
  assert.equal(listed[0].status, 'preparando');
  assert.deepEqual(listed[0].history.map(entry => entry.status), ['recebido', 'preparando']);
});

test('cancelamento fica persistido, aparece no rastreio e bloqueia avanço posterior', async t => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sanka-cancel-'));
  t.after(() => fs.rm(rootDir, { recursive: true, force: true }));
  let tick = 0;
  const service = createOrderService({
    store: new FileOrderStore({ rootDir }),
    now: () => new Date(CREATED_AT.getTime() + tick++ * 1000),
    idFactory: () => ORDER_ID,
  });
  await service.create(validPayload());
  await service.updateStatus(ORDER_ID, 'preparando');
  const cancelled = await service.cancel(ORDER_ID, { reason: 'motivo interno de teste' });
  assert.equal(cancelled.status, 'cancelado');
  assert.equal(cancelled.cancellation.reason, 'motivo interno de teste');

  await assert.rejects(
    () => service.updateStatus(ORDER_ID, 'na_chapa'),
    error => error instanceof OrderError && error.code === 'ORDER_CANCELLED',
  );
  const restarted = createOrderService({ store: new FileOrderStore({ rootDir }) });
  const publicOrder = await restarted.getPublic(ORDER_ID);
  assert.equal(publicOrder.status, 'cancelado');
  assert.equal(publicOrder.history.at(-1).status, 'cancelado');
  assert.equal('cancellation' in publicOrder, false);
  assert.equal(JSON.stringify(publicOrder).includes('motivo interno'), false);
  const adminOrder = (await restarted.list('2026-08-13'))[0];
  assert.equal(adminOrder.cancellation.reason, 'motivo interno de teste');
});

test('falha de armazenamento durante cancelamento não retorna sucesso', async () => {
  const current = {
    ...validPayload(),
    id: ORDER_ID,
    status: 'recebido',
    history: [{ status: 'recebido', ts: CREATED_AT.toISOString() }],
  };
  const service = createOrderService({
    store: {
      async get() { return current; },
      async appendCancellation() { throw new StorageError('Falha simulada.'); },
    },
  });
  await assert.rejects(() => service.cancel(ORDER_ID), error => error instanceof StorageError);
});

test('arquivamento administrativo preserva pedido, exige estado terminal e permite restauração', async t => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sanka-archive-'));
  t.after(() => fs.rm(rootDir, { recursive: true, force: true }));
  let tick = 0;
  const createService = () => createOrderService({
    store: new FileOrderStore({ rootDir }),
    now: () => new Date(CREATED_AT.getTime() + tick++ * 1000),
    idFactory: () => ORDER_ID,
  });
  const service = createService();
  await service.create(validPayload());
  await assert.rejects(
    () => service.archive(ORDER_ID),
    error => error instanceof OrderError && error.code === 'ORDER_NOT_TERMINAL',
  );
  await service.cancel(ORDER_ID);
  const archived = await service.archive(ORDER_ID);
  assert.equal(archived.archived, true);
  assert.equal(archived.administrativeHistory.at(-1).kind, 'archived');

  const restarted = createService();
  const listed = await restarted.list('2026-08-13');
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, 'cancelado');
  assert.equal(listed[0].archived, true);
  assert.equal((await restarted.getPublic(ORDER_ID)).archived, undefined);

  const restored = await restarted.restore(ORDER_ID);
  assert.equal(restored.archived, false);
  assert.equal(restored.administrativeHistory.at(-1).kind, 'restored');
  assert.equal((await createService().list('2026-08-13'))[0].archived, false);
});

test('delivery mantém a taxa e o total final pendentes até a confirmação no WhatsApp', async () => {
  let persisted;
  const service = createOrderService({
    store: {
      async create(order) { persisted = order; },
      async get() { return null; },
      async list() { return []; },
      async appendStatus() {},
    },
    now: () => CREATED_AT,
    idFactory: () => ORDER_ID,
  });

  const created = await service.create(validPayload({
    items: [{ id: 'SK-L01', qty: 1 }],
    fulfillment: {
      type: 'delivery',
      address: {
        cep: '13500000',
        street: 'Rua Teste',
        number: '10',
        complement: '',
        neighborhood: 'Centro',
      },
    },
  }));

  assert.equal(created.pricing.deliveryFee, null);
  assert.equal(created.pricing.total, 37.9);
  assert.equal(created.pricing.totalIsFinal, false);
  assert.equal(created.pricing.pendingReason, 'delivery_fee');
  assert.equal(persisted.id, ORDER_ID);
});

test('rejeita produto desconhecido e propaga falha de persistência', async () => {
  const inMemoryStore = {
    async create() {},
    async get() { return null; },
    async list() { return []; },
    async appendStatus() {},
  };
  const validationService = createOrderService({ store: inMemoryStore });
  await assert.rejects(
    () => validationService.create(validPayload({ items: [{ id: 'INEXISTENTE', qty: 1 }] })),
    error => error instanceof OrderError && error.status === 400,
  );

  const failingService = createOrderService({
    store: {
      ...inMemoryStore,
      async create() { throw new StorageError('Falha controlada.'); },
    },
  });
  await assert.rejects(
    () => failingService.create(validPayload()),
    error => error instanceof StorageError,
  );
});
