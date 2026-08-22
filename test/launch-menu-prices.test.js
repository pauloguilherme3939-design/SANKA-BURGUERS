'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const esbuild = require('esbuild');

const serverCatalog = require('../lib/order-catalog.json');
const ifoodCatalog = require('../docs/cardapio-ifood-precos.json');

function loadMenuData() {
  const filename = path.join(__dirname, '..', 'data.jsx');
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = esbuild.transformSync(source, { loader: 'jsx', format: 'cjs', target: 'node18' });
  const moduleRecord = { exports: {} };
  Function('module', 'exports', 'require', compiled.code)(moduleRecord, moduleRecord.exports, require);
  return moduleRecord.exports;
}

const DIRECT_PRICES = {
  'SK-L01': 37.9,
  'SK-L02': 40.9,
  'SK-L03': 44.9,
  'SK-L04': 40.9,
  'SK-L05': 37.9,
  'SK-L06': 26.9,
  'SK-L07': 18.9,
  'SK-L08': 32.9,
  'SK-L09': 32.9,
  'SK-L10': 21.9,
  'SK-L11': 31.9,
  'SK-L12': 21.9,
  'SK-L13': 14,
  'SK-L14': 34.9,
  'SK-P01': 30,
  'SK-P02': 40,
  'SK-P03': 45,
  'SK-P04': 35,
};

const IFOOD_PRICES = {
  'X Americano': 39.9,
  'X Acebolado': 42.9,
  'X Promel': 45.9,
  'X Biquinho': 42.9,
  'X Azeitonado': 41.9,
  'X SMACH': 29.9,
  'SANKA BURGUER': 21.9,
  'X Panceta': 36.9,
  'X Lombo': 36.9,
  'X Frango Catupiry': 35.9,
  'Bauru de Carne': 38.9,
  'Misto Quente': 24.9,
  'Sanka Dog': 24.9,
  Prensadinho: 16.3,
};

test('preços diretos oficiais aparecem iguais na tela e no catálogo do servidor', () => {
  const data = loadMenuData();
  const visible = [...data.SANKA_BURGERS, ...data.SANKA_SIDES];
  const visiblePrices = Object.fromEntries(visible.map(item => [item.code, item.price]));
  const serverPrices = Object.fromEntries(serverCatalog.items.map(item => [item.id, item.price]));

  for (const [id, price] of Object.entries(DIRECT_PRICES)) {
    assert.equal(visiblePrices[id], price, `preço público incorreto para ${id}`);
    assert.equal(serverPrices[id], price, `preço do servidor incorreto para ${id}`);
  }
});

test('registro separado do iFood contém somente os 14 valores informados', () => {
  assert.equal(ifoodCatalog.channel, 'ifood');
  assert.equal(ifoodCatalog.status, 'informado');
  assert.equal(ifoodCatalog.items.length, 14);
  assert.deepEqual(
    Object.fromEntries(ifoodCatalog.items.map(item => [item.name, item.price])),
    IFOOD_PRICES,
  );
  assert.equal(ifoodCatalog.items.some(item => /copia/i.test(item.name)), false);
});
