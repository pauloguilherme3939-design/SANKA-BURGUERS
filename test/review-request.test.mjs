import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewRequestUrl } from '../lib/admin-order-view.mjs';

const entregue = { status: 'entregue', customer: { name: 'Ana', phone: '(19) 98888-7777' } };

test('pedido de avaliação só com pedido entregue e URL preenchida', () => {
  assert.equal(buildReviewRequestUrl(entregue, ''), '');
  assert.equal(buildReviewRequestUrl({ ...entregue, status: 'saiu_entrega' }, 'https://g.page/x'), '');
  const url = buildReviewRequestUrl(entregue, 'https://g.page/x');
  assert.ok(url.startsWith('https://wa.me/5519988887777?text='));
  assert.match(decodeURIComponent(url), /Oi, Ana! Aqui é da Sanka Burgers\. Chegou tudo certo\?.*https:\/\/g\.page\/x$/);
});

test('telefone inválido não gera link', () => {
  assert.equal(buildReviewRequestUrl({ ...entregue, customer: { name: 'Ana', phone: '123' } }, 'https://g.page/x'), '');
});
