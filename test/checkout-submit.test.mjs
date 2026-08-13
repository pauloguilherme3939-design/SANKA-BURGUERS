import assert from 'node:assert/strict';
import test from 'node:test';

import { completeCheckout, persistCheckout } from '../lib/order-submit.mjs';

test('ações destrutivas ficam bloqueadas até a persistência confirmar', async () => {
  let releasePersistence;
  const events = [];
  const persistedOrder = { id: 'SK-20260813-DDDDDDDDDDDDDDDD', pricing: {}, items: [] };
  const persist = () => new Promise(resolve => { releasePersistence = resolve; });

  const completion = completeCheckout({
    payload: {},
    persist,
    onConfirmed: async order => events.push(`confirmed:${order.id}`),
  });

  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, []);
  releasePersistence(persistedOrder);
  await completion;
  assert.deepEqual(events, [`confirmed:${persistedOrder.id}`]);
});

test('falha de persistência não executa nenhuma ação de confirmação', async () => {
  let confirmed = false;
  await assert.rejects(
    completeCheckout({
      payload: {},
      persist: async () => { throw new Error('Falha controlada.'); },
      onConfirmed: async () => { confirmed = true; },
    }),
    /Falha controlada/,
  );
  assert.equal(confirmed, false);
});

test('cliente transforma falha HTTP e resposta inválida em mensagem visível', async () => {
  await assert.rejects(
    persistCheckout({}, async () => ({
      ok: false,
      async json() { return { error: 'Servidor indisponível.' }; },
    })),
    /Servidor indisponível/,
  );

  await assert.rejects(
    persistCheckout({}, async () => ({
      ok: true,
      async json() { return { id: 'sem-order' }; },
    })),
    /não confirmou/i,
  );
});
