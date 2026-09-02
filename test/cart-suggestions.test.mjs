import assert from 'node:assert/strict';
import test from 'node:test';

import { getCartSuggestions } from '../lib/cart-suggestions.mjs';

const catalog = [
  { code: 'SK-L01', name: 'X-Americano', price: 37.9 },
  { code: 'SK-P01', name: 'Fritas', price: 29.9 },
  { code: 'SK-B01', name: 'Refrigerante lata', price: 8 },
  { code: 'SK-C01', name: 'Combo Clássico', price: 26.9 },
];

test('sugere somente itens oficiais que completam um lanche', () => {
  assert.deepEqual(
    getCartSuggestions([{ id: 'SK-L01' }], catalog).map(item => item.code),
    ['SK-P01', 'SK-B01'],
  );
});

test('não incomoda quem já escolheu acompanhamento, bebida ou combo', () => {
  assert.deepEqual(
    getCartSuggestions([{ id: 'SK-L01' }, { id: 'SK-P01' }], catalog).map(item => item.code),
    ['SK-B01'],
  );
  assert.deepEqual(getCartSuggestions([{ id: 'SK-C01' }], catalog), []);
});
