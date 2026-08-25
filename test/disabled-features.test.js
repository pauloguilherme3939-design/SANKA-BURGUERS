'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const clubHandler = require('../api/clube/index.js');
const clubMembersHandler = require('../api/clube/members.js');
const rouletteHandler = require('../api/roleta.js');
const { createDefaultRouletteStore } = require('../lib/roulette-store.js');
const { StorageError } = require('../lib/order-store.js');

function response() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

for (const [name, handler, request] of [
  ['cadastro', clubHandler, { method: 'POST', body: { name: 'Teste', whatsapp: '19999990000' } }],
  ['painel', clubMembersHandler, { method: 'GET', query: { password: 'não-deve-ser-usada' } }],
]) {
  test(`Clube desativado bloqueia ${name} sem devolver dados`, async () => {
    const res = response();
    await handler(request, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'CLUB_DISABLED');
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal('members' in res.body, false);
  });
}

test('roleta desligada em ambiente publicado usa store inerte', async () => {
  const store = createDefaultRouletteStore({
    VERCEL_ENV: 'production',
    BLOB_READ_WRITE_TOKEN: 'valor-legado-não-utilizado',
    ROULETTE_ENABLED: 'false',
    ROULETTE_LEGAL_APPROVED: 'false',
  });
  await assert.rejects(() => store.create({}), error =>
    error instanceof StorageError && /desativada/.test(error.message));
});

test('roleta não pode ser ativada em ambiente publicado sem store homologado', () => {
  assert.throws(() => createDefaultRouletteStore({
    VERCEL_ENV: 'production',
    ROULETTE_ENABLED: 'true',
    ROULETTE_LEGAL_APPROVED: 'true',
  }), error => error instanceof StorageError && /não possui armazenamento homologado/.test(error.message));
});

test('configuração pública da roleta desligada não exige segredo nem inicia antiabuso', async () => {
  const previousSecret = process.env.ORDER_DATA_SECRET;
  delete process.env.ORDER_DATA_SECRET;
  const res = response();
  try {
    await rouletteHandler({ method: 'GET', query: { action: 'config' }, headers: {} }, res);
  } finally {
    if (previousSecret === undefined) delete process.env.ORDER_DATA_SECRET;
    else process.env.ORDER_DATA_SECRET = previousSecret;
  }
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enabled, false);
});
