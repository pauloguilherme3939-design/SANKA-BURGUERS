'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAndPricePayload } = require('../lib/orders.js');
const serverCatalog = require('../lib/order-catalog.json');
const candidates = { 'SK-L06': 29.9, 'SK-L07': 25.9, 'SK-C01': 33.9, 'SK-C02': 105.7, 'SK-C03': 126.7 };
function payload(type, items) {
  return {
    customer: { name: 'TESTE S8 SINTÉTICO', phone: '(19) 99999-0000' },
    items: items.map(([id, qty]) => ({ id, qty, price: .01 })),
    fulfillment: { type, address: type === 'pickup' ? null : { cep: '00000000', street: 'Rua Sintética', number: '1', neighborhood: 'Bairro Fictício' } },
    payment: { method: 'pix', change: '' }, total: .01,
  };
}
for (const type of ['pickup', 'delivery']) {
  for (const [id, price] of Object.entries(candidates)) {
    test(`candidato ${id}, ${type}: servidor ignora preço adulterado e conserva frete correto`, () => {
      const order = validateAndPricePayload(payload(type, [[id, 1]]));
      assert.equal(order.items[0].unitPrice, price);
      assert.equal(order.pricing.subtotal, price);
      assert.equal(order.pricing.total, price);
      assert.equal(order.pricing.discount, 0);
      assert.equal(order.pricing.deliveryFee, type === 'pickup' ? 0 : null);
      assert.equal(order.pricing.totalIsFinal, type === 'pickup');
      assert.equal(order.fulfillment.address === null, type === 'pickup');
    });
  }
  test(`itens mistos e quantidade, ${type}: centavos calculados no servidor`, () => {
    const order = validateAndPricePayload(payload(type, [['SK-L06', 2], ['SK-L07', 1], ['SK-C01', 1]]));
    assert.equal(order.pricing.subtotalCents, 11960);
    assert.equal(order.pricing.totalCents, 11960);
    assert.deepEqual(order.items.map(x => x.lineTotal), [59.8, 25.9, 33.9]);
  });
}

test('carrinho anterior ao release mantém quantidade e usa preço candidato ao recarregar', async () => {
  const { reconcileCartItems } = await import('../lib/cart-catalog.mjs');
  const cart = reconcileCartItems([{ id: 'SK-L07', qty: 2, price: 18.9, obs: 'TESTE S8' }], serverCatalog.items);
  assert.equal(cart[0].price, 25.9);
  assert.equal(cart[0].qty, 2);
  const order = validateAndPricePayload(payload('pickup', cart.map(x => [x.id, x.qty])));
  assert.equal(order.pricing.total, 51.8);
});
