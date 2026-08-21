import assert from 'node:assert/strict';
import test from 'node:test';

import { requestAdminOrderUpdate } from '../lib/admin-order-request.mjs';

test('painel rejeita falha de cancelamento e não recebe pedido atualizado falso', async () => {
  let requestBody;
  await assert.rejects(
    () => requestAdminOrderUpdate({
      orderId: 'SK-20260821-AAAAAAAAAAAAAAAA',
      token: 'segredo-de-teste',
      payload: { action: 'cancel' },
      fetchImpl: async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return {
          ok: false,
          status: 503,
          async json() { return { error: 'Cancelamento não foi persistido.' }; },
        };
      },
    }),
    error => error.status === 503 && /não foi persistido/i.test(error.message),
  );
  assert.deepEqual(requestBody, { action: 'cancel' });
});
