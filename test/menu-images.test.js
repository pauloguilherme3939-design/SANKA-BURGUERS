'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const esbuild = require('esbuild');

function loadMenuData() {
  const filename = path.join(__dirname, '..', 'data.jsx');
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = esbuild.transformSync(source, { loader: 'jsx', format: 'cjs', target: 'node18' });
  const moduleRecord = { exports: {} };
  Function('module', 'exports', 'require', compiled.code)(moduleRecord, moduleRecord.exports, require);
  return moduleRecord.exports;
}

test('todas as imagens declaradas no cardápio existem no projeto', () => {
  const data = loadMenuData();
  const items = [...data.SANKA_BURGERS, ...data.SANKA_SIDES, ...data.SANKA_DRINKS];

  for (const item of items) {
    if (!item.src) continue;
    const relativePath = item.src.replace(/^\//, '');
    assert.equal(
      fs.existsSync(path.join(__dirname, '..', relativePath)),
      true,
      `${item.code} aponta para imagem inexistente: ${item.src}`,
    );
  }
});

test('produtos corrigidos não voltam a usar associações legadas erradas', () => {
  const data = loadMenuData();
  const byCode = Object.fromEntries(data.SANKA_BURGERS.map(item => [item.code, item.src]));

  assert.equal(byCode['SK-L01'], '/assets/burgers/x-americano-v3.webp');
  assert.equal(byCode['SK-L14'], '/assets/burgers/bauru-carne-v2.webp');
  assert.notEqual(byCode['SK-L09'], '/assets/burgers/sb-009.webp');
  assert.notEqual(byCode['SK-L12'], '/assets/burgers/sb-012.webp');
  assert.notEqual(byCode['SK-L13'], '/assets/burgers/sb-010.webp');
  assert.notEqual(byCode['SK-L14'], '/assets/burgers/sb-014.webp');
});

test('lanches de carne ou sabor principal exibem os 250 g informados', () => {
  const data = loadMenuData();
  const byCode = Object.fromEntries(data.SANKA_BURGERS.map(item => [item.code, item]));
  const portionedCodes = [
    'SK-L01', 'SK-L02', 'SK-L03', 'SK-L04', 'SK-L05', 'SK-L06',
    'SK-L07', 'SK-L08', 'SK-L09', 'SK-L11', 'SK-L14',
  ];

  for (const code of portionedCodes) {
    assert.match(byCode[code].desc, /250 g/, `${code} não informa a porção de 250 g`);
  }
});
