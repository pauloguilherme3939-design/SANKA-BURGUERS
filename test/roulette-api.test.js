'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createRouletteHandler } = require('../api/roleta.js');

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

test('API expõe configuração desligada sem permitir giro', async () => {
  const service = {
    getPublicConfig() { return { enabled: false, prizes: [] }; },
    async spin() { throw new Error('não deveria girar'); },
  };
  const handler = createRouletteHandler({ service });
  const res = response();
  await handler({ method: 'GET', query: { action: 'config' }, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enabled, false);
});

test('serviço desligado permite ler a configuração sem segredo', () => {
  const { createRouletteService } = require('../lib/roulette.js');
  const service = createRouletteService({
    store: {},
    orderStore: {},
    enabled: false,
  });
  assert.equal(service.getPublicConfig().enabled, false);
});

test('cancelamento exige senha administrativa no cabeçalho', async () => {
  const service = { async cancel() { throw new Error('não deveria cancelar'); } };
  const handler = createRouletteHandler({ service, adminPassword: 'senha-teste' });
  const res = response();
  await handler({ method: 'POST', query: { action: 'cancel' }, headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Não autorizado.');
});
