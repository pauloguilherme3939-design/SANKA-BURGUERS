const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BUSINESS_HOURS, displayHours, hoursSummary } = require('../lib/business-hours.js');

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

test('grade existente tem sete dias e fuso de São Paulo, aprovada e com bloqueio ativo na candidata', () => {
  const brand = read('lib/brand.js');
  assert.equal(BUSINESS_HOURS.timeZone, 'America/Sao_Paulo');
  assert.equal(BUSINESS_HOURS.approved, true);
  assert.equal(BUSINESS_HOURS.enforce, true);
  assert.deepEqual(displayHours(), [
    {day:'Segunda',hours:'Fechado',closed:true}, {day:'Terça',hours:'Fechado',closed:true},
    {day:'Quarta',hours:'18h30 às 23h30'}, {day:'Quinta',hours:'18h30 às 23h30'},
    {day:'Sexta',hours:'18h30 às 00h00'}, {day:'Sábado',hours:'18h30 às 00h00'},
    {day:'Domingo',hours:'18h30 às 23h30'},
  ]);
  assert.equal(hoursSummary(), 'Quarta e quinta, 18h30 às 23h30; sexta e sábado, 18h30 às 00h00; domingo, 18h30 às 23h30. Segunda e terça, fechado.');



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

test('seção de contato e rodapés exibem a configuração central existente', () => {
  const sections = read('sections.jsx');
  const menu = read('cardapio-app.jsx');

  assert.match(sections, /id="localizacao"/);
  assert.equal((sections.match(/SANKA_BRAND\.openingHoursSchedule\.map/g) || []).length, 2);
  assert.match(menu, /cardapio-footer-hours[^\n]*SANKA_BRAND\.openingHours/);
});
