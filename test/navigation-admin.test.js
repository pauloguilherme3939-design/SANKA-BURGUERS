'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function read(filename) {
  return fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
}

test('atalho administrativo fica no menu lateral e mantém a autenticação da página', () => {
  const sections = read('sections.jsx');
  const cardapio = read('cardapio-app.jsx');
  const styles = read('styles.css');

  assert.match(
    sections,
    /href="admin-pedidos\.html"[^>]*className="nav-drawer-admin"[^>]*>Administração<\/a>/,
  );
  assert.doesNotMatch(sections, /className="admin-shortcut"/);
  assert.doesNotMatch(cardapio, /className="admin-shortcut"/);
  assert.match(styles, /\.nav-drawer-links \.nav-drawer-admin/);
});
