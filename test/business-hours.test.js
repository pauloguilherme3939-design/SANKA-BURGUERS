const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function jsonLdWithHours(relativePath) {
  const html = read(relativePath);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
  return blocks.find(block => Array.isArray(block.openingHoursSpecification));
}

const expectedStructuredHours = [
  { days: ['Wednesday', 'Thursday'], opens: '18:30', closes: '23:30' },
  { days: ['Friday', 'Saturday'], opens: '18:30', closes: '00:00' },
  { days: ['Sunday'], opens: '18:30', closes: '23:30' },
];

function normalizeStructuredHours(specifications) {
  return specifications.map(specification => ({
    days: Array.isArray(specification.dayOfWeek)
      ? specification.dayOfWeek
      : [specification.dayOfWeek],
    opens: specification.opens,
    closes: specification.closes,
  }));
}

test('configuração visual contém os sete dias e o fuso oficial', () => {
  const brand = read('lib/brand.js');

  assert.match(brand, /timeZone:\s*'America\/Sao_Paulo'/);
  assert.match(brand, /Segunda', hours: 'Fechado', closed: true/);
  assert.match(brand, /Terça',\s+hours: 'Fechado', closed: true/);
  assert.match(brand, /Quarta',\s+hours: '18h30 às 23h30'/);
  assert.match(brand, /Quinta',\s+hours: '18h30 às 23h30'/);
  assert.match(brand, /Sexta',\s+hours: '18h30 às 00h00'/);
  assert.match(brand, /Sábado',\s+hours: '18h30 às 00h00'/);
  assert.match(brand, /Domingo', hours: '18h30 às 23h30'/);
});

test('home e páginas locais usam o mesmo horário estruturado', () => {
  const pages = [
    'index.html',
    'delivery-hamburgueria-rio-claro.html',
    'hamburguer-grande-rio-claro.html',
    'lanche-prensado-rio-claro.html',
    'melhor-hamburgueria-rio-claro.html',
  ];

  for (const page of pages) {
    const structuredData = jsonLdWithHours(page);
    assert.ok(structuredData, `${page} precisa ter openingHoursSpecification`);
    assert.deepEqual(normalizeStructuredHours(structuredData.openingHoursSpecification), expectedStructuredHours);
  }
});

test('site não conserva os horários provisórios conhecidos', () => {
  const files = [
    'index.html',
    'sections.jsx',
    'lib/brand.js',
    'nossa-carne-app.jsx',
    'delivery-hamburgueria-rio-claro.html',
    'hamburguer-grande-rio-claro.html',
    'lanche-prensado-rio-claro.html',
    'melhor-hamburgueria-rio-claro.html',
    'docs/SEO_LOCAL_CHECKLIST.md',
    'LANCAMENTO.md',
  ];
  const combined = files.map(read).join('\n');

  assert.doesNotMatch(combined, /de terça a domingo/iu);
  assert.doesNotMatch(combined, /18h às 23h30/iu);
  assert.doesNotMatch(combined, /"opens":\s*"18:00"/u);
  assert.doesNotMatch(combined, /horários de funcionamento serão confirmados/iu);
  assert.doesNotMatch(combined, /horários serão divulgados antes da inauguração/iu);
  assert.doesNotMatch(combined, /loja abre\. chapa acesa/iu);
});

test('seção de contato e rodapés exibem a configuração oficial', () => {
  const sections = read('sections.jsx');
  const menu = read('cardapio-app.jsx');

  assert.match(sections, /id="localizacao"/);
  assert.equal((sections.match(/SANKA_BRAND\.openingHoursSchedule\.map/g) || []).length, 2);
  assert.match(menu, /cardapio-footer-hours[^\n]*SANKA_BRAND\.openingHours/);
});
