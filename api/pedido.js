// api/pedido.js — Order tracking API · Sanka Burgers
// Vercel serverless function
// Storage: in-memory Map (persists while function stays warm)
// For production with high volume, replace with Vercel Blob or a DB.

const orders = new Map();

const STATUSES = ['recebido', 'preparando', 'na_chapa', 'finalizando', 'saiu_entrega', 'entregue'];

function makeId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  /* ── POST /api/pedido — criar pedido ── */
  if (req.method === 'POST') {
    const body = req.body || {};
    // Aceita ID vindo do cliente (gerado antes de abrir WA) ou gera um novo
    const rawId = String(body.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const id    = rawId || makeId();
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
    return res.status(201).json({ id, order });
  }

  /* ── GET /api/pedido?id=ABC123 — ler pedido ── */
  if (req.method === 'GET') {
    const id = String(req.query.id || '').toUpperCase().trim();
    if (!id) return res.status(400).json({ error: 'id obrigatório' });
    const order = orders.get(id);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado. Verifique o código.' });
    return res.json(order);
  }

  /* ── PATCH /api/pedido?id=ABC123 — atualizar status (admin) ── */
  if (req.method === 'PATCH') {
    const adminPwd = process.env.ADMIN_PASSWORD || 'sanka2024';
    const auth     = req.headers.authorization || '';
    if (auth !== `Bearer ${adminPwd}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    const id = String(req.query.id || '').toUpperCase().trim();
    if (!id) return res.status(400).json({ error: 'id obrigatório' });
    const order = orders.get(id);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status inválido', valid: STATUSES });
    }
    const now        = new Date().toISOString();
    order.status     = status;
    order.updatedAt  = now;
    order.history.push({ status, ts: now });
    return res.json(order);
  }

  /* ── GET /api/pedido?list=1 — listar pedidos do dia (admin) ── */
  if (req.method === 'GET' && req.query.list) {
    const adminPwd = process.env.ADMIN_PASSWORD || 'sanka2024';
    const auth     = req.headers.authorization || '';
    if (auth !== `Bearer ${adminPwd}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    const today  = new Date().toISOString().slice(0, 10);
    const result = Array.from(orders.values())
      .filter(o => o.createdAt.startsWith(today))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.json(result);
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
