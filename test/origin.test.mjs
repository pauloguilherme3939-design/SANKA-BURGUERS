import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeOrigins } from '../lib/admin-order-view.mjs';
import { cleanOrigin } from '../lib/origin.js';

test('cleanOrigin normaliza e limita a origem', () => {
  assert.equal(cleanOrigin(' Panfleto '), 'panfleto');
  assert.equal(cleanOrigin('insta<script>'), 'instascript');
  assert.equal(cleanOrigin(''), '');
});

test('summarizeOrigins conta 7 e 30 dias e ignora cancelados', () => {
  const now = Date.parse('2026-10-22T12:00:00Z');
  const day = 86400000;
  const at = d => new Date(now - d * day).toISOString();
  const orders = [
    { origin: 'panfleto', createdAt: at(1), status: 'entregue' },
    { origin: 'panfleto', createdAt: at(10), status: 'entregue' },
    { origin: 'sacola', createdAt: at(2), status: 'recebido' },
    { origin: 'sacola', createdAt: at(3), status: 'cancelado' },
    { createdAt: at(5), status: 'entregue' },
    { origin: 'panfleto', createdAt: at(40), status: 'entregue' },
  ];
  assert.deepEqual(summarizeOrigins(orders, now), [
    { origin: 'panfleto', d7: 1, d30: 2 },
    { origin: 'direto', d7: 1, d30: 1 },
    { origin: 'sacola', d7: 1, d30: 1 },
  ]);
});
