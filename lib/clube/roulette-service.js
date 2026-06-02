// lib/clube/roulette-service.js — Serviço da Roleta Sanka
// BACKEND: localStorage (MVP).
// ⚠️  ANTES DE PUBLICAR: mover executeSpin() para API serverless.
//     O resultado do giro NÃO deve ser calculado no client-side em produção.
// Pontos de migração marcados com // [API].

import { getMemberById, addPoints } from './service.js';
import { DEFAULT_ROULETTE_CONFIG }  from './roulette-config.js';

/* ── Storage keys ─────────────────────────────────────────────── */
const SK = {
  config:  'sanka_roulette_config',
  spins:   'sanka_roulette_spins',
  denied:  'sanka_roulette_denied',
};

/* ── Helpers ──────────────────────────────────────────────────── */
function ls(key, fb) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fb; }
  catch { return fb; }
}
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function spinCode(prizeId) {
  const prefix = prizeId.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 5);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SRK-${prefix}-${suffix}`;
}

function getWeekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}

/* ── Config ───────────────────────────────────────────────────── */

// [API] → GET /api/roulette/config
export function getRouletteConfig() {
  return ls(SK.config, null) ?? DEFAULT_ROULETTE_CONFIG;
}

// [API] → PATCH /api/roulette/config (admin only)
export function saveRouletteConfig(config) {
  lsSet(SK.config, config);
}

export function resetRouletteConfig() {
  localStorage.removeItem(SK.config);
}

/* ── Spin state: eligibility + timing ────────────────────────── */

// [API] → GET /api/roulette/state?memberId=...
export function getSpinState(memberId) {
  const config = getRouletteConfig();
  const member = getMemberById(memberId);

  if (!member) return { eligible: false, reason: 'not_member' };
  if (config.rouletteMode !== 'active') return { eligible: false, reason: 'mode_not_active' };

  const now        = new Date();
  const today      = now.toISOString().slice(0, 10);
  const weekStart  = getWeekStart(now);

  const allSpins   = getAllSpinHistory().filter(s => s.customerId === memberId);
  const spinsToday = allSpins.filter(s => s.createdAt.slice(0, 10) === today).length;
  const spinsWeek  = allSpins.filter(s => s.createdAt >= weekStart).length;
  const lastSpin   = allSpins[0] ?? null;

  // Cooldown check
  let cooldownEnd = null;
  if (lastSpin) {
    cooldownEnd = new Date(
      new Date(lastSpin.createdAt).getTime() + config.cooldownHours * 3_600_000
    ).toISOString();
  }
  if (cooldownEnd && now.toISOString() < cooldownEnd) {
    return { eligible: false, reason: 'cooldown', cooldownEnd, lastSpin };
  }

  // Daily limit
  if (spinsToday >= config.maxSpinsPerUserPerDay) {
    const endOfDay = new Date(now);
    endOfDay.setHours(24, 0, 0, 0);
    return { eligible: false, reason: 'daily_limit', cooldownEnd: endOfDay.toISOString(), lastSpin };
  }

  // Weekly limit
  if (spinsWeek >= config.maxSpinsPerUserPerWeek) {
    return { eligible: false, reason: 'weekly_limit', lastSpin };
  }

  return { eligible: true, spinsToday, spinsWeek, lastSpin };
}

/* ── Execute spin ─────────────────────────────────────────────── */

// [API] → POST /api/roulette/spin { memberId }
// ⚠️  MVP: cálculo no client-side. Antes do lançamento, mover para servidor.
export function executeSpin(memberId) {
  const config = getRouletteConfig();

  if (!config.rouletteEnabled || config.rouletteMode !== 'active') {
    return { error: 'mode_not_active' };
  }

  const member = getMemberById(memberId);
  if (!member) return { error: 'not_member' };

  const state = getSpinState(memberId);
  if (!state.eligible) {
    _logDenied(memberId, member.phone, state.reason, { cooldownEnd: state.cooldownEnd });
    return { error: state.reason, cooldownEnd: state.cooldownEnd };
  }

  // Weighted random — somente prêmios ativos
  const activePrizes = config.prizes.filter(p => p.active !== false);
  const prize        = _weightedRandom(activePrizes);
  const prizeIndex   = config.prizes.findIndex(p => p.id === prize.id);
  const seed         = Math.random().toString(36).slice(2, 10);

  const now       = new Date();
  const expiresAt = prize.type !== 'no_prize'
    ? new Date(now.getTime() + config.prizeValidityDays * 86_400_000).toISOString()
    : null;

  const code = (prize.type !== 'no_prize') ? spinCode(prize.id) : null;

  // Garante unicidade do código
  const allSpins = getAllSpinHistory();
  if (code && allSpins.some(s => s.code === code)) {
    return executeSpin(memberId); // retry (colisão improvável)
  }

  const spin = {
    id:          uid(),
    customerId:  memberId,
    memberName:  member.name,
    phone:       member.phone,
    prizeId:     prize.id,
    prizeName:   prize.label,
    prizeEmoji:  prize.emoji,
    resultType:  prize.type,
    code,
    value:       prize.value ?? null,
    seed,
    createdAt:   now.toISOString(),
    expiresAt,
    redeemedAt:  null,
    cancelledAt: null,
    status:      prize.type === 'no_prize' ? 'no_prize' : 'pending',
    source:      'roulette',
  };

  allSpins.unshift(spin);
  lsSet(SK.spins, allSpins.slice(0, 5000));

  // Se prêmio de pontos, creditar no Clube
  if (prize.type === 'points' && prize.value > 0) {
    addPoints(memberId, prize.value, 'roulette_spin', `Roleta Sanka: ${prize.label}`);
  }

  return { error: null, spin, prizeIndex };
}

/* ── History ──────────────────────────────────────────────────── */

// [API] → GET /api/roulette/history?memberId=...
export function getSpinHistory(memberId, limit = 30) {
  return getAllSpinHistory()
    .filter(s => s.customerId === memberId)
    .slice(0, limit);
}

// [API] → GET /api/roulette/history (admin)
export function getAllSpinHistory() {
  return ls(SK.spins, []);
}

export function getPendingSpins() {
  return getAllSpinHistory().filter(s => s.status === 'pending');
}

/* ── Redemption & admin actions ───────────────────────────────── */

// [API] → PATCH /api/roulette/spin/:id/redeem
export function markSpinRedeemed(spinId) {
  const all = getAllSpinHistory();
  const idx = all.findIndex(s => s.id === spinId);
  if (idx < 0) return { error: 'not_found' };
  if (all[idx].status !== 'pending') return { error: `already_${all[idx].status}` };
  all[idx] = { ...all[idx], status: 'redeemed', redeemedAt: new Date().toISOString() };
  lsSet(SK.spins, all);
  return { error: null };
}

// [API] → PATCH /api/roulette/spin/:id/cancel (admin)
export function cancelSpin(spinId) {
  const all = getAllSpinHistory();
  const idx = all.findIndex(s => s.id === spinId);
  if (idx < 0) return { error: 'not_found' };
  if (['redeemed','cancelled'].includes(all[idx].status)) return { error: `already_${all[idx].status}` };
  all[idx] = { ...all[idx], status: 'cancelled', cancelledAt: new Date().toISOString() };
  lsSet(SK.spins, all);
  return { error: null };
}

// Verifica expiração automaticamente (chamar ao abrir histórico)
export function syncExpiredSpins() {
  const all = getAllSpinHistory();
  const now = new Date().toISOString();
  let changed = false;
  const updated = all.map(s => {
    if (s.status === 'pending' && s.expiresAt && s.expiresAt < now) {
      changed = true;
      return { ...s, status: 'expired' };
    }
    return s;
  });
  if (changed) lsSet(SK.spins, updated);
}

/* ── Antifraude log ───────────────────────────────────────────── */

function _logDenied(memberId, phone, reason, meta = {}) {
  const log = ls(SK.denied, []);
  log.unshift({ timestamp: new Date().toISOString(), memberId, phone, reason, meta });
  lsSet(SK.denied, log.slice(0, 500));
}

export function getDeniedLog() {
  return ls(SK.denied, []);
}

export function clearDeniedLog() {
  lsSet(SK.denied, []);
}

/* ── Stats / export ───────────────────────────────────────────── */

export function getRouletteStats() {
  const spins = getAllSpinHistory();
  const byPrize = {};
  spins.forEach(s => {
    byPrize[s.prizeId] = (byPrize[s.prizeId] || 0) + 1;
  });
  return {
    totalSpins:   spins.length,
    pending:      spins.filter(s => s.status === 'pending').length,
    redeemed:     spins.filter(s => s.status === 'redeemed').length,
    expired:      spins.filter(s => s.status === 'expired').length,
    noprize:      spins.filter(s => s.status === 'no_prize').length,
    byPrize,
  };
}

export function exportSpinsCSV() {
  const spins = getAllSpinHistory();
  const rows = [
    ['ID','Membro','Telefone','Prêmio','Tipo','Código','Status','Criado','Expira','Resgatado'],
    ...spins.map(s => [
      s.id, s.memberName, s.phone, s.prizeName, s.resultType,
      s.code || '', s.status,
      new Date(s.createdAt).toLocaleDateString('pt-BR'),
      s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('pt-BR') : '',
      s.redeemedAt ? new Date(s.redeemedAt).toLocaleDateString('pt-BR') : '',
    ]),
  ];
  return rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

/* ── Internal: weighted random ────────────────────────────────── */
function _weightedRandom(prizes) {
  const total = prizes.reduce((s, p) => s + (Number(p.chance) || 0), 0);
  let r = Math.random() * total;
  for (const p of prizes) {
    r -= Number(p.chance) || 0;
    if (r <= 0) return p;
  }
  return prizes[0];
}
