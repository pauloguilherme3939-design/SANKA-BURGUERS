import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAdminWhatsAppUrl,
  elapsedLabel,
  sortActiveOldestFirst,
  summarizeOrders,
} from '../lib/admin-order-view.mjs';

const orders = [
  { id: 'A', status: 'recebido', createdAt: '2026-08-25T22:10:00Z', pricing: { total: 50 }, fulfillment: { type: 'pickup' } },
  { id: 'B', status: 'entregue', createdAt: '2026-08-25T22:00:00Z', pricing: { total: 70 }, fulfillment: { type: 'delivery' } },
  { id: 'C', status: 'cancelado', createdAt: '2026-08-25T21:00:00Z', pricing: { total: 90 }, fulfillment: { type: 'delivery' } },
  { id: 'D', status: 'entregue', archived: true, createdAt: '2026-08-25T20:00:00Z', pricing: { total: 999 }, fulfillment: { type: 'pickup' } },
];

test('dashboard usa somente pedidos reais visíveis e não chama valor bruto de lucro', () => {
  assert.deepEqual(summarizeOrders(orders), {
    total: 3,
    active: 1,
    delivered: 1,
    cancelled: 1,
    pickup: 1,
    delivery: 1,
    grossValue: 120,
    averageTicket: 60,
    statusCounts: { recebido: 1, entregue: 1, cancelado: 1 },
  });
});

test('modo cozinha ordena pedidos do mais antigo para o mais novo', () => {
  assert.deepEqual(sortActiveOldestFirst(orders.slice(0, 3)).map(order => order.id), ['C', 'B', 'A']);
});

test('tempo decorrido é determinístico', () => {
  const now = new Date('2026-08-25T23:15:00Z').getTime();
  assert.equal(elapsedLabel('2026-08-25T23:14:40Z', now), 'agora');
  assert.equal(elapsedLabel('2026-08-25T22:48:00Z', now), '27 min');
  assert.equal(elapsedLabel('2026-08-25T21:45:00Z', now), '1h 30min');
});

test('WhatsApp administrativo usa telefone brasileiro e mensagem manual do status', () => {
  const url = buildAdminWhatsAppUrl({
    id: 'SK-20260825-AAAAAAAAAAAAAAAA',
    status: 'saiu_entrega',
    customer: { name: 'Cliente Teste', phone: '19999990000' },
    fulfillment: { type: 'pickup' },
  });
  assert.match(url, /^https:\/\/wa\.me\/5519999990000\?text=/);
  assert.match(decodeURIComponent(url), /está pronto para retirada/);
  assert.equal(buildAdminWhatsAppUrl({ customer: { phone: '123' } }), '');
});
