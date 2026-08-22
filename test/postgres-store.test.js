'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createAbuseProtection, RateLimitError } = require('../lib/abuse.js');
const { createDefaultAbuseStore, PostgresAbuseStore } = require('../lib/abuse-store.js');
const {
  createDefaultOrderStore,
  PostgresOrderStore,
  StorageError,
} = require('../lib/order-store.js');
const { createOrderService, OrderError } = require('../lib/orders.js');
const {
  DEFAULT_QUERY_TIMEOUT_MS,
  NeonPostgresDatabase,
  migrations,
} = require('../lib/postgres-database.js');
const { FakePostgresDatabase } = require('./helpers/fake-postgres.js');

const SECRET = 'segredo-postgres-de-teste-com-mais-de-trinta-e-dois-caracteres';
const ORDER_ID = 'SK-20260821-DDDDDDDDDDDDDDDD';
const CREATED_AT = new Date('2026-08-21T18:00:00.000Z');

function validPayload() {
  return {
    id: 'ID-ADULTERADO',
    total: 0.01,
    discount: 999,
    customer: { name: 'Cliente Neon Teste', phone: '(19) 99999-0000' },
    items: [{ id: 'SK-L01', qty: 2, price: 0.01 }],
    fulfillment: { type: 'pickup', address: null },
    payment: { method: 'pix', change: '' },
  };
}

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
  };
}

function request() {
  return {
    headers: {
      cookie: 'sanka_abuse_device=1234567890abcdef1234567890abcdef',
      'x-vercel-forwarded-for': '203.0.113.48',
    },
    socket: {},
  };
}

test('Postgres preserva pedido cifrado, painel, status, cancelamento e rastreamento após reinício', async () => {
  const database = new FakePostgresDatabase();
  let tick = 0;
  const service = createOrderService({
    store: new PostgresOrderStore({ database, secret: SECRET }),
    now: () => new Date(CREATED_AT.getTime() + tick++ * 1000),
    idFactory: () => ORDER_ID,
  });

  const created = await service.create(validPayload());
  assert.equal(created.id, ORDER_ID);
  assert.equal(created.items[0].name, 'X-Americano');
  assert.equal(created.items[0].unitPrice, 37.9);
  assert.equal(created.pricing.total, 75.8);
  await service.updateStatus(ORDER_ID, 'preparando');
  await service.cancel(ORDER_ID, { reason: 'motivo interno de teste' });

  const raw = database.rawPersistedText();
  assert.match(raw, /aes-256-gcm/);
  assert.doesNotMatch(raw, /Cliente Neon Teste|19999990000|motivo interno de teste/);

  const restarted = createOrderService({
    store: new PostgresOrderStore({ database, secret: SECRET }),
  });
  const adminOrders = await restarted.list('2026-08-21');
  assert.equal(adminOrders.length, 1);
  assert.equal(adminOrders[0].status, 'cancelado');
  assert.equal(adminOrders[0].customer.name, 'Cliente Neon Teste');
  assert.equal(adminOrders[0].cancellation.reason, 'motivo interno de teste');

  const tracking = await restarted.getPublic(ORDER_ID);
  assert.equal(tracking.status, 'cancelado');
  assert.equal('customer' in tracking, false);
  assert.equal('items' in tracking, false);
  assert.equal('pricing' in tracking, false);
  assert.equal(JSON.stringify(tracking).includes('motivo interno'), false);

  await assert.rejects(
    () => restarted.updateStatus(ORDER_ID, 'na_chapa'),
    error => error instanceof OrderError && error.code === 'ORDER_CANCELLED',
  );
});

test('falha do Postgres não confirma criação nem cancelamento', async () => {
  const failingDatabase = new FakePostgresDatabase({ fail: true });
  const store = new PostgresOrderStore({ database: failingDatabase, secret: SECRET });
  const createService = createOrderService({ store, idFactory: () => ORDER_ID });
  await assert.rejects(() => createService.create(validPayload()), StorageError);

  const cancelService = createOrderService({
    store: {
      async get() { return { id: ORDER_ID, status: 'recebido', history: [] }; },
      async appendCancellation() { throw new StorageError('Banco indisponível.'); },
    },
  });
  await assert.rejects(() => cancelService.cancel(ORDER_ID), StorageError);
});

test('Postgres antiabuso mantém HMAC, cifra e limite após nova instância', async () => {
  const database = new FakePostgresDatabase();
  const now = () => new Date('2026-08-21T18:00:00.000Z');
  const first = createAbuseProtection({
    store: new PostgresAbuseStore({ database, secret: SECRET }),
    secret: SECRET,
    now,
  });
  for (let index = 0; index < 6; index += 1) {
    await first.enforce('order_create', request(), responseRecorder(), { phone: '19999990000' });
  }

  const restarted = createAbuseProtection({
    store: new PostgresAbuseStore({ database, secret: SECRET }),
    secret: SECRET,
    now,
  });
  await assert.rejects(
    () => restarted.enforce('order_create', request(), responseRecorder(), { phone: '19999990000' }),
    error => error instanceof RateLimitError,
  );

  const raw = database.rawPersistedText();
  assert.match(raw, /aes-256-gcm/);
  assert.doesNotMatch(raw, /19999990000|203\.0\.113\.48|1234567890abcdef1234567890abcdef/);
  assert.match(raw, /[a-f0-9]{64}/);
});

test('falha do Postgres bloqueia o controle antiabuso', async () => {
  const protection = createAbuseProtection({
    store: new PostgresAbuseStore({
      database: new FakePostgresDatabase({ fail: true }),
      secret: SECRET,
    }),
    secret: SECRET,
  });
  await assert.rejects(
    () => protection.enforce('order_create', request(), responseRecorder(), { phone: '19999990000' }),
    StorageError,
  );
});

test('fábricas de Production exigem Postgres e não usam Blob como fallback', () => {
  const database = new FakePostgresDatabase();
  const env = {
    VERCEL_ENV: 'production',
    DATABASE_URL: 'postgresql://teste-injetado',
    BLOB_READ_WRITE_TOKEN: 'blob-legado-que-nao-deve-ser-usado',
    ORDER_DATA_SECRET: SECRET,
  };
  assert.ok(createDefaultOrderStore(env, { database }) instanceof PostgresOrderStore);
  assert.ok(createDefaultAbuseStore(env, { database }) instanceof PostgresAbuseStore);
  assert.throws(
    () => createDefaultOrderStore({ VERCEL_ENV: 'production', BLOB_READ_WRITE_TOKEN: 'legado' }),
    error => error instanceof StorageError && /DATABASE_URL/.test(error.message),
  );
  assert.throws(
    () => createDefaultAbuseStore({ VERCEL_ENV: 'production', BLOB_READ_WRITE_TOKEN: 'legado' }),
    error => error instanceof StorageError && /DATABASE_URL/.test(error.message),
  );
});

test('executor aplica a migration mínima uma única vez por instância', async () => {
  const calls = [];
  const sql = {
    async query(text, params) {
      calls.push({ text, params });
      if (text.startsWith('SELECT id FROM sanka_schema_migrations')) return [];
      return [];
    },
  };
  const database = new NeonPostgresDatabase({
    connectionString: 'postgresql://teste-injetado',
    neonFactory: () => sql,
  });
  await database.ensureSchema();
  const countAfterFirstRun = calls.length;
  await database.ensureSchema();
  assert.equal(calls.length, countAfterFirstRun);
  assert.equal(
    countAfterFirstRun,
    3 + migrations.reduce((total, migration) => total + migration.statements.length, 0),
  );
  assert.ok(calls.some(call => call.text.includes('sanka_order_events_immutable')));
});

test('consultas Neon recebem timeout abortável sem vazar a conexão', async () => {
  const calls = [];
  const sql = {
    async query(text, params, options) {
      calls.push({ text, params, options });
      return [];
    },
  };
  const database = new NeonPostgresDatabase({
    connectionString: 'postgresql://teste-injetado',
    neonFactory: () => sql,
  });
  await database.query('SELECT 1');
  assert.equal(calls.length, 1);
  assert.ok(calls[0].options.fetchOptions.signal instanceof AbortSignal);
  assert.equal(calls[0].options.fetchOptions.signal.aborted, false);
  assert.equal(DEFAULT_QUERY_TIMEOUT_MS, 8000);
});
