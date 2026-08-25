'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function read(filename) {
  return fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
}

test('atalho administrativo fica no menu lateral e no cardápio, mantendo a autenticação da página', () => {
  const sections = read('sections.jsx');
  const cardapio = read('cardapio-app.jsx');
  const styles = read('styles.css');

  assert.match(
    sections,
    /href="admin-pedidos\.html"[^>]*className="nav-drawer-admin"[^>]*>Administração<\/a>/,
  );
  assert.doesNotMatch(sections, /className="admin-shortcut"/);
  assert.doesNotMatch(cardapio, /className="admin-shortcut"/);
  assert.match(
    cardapio,
    /href="admin-pedidos\.html"[\s\S]*?className="nav-admin-link"[\s\S]*?>\s*ADM\s*<\/a>/,
  );
  assert.match(styles, /\.nav-drawer-links \.nav-drawer-admin/);
  assert.match(styles, /\.nav-admin-link/);
});

test('painel oferece filtros e arquivamento auditável sem exclusão física', () => {
  const admin = read('admin-pedidos-app.jsx');
  assert.match(admin, /type="date"/);
  assert.match(admin, /Pedido, cliente, telefone ou item/);
  assert.match(admin, /ARQUIVAR DO PAINEL/);
  assert.match(admin, /DADOS E HISTÓRICO PRESERVADOS/);
  assert.doesNotMatch(admin, /fetch\([^)]*method:\s*['"]DELETE['"]/);
});
