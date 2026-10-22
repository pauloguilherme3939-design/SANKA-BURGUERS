// lib/origin.js — Origem do cliente (panfleto, sacola, instagram...)
// A captura acontece no analytics.js (carregado nas páginas públicas):
// ?utm_source=X ou ?ref=X é salvo em localStorage por 30 dias.
// Aqui só lemos. Sem origem válida = 'direto'.

export const ORIGIN_KEY = 'sanka_origin';
export const ORIGIN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function cleanOrigin(raw) {
  return String(raw || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

export function getOrigin() {
  try {
    const s = JSON.parse(localStorage.getItem(ORIGIN_KEY) || 'null');
    if (s && s.source && Date.now() - s.ts < ORIGIN_TTL_MS) return cleanOrigin(s.source) || 'direto';
  } catch {}
  return 'direto';
}
