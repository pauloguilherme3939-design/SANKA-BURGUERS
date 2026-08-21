'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createOrderHandler } = require('../api/pedido.js');
const { StorageError } = require('../lib/order-store.js');

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

test('listagem administrativa tem prioridade sobre consulta pública', async () => {
  let listed = false;
  const service = {
    async list() { listed = true; return [{ id: 'pedido' }]; },
    async getPublic() { throw new Error('não deveria consultar pedido público'); },
  };
  const handler = createOrderHandler({ service, adminPassword: 'senha-teste' });
  const res = responseRecorder();
  await handler({ method: 'GET', query: { list: '1' }, headers: { authorization: 'Bearer senha-teste' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(listed, true);
  assert.deepEqual(res.body, [{ id: 'pedido' }]);
});

test('nega painel sem credencial correta', async () => {
  const handler = createOrderHandler({ service: { async list() { return []; } }, adminPassword: 'senha-teste' });
  const res = responseRecorder();
  await handler({ method: 'GET', query: { list: '1' }, headers: {} }, res);
  assert.equal(res.statusCode, 401);
});

test('API só confirma criação após persistência e expõe falha como 503', async () => {
  const persisted = { id: 'SK-20260813-CCCCCCCCCCCCCCCC', pricing: {}, items: [] };
  const successHandler = createOrderHandler({ service: { async create() { return persisted; } } });
  const success = responseRecorder();
  await successHandler({ method: 'POST', query: {}, headers: {}, body: {} }, success);
  assert.equal(success.statusCode, 201);
  assert.equal(success.body.order, persisted);

  const failureHandler = createOrderHandler({
    service: { async create() { throw new StorageError('Falha simulada.'); } },
  });
  const failure = responseRecorder();
  await failureHandler({ method: 'POST', query: {}, headers: {}, body: {} }, failure);
  assert.equal(failure.statusCode, 503);
  assert.match(failure.body.error, /persistir/i);
  assert.equal('order' in failure.body, false);
});

test('cancelamento administrativo persiste antes de invalidar benefício associado', async () => {
  const calls = [];
  const cancelled = { id: 'SK-20260821-AAAAAAAAAAAAAAAA', status: 'cancelado' };
  const handler = createOrderHandler({
    service: {
      async cancel(id) { calls.push(`order:${id}`); return cancelled; },
    },
    adminPassword: 'senha-teste',
    cancelBenefits: async id => { calls.push(`benefit:${id}`); },
  });
  const res = responseRecorder();
  await handler({
    method: 'PATCH',
    query: { id: cancelled.id },
    headers: { authorization: 'Bearer senha-teste' },
    body: { action: 'cancel' },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'cancelado');
  assert.deepEqual(calls, [`order:${cancelled.id}`, `benefit:${cancelled.id}`]);
});

test('falha ao invalidar benefício não faz o painel fingir sucesso', async () => {
  const cancelled = { id: 'SK-20260821-AAAAAAAAAAAAAAAA', status: 'cancelado' };
  const handler = createOrderHandler({
    service: { async cancel() { return cancelled; } },
    adminPassword: 'senha-teste',
    cancelBenefits: async () => { throw new StorageError('Falha simulada.'); },
  });
  const res = responseRecorder();
  await handler({
    method: 'PATCH',
    query: { id: cancelled.id },
    headers: { authorization: 'Bearer senha-teste' },
    body: { action: 'cancel' },
  }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.status, undefined);
});
