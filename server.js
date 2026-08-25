'use strict';
require('dotenv').config();

const express = require('express');
const orderHandler = require('./api/pedido.js');
const rouletteHandler = require('./api/roleta.js');
const clubHandler = require('./api/clube/index.js');
const clubMembersHandler = require('./api/clube/members.js');

const app      = express();
const PORT     = process.env.PORT || 3000;
const ADMIN_PW = process.env.ADMIN_PASSWORD;

if (!ADMIN_PW) {
  console.warn('\n  ADMIN_PASSWORD nao definido - rotas administrativas desativadas.\n');
}

app.use(express.json({ limit: '64kb' }));
app.use(express.static(__dirname));

/* ── Pedido: mesma implementação usada na função serverless ────── */
app.all('/api/pedido', orderHandler);
app.all('/api/roleta', rouletteHandler);
app.all('/api/clube/members', clubMembersHandler);
app.all('/api/clube', clubHandler);

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────────┐
  │  Sanka Burgers                              │
  │                                             │
  │  Site     →  http://localhost:${PORT}          │
  │  Pedidos  →  http://localhost:${PORT}/admin-pedidos.html
  └─────────────────────────────────────────────┘
  `);
});
