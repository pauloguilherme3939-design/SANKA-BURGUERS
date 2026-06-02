'use strict';
require('dotenv').config();

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app      = express();
const PORT     = process.env.PORT || 3000;
const DATA     = path.join(__dirname, 'data', 'clube.json');
const ADMIN_PW = process.env.ADMIN_PASSWORD || (() => {
  console.warn('\n  ⚠️  ADMIN_PASSWORD não definido em .env — usando senha padrão insegura.');
  console.warn('     Defina ADMIN_PASSWORD=<senha-forte> antes de publicar.\n');
  return 'sanka2024';
})();

app.use(express.json());
app.use(express.static(__dirname));

/* ── Helpers ─────────────────────────────────────────────────── */
function readMembers() {
  if (!fs.existsSync(DATA)) return [];
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch { return []; }
}

function writeMembers(list) {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(list, null, 2), 'utf8');
}

function validatePayload({ name, whatsapp, birthday }) {
  const errors = {};
  if (!name || String(name).trim().length < 2)
    errors.name = 'Nome deve ter ao menos 2 caracteres.';
  const wa = String(whatsapp || '').replace(/\D/g, '');
  if (wa.length < 10 || wa.length > 11)
    errors.whatsapp = 'WhatsApp inválido.';
  if (birthday) {
    const m = String(birthday).match(/^(\d{2})\/(\d{2})$/);
    if (!m || +m[1] < 1 || +m[1] > 31 || +m[2] < 1 || +m[2] > 12)
      errors.birthday = 'Aniversário inválido. Use o formato DD/MM.';
  }
  return errors;
}

/* ── Pedido tracking (in-memory, espelha api/pedido.js) ─────── */
const orders = new Map();
const STATUSES = ['recebido','preparando','na_chapa','finalizando','saiu_entrega','entregue'];
function makeOrderId() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

app.post('/api/pedido', (req, res) => {
  const body  = req.body || {};
  const rawId = String(body.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const id    = rawId || makeOrderId();
  const now   = new Date().toISOString();
  const order = {
    id,
    items:     Array.isArray(body.items) ? body.items : [],
    name:      String(body.name || 'Cliente').slice(0, 80),
    phone:     String(body.phone || '').slice(0, 20),
    total:     Number(body.total) || 0,
    status:    'recebido',
    createdAt: now,
    updatedAt: now,
    history:   [{ status: 'recebido', ts: now }],
  };
  orders.set(id, order);
  res.status(201).json({ id, order });
});

app.get('/api/pedido', (req, res) => {
  if (req.query.list) {
    if (req.headers.authorization !== `Bearer ${ADMIN_PW}`)
      return res.status(401).json({ error: 'Não autorizado' });
    const today  = new Date().toISOString().slice(0, 10);
    const result = Array.from(orders.values())
      .filter(o => o.createdAt.startsWith(today))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.json(result);
  }
  const id = String(req.query.id || '').toUpperCase().trim();
  if (!id) return res.status(400).json({ error: 'id obrigatório' });
  const order = orders.get(id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado. Verifique o código.' });
  res.json(order);
});

app.patch('/api/pedido', (req, res) => {
  if (req.headers.authorization !== `Bearer ${ADMIN_PW}`)
    return res.status(401).json({ error: 'Não autorizado' });
  const id = String(req.query.id || '').toUpperCase().trim();
  const order = orders.get(id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Status inválido', valid: STATUSES });
  const now       = new Date().toISOString();
  order.status    = status;
  order.updatedAt = now;
  order.history.push({ status, ts: now });
  res.json(order);
});

/* ── POST /api/clube — inscrição ─────────────────────────────── */
app.post('/api/clube', (req, res) => {
  const { name, whatsapp, birthday } = req.body || {};
  const errors = validatePayload({ name, whatsapp, birthday });
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const members = readMembers();
  const wa = String(whatsapp).replace(/\D/g, '');

  if (members.find(m => m.whatsapp === wa))
    return res.status(409).json({ errors: { whatsapp: 'WhatsApp já cadastrado no Clube!' } });

  const member = {
    id:       Date.now().toString(),
    name:     String(name).trim(),
    whatsapp: wa,
    birthday: birthday ? String(birthday).trim() : null,
    joinedAt: new Date().toISOString(),
  };

  members.push(member);
  writeMembers(members);
  res.json({ ok: true });
});

/* ── GET /api/clube/members — admin ──────────────────────────── */
app.get('/api/clube/members', (req, res) => {
  if (req.query.password !== ADMIN_PW)
    return res.status(401).json({ error: 'Senha incorreta.' });

  const members   = readMembers();
  const nowMonth  = new Date().getMonth() + 1;
  const birthdays = members.filter(m => {
    if (!m.birthday) return false;
    return parseInt(m.birthday.split('/')[1], 10) === nowMonth;
  });

  res.json({ members, total: members.length, birthdaysThisMonth: birthdays });
});

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────────┐
  │  Sanka Burgers                              │
  │                                             │
  │  Site     →  http://localhost:${PORT}          │
  │  Admin    →  http://localhost:${PORT}/admin-clube.html
  └─────────────────────────────────────────────┘
  `);
});
