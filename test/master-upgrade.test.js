'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('pedido direto conduz ao cardápio e iFood não recebe link inventado', () => {
  const sections = read('sections.jsx');
  const brand = read('lib/brand.js');
  assert.match(sections, /href="cardapio\.html"[\s\S]{0,220}MONTAR PEDIDO/);
  assert.match(sections, /Os preços deste canal não incorporam a taxa do marketplace/);
  assert.match(brand, /ifoodUrl:\s+''/);
  assert.match(brand, /isIfoodActive:\s+false/);
});

test('central operacional tem modo cozinha, métricas honestas e WhatsApp manual', () => {
  const admin = read('admin-pedidos-app.jsx');
  assert.match(admin, /Modo Cozinha/);
  assert.match(admin, /Valor bruto não é lucro/);
  assert.match(admin, /Falar com cliente/);
  assert.match(admin, /setInterval\(\(\) => fetchOrders\(true\), 30000\)/);
  assert.doesNotMatch(admin, /method:\s*['"]DELETE['"]/);
});

test('produção mantém Clube e Roleta desligados e remove claims fictícios dormentes', () => {
  const brand = read('lib/brand.js');
  const data = read('data.jsx');
  assert.match(brand, /isClubActive:\s+false/);
  assert.doesNotMatch(data, /Melhor lanche prensado que comi/);
  assert.doesNotMatch(data, /Raio de 6km coberto em até 35 minutos/);
});

test('páginas críticas não carregam Tailwind de desenvolvimento e recebem cabeçalhos básicos', () => {
  assert.doesNotMatch(read('admin-pedidos.html'), /cdn\.tailwindcss\.com/);
  assert.doesNotMatch(read('pedido.html'), /cdn\.tailwindcss\.com/);
  const vercel = JSON.parse(read('vercel.json'));
  const globalHeaders = vercel.headers.find(entry => entry.source === '/(.*)').headers;
  assert.ok(globalHeaders.some(header => header.key === 'X-Content-Type-Options' && header.value === 'nosniff'));
  assert.ok(globalHeaders.some(header => header.key === 'Referrer-Policy'));
});
