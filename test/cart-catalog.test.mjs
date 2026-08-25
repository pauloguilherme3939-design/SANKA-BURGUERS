import assert from 'node:assert/strict';
import test from 'node:test';

import { reconcileCartItems } from '../lib/cart-catalog.mjs';

test('carrinho antigo recebe nome e preço atuais do catálogo oficial', () => {
  const stored = [{ id: 'SK-C02', name: 'Combo antigo', price: 99.8, qty: 2, obs: 'sem gelo' }];
  const catalog = [{ code: 'SK-C02', name: 'Combo Duplo Smash', price: 99.7, tags: 'combo' }];

  assert.deepEqual(reconcileCartItems(stored, catalog), [{
    id: 'SK-C02',
    name: 'Combo Duplo Smash',
    price: 99.7,
    qty: 2,
    obs: 'sem gelo',
    tags: 'combo',
  }]);
});

test('carrinho descarta item removido, quantidade inválida e produto apenas para consulta', () => {
  const stored = [
    { id: 'REMOVIDO', price: 1, qty: 1 },
    { id: 'SK-L01', price: 1, qty: 0 },
    { id: 'SK-B01', price: 12, qty: 1 },
  ];
  const catalog = [
    { code: 'SK-L01', name: 'X-Americano', price: 37.9 },
    { code: 'SK-B01', name: 'Refrigerante 2L', price: 12, purchaseDisabled: true },
  ];

  assert.deepEqual(reconcileCartItems(stored, catalog), []);
});
