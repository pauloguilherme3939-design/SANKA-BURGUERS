'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const { neon } = require('@neondatabase/serverless');
const { PostgresAbuseStore } = require('../lib/abuse-store.js');
const { PostgresOrderStore } = require('../lib/order-store.js');
const { createOrderService } = require('../lib/orders.js');

const ENABLED = process.env.NEON_INTEGRATION === '1' && Boolean(process.env.DATABASE_URL);
const TEST_SECRET = 'segredo-sintetico-exclusivo-da-homologacao-neon-sanka';

function testPayload() {
  return {
    id: 'ID-ADULTERADO',
    total: 0.01,
    discount: 999,
    customer: { name: 'TESTE/HOMOLOGACAO NEON', phone: '(19) 99999-0000' },
    items: [{ id: 'SK-L01', qty: 2, price: 0.01 }],
    fulfillment: { type: 'pickup', address: null },
    payment: { method: 'pix', change: '' },
  };
}

test('Neon real executa o núcleo em tabelas efêmeras e não deixa dados de teste', {
  skip: !ENABLED,
}, async (t) => {
  const suffix = `${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const names = {
    orders: `sanka_test_orders_${suffix}`,
    events: `sanka_test_events_${suffix}`,
    counters: `sanka_test_counters_${suffix}`,
    attempts: `sanka_test_attempts_${suffix}`,
  };
  for (const name of Object.values(names)) {
    assert.match(name, /^sanka_test_[a-z0-9_]+$/);
  }

  const sql = neon(process.env.DATABASE_URL);
  const statements = [
    `CREATE TABLE ${names.orders} (
      id text PRIMARY KEY,
      order_day date NOT NULL,
      created_at timestamptz NOT NULL,
      payload_encrypted text NOT NULL
    )`,
    `CREATE TABLE ${names.events} (
      event_id uuid PRIMARY KEY,
      order_id text NOT NULL REFERENCES ${names.orders}(id) ON DELETE RESTRICT,
      event_kind text NOT NULL,
      created_at timestamptz NOT NULL,
      payload_encrypted text NOT NULL
    )`,
    `CREATE TABLE ${names.counters} (
      bucket_ms bigint NOT NULL,
      policy text NOT NULL,
      dimension text NOT NULL,
      subject_hash char(64) NOT NULL,
      attempt_count integer NOT NULL,
      updated_at_ms bigint NOT NULL,
      PRIMARY KEY (bucket_ms, policy, dimension, subject_hash)
    )`,
    `CREATE TABLE ${names.attempts} (
      attempt_id uuid PRIMARY KEY,
      bucket_ms bigint NOT NULL,
      policy text NOT NULL,
      dimension text NOT NULL,
      subject_hash char(64) NOT NULL,
      occurred_at_ms bigint NOT NULL,
      payload_encrypted text NOT NULL
    )`,
  ];
  for (const statement of statements) await sql.query(statement);

  t.after(async () => {
    await sql.query(`DROP TABLE IF EXISTS ${names.attempts}`);
    await sql.query(`DROP TABLE IF EXISTS ${names.counters}`);
    await sql.query(`DROP TABLE IF EXISTS ${names.events}`);
    await sql.query(`DROP TABLE IF EXISTS ${names.orders}`);
  });

  const database = {
    async ensureSchema() {},
    query(text, params = []) {
      const rewritten = text
        .replace(/\bsanka_order_events\b/g, names.events)
        .replace(/\bsanka_orders\b/g, names.orders)
        .replace(/\bsanka_abuse_attempts\b/g, names.attempts)
        .replace(/\bsanka_abuse_counters\b/g, names.counters);
      return sql.query(rewritten, params);
    },
  };

  let tick = 0;
  const orderId = 'SK-20000101-ABCDEF0123456789';
  const service = createOrderService({
    store: new PostgresOrderStore({ database, secret: TEST_SECRET }),
    now: () => new Date(Date.parse('2000-01-01T12:00:00.000Z') + tick++ * 1000),
    idFactory: () => orderId,
  });

  const created = await service.create(testPayload());
  assert.equal(created.pricing.total, 75.8);
  assert.equal(created.items[0].unitPrice, 37.9);
  await service.updateStatus(orderId, 'preparando');
  await service.cancel(orderId, { reason: 'motivo interno sintetico' });

  const restarted = createOrderService({
    store: new PostgresOrderStore({ database, secret: TEST_SECRET }),
  });
  const listed = await restarted.list('2000-01-01');
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, 'cancelado');
  const tracking = await restarted.getPublic(orderId);
  assert.equal(tracking.status, 'cancelado');
  assert.equal('customer' in tracking, false);
  assert.equal('items' in tracking, false);
  assert.equal('pricing' in tracking, false);

  const rawOrders = await sql.query(
    `SELECT payload_encrypted FROM ${names.orders}
     UNION ALL
     SELECT payload_encrypted FROM ${names.events}`,
  );
  const rawOrderText = JSON.stringify(rawOrders);
  assert.match(rawOrderText, /aes-256-gcm/);
  assert.doesNotMatch(rawOrderText, /TESTE\/HOMOLOGACAO|19999990000|motivo interno sintetico/);

  const abuseStore = new PostgresAbuseStore({ database, secret: TEST_SECRET });
  const record = {
    bucket: 946684800000,
    policy: 'order_create',
    dimension: 'network',
    subjectHash: crypto.createHmac('sha256', TEST_SECRET).update('rede-sintetica').digest('hex'),
    ts: 946684800001,
  };
  assert.equal(await abuseStore.recordAndCount(record), 1);
  assert.equal(await abuseStore.recordAndCount({ ...record, ts: record.ts + 1 }), 2);

  const rawAbuse = JSON.stringify(await sql.query(
    `SELECT subject_hash, payload_encrypted FROM ${names.attempts}`,
  ));
  assert.match(rawAbuse, /aes-256-gcm/);
  assert.doesNotMatch(rawAbuse, /rede-sintetica/);
});
