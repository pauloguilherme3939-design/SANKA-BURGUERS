'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const esbuild = require('esbuild');

const serverCatalog = require('../lib/order-catalog.json');

function loadMenuData() {
  const filename = path.join(__dirname, '..', 'data.jsx');
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = esbuild.transformSync(source, { loader: 'jsx', format: 'cjs', target: 'node18' });
  const moduleRecord = { exports: {} };
  Function('module', 'exports', 'require', compiled.code)(moduleRecord, moduleRecord.exports, require);
  return moduleRecord.exports;
}

test('catálogo validado no servidor permanece igual aos itens compráveis da tela', () => {
  const data = loadMenuData();
  const visibleItems = [
    ...data.SANKA_BURGERS.map(item => ({ id: item.code, name: item.name, price: item.price })),
    ...data.SANKA_SIDES.map(item => ({ id: item.code, name: item.name, price: item.price })),
    ...data.SANKA_DRINKS.slice(0, 9).map((item, index) => ({
      id: `DR-${String(index + 1).padStart(2, '0')}`,
      name: item.name,
      price: item.price,
    })),
    ...data.SANKA_DESSERTS.map((item, index) => ({
      id: `DS-${String(index + 1).padStart(2, '0')}`,
      name: item.name,
      price: item.price,
    })),
  ];

  assert.equal(serverCatalog.pricingStatus, 'placeholder');
  assert.deepEqual(serverCatalog.items, visibleItems);
});
