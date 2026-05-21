'use strict';
// POST /api/clube — inscrição no Clube Sanka
// Substitui o endpoint Express do server.js para funcionar no Vercel (serverless).
// Dados persistidos no Vercel Blob: sanka-clube/members.json

const { put, list, del } = require('@vercel/blob');

const BLOB_KEY  = 'sanka-clube/members.json';
const ADMIN_PW  = process.env.ADMIN_PASSWORD || 'sanka2024';

/* ── Helpers de persistência ─────────────────────────────── */
async function readMembers() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (!blobs.length) return [];
    const res = await fetch(`${blobs[0].url}?t=${Date.now()}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function writeMembers(members) {
  await put(BLOB_KEY, JSON.stringify(members, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/* ── Validação ───────────────────────────────────────────── */
function validate({ name, whatsapp, birthday }) {
  const errors = {};
  if (!name || String(name).trim().length < 2)
    errors.name = 'Nome deve ter ao menos 2 caracteres.';
  const wa = String(whatsapp || '').replace(/\D/g, '');
  if (wa.length < 10 || wa.length > 11)
    errors.whatsapp = 'WhatsApp inválido.';
  if (birthday) {
    const m = String(birthday).match(/^(\d{2})\/(\d{2})$/);
    if (!m || +m[1] < 1 || +m[1] > 31 || +m[2] < 1 || +m[2] > 12)
      errors.birthday = 'Aniversário inválido. Use DD/MM.';
  }
  return errors;
}

/* ── Handler ─────────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Método não permitido.' });

  if (!process.env.BLOB_READ_WRITE_TOKEN)
    return res.status(503).json({ error: 'Armazenamento não configurado. Contate o suporte.' });

  const { name, whatsapp, birthday } = req.body || {};
  const errors = validate({ name, whatsapp, birthday });
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const members = await readMembers();
  const wa = String(whatsapp).replace(/\D/g, '');

  if (members.find(m => m.whatsapp === wa))
    return res.status(409).json({ errors: { whatsapp: 'WhatsApp já cadastrado no Clube!' } });

  members.push({
    id:       Date.now().toString(),
    name:     String(name).trim(),
    whatsapp: wa,
    birthday: birthday ? String(birthday).trim() : null,
    joinedAt: new Date().toISOString(),
  });

  await writeMembers(members);
  return res.json({ ok: true });
};
