'use strict';
// GET /api/clube/members?password=xxx — painel admin
// Substitui o endpoint Express do server.js para funcionar no Vercel (serverless).

const { list } = require('@vercel/blob');

const BLOB_KEY = 'sanka-clube/members.json';
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'sanka2024';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Método não permitido.' });

  if (req.query.password !== ADMIN_PW)
    return res.status(401).json({ error: 'Senha incorreta.' });

  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (!blobs.length) {
      return res.json({ members: [], total: 0, birthdaysThisMonth: [] });
    }

    const blobRes = await fetch(`${blobs[0].url}?t=${Date.now()}`);
    const members = blobRes.ok ? await blobRes.json() : [];

    const nowMonth = new Date().getMonth() + 1;
    const birthdaysThisMonth = members.filter(m => {
      if (!m.birthday) return false;
      return parseInt(m.birthday.split('/')[1], 10) === nowMonth;
    });

    return res.json({ members, total: members.length, birthdaysThisMonth });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao carregar membros.' });
  }
};
