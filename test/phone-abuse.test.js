'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createOrderHandler } = require('../api/pedido.js');
const { createAbuseProtection, RateLimitError } = require('../lib/abuse.js');
const { BlobAbuseStore, MemoryAbuseStore } = require('../lib/abuse-store.js');
const { normalizeBrazilianPhone, PhoneValidationError } = require('../lib/br-phone.js');
const { StorageError } = require('../lib/order-store.js');

const SECRET = 'anti-abuse-test-secret-with-more-than-thirty-two-characters';

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

function request(overrides = {}) {
  return {
    method: 'POST',
    query: {},
    headers: {
      cookie: 'sanka_abuse_device=1234567890abcdef1234567890abcdef',
      'x-vercel-forwarded-for': '203.0.113.48',
    },
    body: {},
    ...overrides,
  };
}

test('normaliza telefone brasileiro válido e rejeita padrões obviamente falsos', () => {
  assert.equal(normalizeBrazilianPhone('(19) 99999-0000'), '19999990000');
  assert.equal(normalizeBrazilianPhone('+55 19 99999-0000'), '19999990000');
  assert.equal(normalizeBrazilianPhone('019 99999-0000'), '19999990000');
  for (const invalid of ['00000000000', '11812345678', '101999990000', '19999999999', '12345678901']) {
    assert.throws(() => normalizeBrazilianPhone(invalid), PhoneValidationError);
  }
});

test('limita tentativas repetidas por telefone e múltiplos números pelo mesmo dispositivo', async () => {
  const now = () => new Date('2026-08-21T15:00:00.000Z');
  const phoneProtection = createAbuseProtection({ store: new MemoryAbuseStore(), secret: SECRET, now });
  const req = request();
  for (let index = 0; index < 6; index += 1) {
    await phoneProtection.enforce('order_create', req, responseRecorder(), { phone: '19999990000' });
  }
  await assert.rejects(
    () => phoneProtection.enforce('order_create', req, responseRecorder(), { phone: '19999990000' }),
    error => error instanceof RateLimitError && error.status === 429,
  );

  const deviceProtection = createAbuseProtection({ store: new MemoryAbuseStore(), secret: SECRET, now });
  for (let index = 0; index < 10; index += 1) {
    await deviceProtection.enforce('order_create', req, responseRecorder(), { phone: `1999990${String(index).padStart(4, '0')}` });
  }
  await assert.rejects(
    () => deviceProtection.enforce('order_create', req, responseRecorder(), { phone: '19999909999' }),
    error => error instanceof RateLimitError,
  );
});

test('rede compartilhada recebe limite complementar sem fingerprint invasivo', async () => {
  const protection = createAbuseProtection({
    store: new MemoryAbuseStore(),
    secret: SECRET,
    now: () => new Date('2026-08-21T15:00:00.000Z'),
  });
  for (let index = 0; index < 100; index += 1) {
    const device = index.toString(16).padStart(32, '0');
    await protection.enforce('order_create', request({
      headers: {
        cookie: `sanka_abuse_device=${device}`,
        'x-vercel-forwarded-for': '203.0.113.48',
      },
    }), responseRecorder());
  }
  await assert.rejects(
    () => protection.enforce('order_create', request({
      headers: {
        cookie: 'sanka_abuse_device=ffffffffffffffffffffffffffffffff',
        'x-vercel-forwarded-for': '203.0.113.99',
      },
    }), responseRecorder()),
    error => error instanceof RateLimitError,
  );
});

test('API responde 429 e Retry-After quando o limite é excedido', async () => {
  const handler = createOrderHandler({
    service: { async create() { throw new Error('não deveria criar'); } },
    abuseProtection: { async enforce() { throw new RateLimitError(60); } },
  });
  const res = responseRecorder();
  await handler(request({ body: { customer: { phone: '19999990000' } } }), res);
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['Retry-After'], '60');
  assert.equal(res.body.code, 'RATE_LIMITED');
});

test('controle persistido usa HMAC e conteúdo cifrado, sem telefone, IP ou dispositivo em texto público', async () => {
  const files = new Map();
  const fakeBlob = {
    async put(pathname, body) {
      const url = `https://blob.test/${encodeURIComponent(pathname)}`;
      files.set(pathname, { pathname, body, url });
      return { pathname, url };
    },
    async list({ prefix }) {
      return { blobs: [...files.values()].filter(file => file.pathname.startsWith(prefix)), hasMore: false };
    },
    async del() {},
  };
  const store = new BlobAbuseStore({ blob: fakeBlob, token: 'test-token', secret: SECRET });
  const protection = createAbuseProtection({
    store,
    secret: SECRET,
    now: () => new Date('2026-08-21T15:00:00.000Z'),
  });
  await protection.enforce('order_create', request(), responseRecorder(), { phone: '19999990000' });
  const exposed = [...files.values()].map(file => `${file.pathname}\n${file.body}`).join('\n');
  assert.doesNotMatch(exposed, /19999990000|203\.0\.113\.48|1234567890abcdef1234567890abcdef/);
  assert.match(exposed, /aes-256-gcm/);
});

test('falha do armazenamento bloqueia a operação sem criar pedido falso', async () => {
  let created = false;
  const protection = createAbuseProtection({
    store: {
      async pruneOlderThan() {},
      async recordAndCount() { throw new StorageError('Falha simulada.'); },
    },
    secret: SECRET,
  });
  const handler = createOrderHandler({
    service: { async create() { created = true; return { id: 'nunca' }; } },
    abuseProtection: protection,
  });
  const res = responseRecorder();
  await handler(request({ body: { customer: { phone: '19999990000' } } }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(created, false);
  assert.equal('order' in (res.body || {}), false);
});
