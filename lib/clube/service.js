// lib/clube/service.js — Camada de serviço do Clube Sanka
// BACKEND: localStorage (MVP).
// Pontos de integração Supabase marcados com // [SUPABASE].

import { TIERS, REWARDS_CATALOG, POINTS_CONFIG } from './config.js';

/* ── Storage keys ─────────────────────────────────────────────── */
const SK = {
  members:      'sanka_club_members',
  transactions: 'sanka_club_txns',
  redemptions:  'sanka_club_redemptions',
  rewards:      'sanka_club_rewards',
};

/* ── Helpers ──────────────────────────────────────────────────── */
function ls(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function rewardCode(rewardId) {
  const prefix = rewardId.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SANKA-${prefix}-${suffix}`;
}

/* ── Tiers ────────────────────────────────────────────────────── */
export function getTierForPoints(totalEarned) {
  return [...TIERS].reverse().find(t => totalEarned >= t.min) || TIERS[0];
}

export function getTierProgress(totalEarned) {
  const tier = getTierForPoints(totalEarned);
  const next = TIERS.find(t => t.min > totalEarned);
  if (!next) return { tier, next: null, pct: 100, remaining: 0 };
  const pct = Math.min(100, ((totalEarned - tier.min) / (next.min - tier.min)) * 100);
  return { tier, next, pct, remaining: next.min - totalEarned };
}

/* ── Members ──────────────────────────────────────────────────── */

// [SUPABASE] → supabase.from('clube_members').insert(member)
export function createMember({ name, phone, email, birthDate, consentMarketing }) {
  const members  = ls(SK.members, []);
  const cleanPhone = phone.replace(/\D/g, '');
  if (members.find(m => m.phone === cleanPhone)) {
    return { error: 'phone_exists', member: null };
  }

  const member = {
    id: uid(),
    name: name.trim(),
    phone: cleanPhone,
    email: (email || '').trim(),
    birthDate: birthDate || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pointsBalance:       0,
    totalPointsEarned:   0,
    totalPointsRedeemed: 0,
    tier: TIERS[0].id,
    isActive: true,
    consentMarketing: !!consentMarketing,
    spinDate: '',
    orderCount: 0,
  };

  members.push(member);
  lsSet(SK.members, members);

  // Bônus de cadastro imediato
  _addPoints(member.id, POINTS_CONFIG.bonusSignup, 'signup_bonus', 'Bônus de boas-vindas');

  return { error: null, member: getMemberById(member.id) };
}

// [SUPABASE] → supabase.from('clube_members').select('*').eq('phone', phone).single()
export function getMemberByPhone(phone) {
  const members = ls(SK.members, []);
  return members.find(m => m.phone === phone.replace(/\D/g, '')) || null;
}

// [SUPABASE] → supabase.from('clube_members').select('*').eq('id', id).single()
export function getMemberById(id) {
  const members = ls(SK.members, []);
  return members.find(m => m.id === id) || null;
}

// [SUPABASE] → supabase.from('clube_members').select('*').order('createdAt', desc)
export function getAllMembers() {
  return ls(SK.members, []);
}

function _patchMember(id, patch) {
  const members = ls(SK.members, []);
  const idx = members.findIndex(m => m.id === id);
  if (idx < 0) return null;
  members[idx] = { ...members[idx], ...patch, updatedAt: new Date().toISOString() };
  lsSet(SK.members, members);
  return members[idx];
}

/* ── Points ───────────────────────────────────────────────────── */

function _addPoints(memberId, points, type, description, meta = {}) {
  const member = getMemberById(memberId);
  if (!member || points <= 0) return { error: points <= 0 ? 'invalid_points' : 'member_not_found' };

  const txn = {
    id: uid(),
    memberId,
    type,
    points,
    description,
    meta,
    createdAt: new Date().toISOString(),
  };
  const txns = ls(SK.transactions, []);
  txns.unshift(txn);
  lsSet(SK.transactions, txns.slice(0, 3000));

  const newTotal   = member.totalPointsEarned + points;
  const newBalance = member.pointsBalance + points;
  const newTier    = getTierForPoints(newTotal);

  _patchMember(memberId, {
    pointsBalance:     newBalance,
    totalPointsEarned: newTotal,
    tier:              newTier.id,
  });

  return { error: null, transaction: txn };
}

// [SUPABASE] → supabase.from('clube_transactions').insert + update member
export function addPoints(memberId, points, type, description, meta = {}) {
  return _addPoints(memberId, points, type, description, meta);
}

function _removePoints(memberId, points, type, description, meta = {}) {
  const member = getMemberById(memberId);
  if (!member) return { error: 'member_not_found' };
  if (member.pointsBalance < points) return { error: 'insufficient_points' };

  const txn = {
    id: uid(),
    memberId,
    type,
    points: -Math.abs(points),
    description,
    meta,
    createdAt: new Date().toISOString(),
  };
  const txns = ls(SK.transactions, []);
  txns.unshift(txn);
  lsSet(SK.transactions, txns.slice(0, 3000));

  _patchMember(memberId, {
    pointsBalance:        member.pointsBalance - Math.abs(points),
    totalPointsRedeemed:  member.totalPointsRedeemed + Math.abs(points),
  });

  return { error: null, transaction: txn };
}

// [SUPABASE] → same as above, negative txn
export function removePoints(memberId, points, type, description, meta = {}) {
  return _removePoints(memberId, points, type, description, meta);
}

// [SUPABASE] → supabase.from('clube_transactions').select('*').eq('memberId', id).order('createdAt', desc)
export function getMemberTransactions(memberId, limit = 40) {
  return ls(SK.transactions, [])
    .filter(t => t.memberId === memberId)
    .slice(0, limit);
}

/* ── Rewards catalog ──────────────────────────────────────────── */

// [SUPABASE] → supabase.from('clube_rewards').select('*')
export function getRewards() {
  return ls(SK.rewards, null) ?? (lsSet(SK.rewards, REWARDS_CATALOG), REWARDS_CATALOG);
}

// [SUPABASE] → supabase.from('clube_rewards').upsert(rewards)
export function saveRewards(rewards) {
  lsSet(SK.rewards, rewards);
}

/* ── Redemptions ──────────────────────────────────────────────── */

// [SUPABASE] → supabase.from('clube_redemptions').insert + removePoints
export function redeemReward(memberId, rewardId) {
  const member  = getMemberById(memberId);
  const reward  = getRewards().find(r => r.id === rewardId && r.active !== false);
  if (!member) return { error: 'member_not_found' };
  if (!reward) return { error: 'reward_not_found' };
  if (member.pointsBalance < reward.points) return { error: 'insufficient_points' };

  // Gera código único
  let code;
  const existing = ls(SK.redemptions, []);
  let attempts = 0;
  do { code = rewardCode(rewardId); attempts++; }
  while (existing.some(r => r.code === code) && attempts < 10);

  const redemption = {
    id: uid(),
    memberId,
    rewardId,
    rewardTitle: reward.title,
    rewardEmoji: reward.emoji,
    pointsCost: reward.points,
    code,
    status: 'pending',
    createdAt: new Date().toISOString(),
    usedAt: null,
  };

  existing.unshift(redemption);
  lsSet(SK.redemptions, existing);

  const debit = _removePoints(memberId, reward.points, 'redeem', `Resgate: ${reward.title}`, { redemptionId: redemption.id });
  if (debit.error) {
    lsSet(SK.redemptions, existing.filter(r => r.id !== redemption.id));
    return { error: debit.error };
  }

  return { error: null, redemption };
}

// [SUPABASE] → supabase.from('clube_redemptions').select('*').eq('memberId', id)
export function getMemberRedemptions(memberId) {
  return ls(SK.redemptions, []).filter(r => r.memberId === memberId);
}

// [SUPABASE] → supabase.from('clube_redemptions').select('*').order('createdAt', desc)
export function getAllRedemptions() {
  return ls(SK.redemptions, []);
}

// [SUPABASE] → supabase.from('clube_redemptions').update({ status:'used', usedAt }).eq('id', id)
export function markRedemptionUsed(redemptionId) {
  const all = ls(SK.redemptions, []);
  const idx = all.findIndex(r => r.id === redemptionId);
  if (idx < 0) return { error: 'not_found' };
  if (all[idx].status === 'used') return { error: 'already_used' };
  all[idx] = { ...all[idx], status: 'used', usedAt: new Date().toISOString() };
  lsSet(SK.redemptions, all);
  return { error: null };
}

/* ── Spin wheel ───────────────────────────────────────────────── */

export function canSpinToday(memberId) {
  const member = getMemberById(memberId);
  if (!member) return false;
  const today = new Date().toISOString().slice(0, 10);
  return member.spinDate !== today;
}

export function recordSpin(memberId, points) {
  const today = new Date().toISOString().slice(0, 10);
  _patchMember(memberId, { spinDate: today });
  if (points > 0) {
    _addPoints(memberId, points, 'spin_bonus', `Roleta diária: +${points} pontos`);
  }
  return getMemberById(memberId);
}

/* ── Admin helpers ────────────────────────────────────────────── */

export function adminAdjustPoints(memberId, delta, note) {
  if (delta > 0) return _addPoints(memberId, delta, 'admin_adjust', note || 'Ajuste manual');
  return _removePoints(memberId, Math.abs(delta), 'admin_adjust', note || 'Ajuste manual');
}

export function exportMembersCSV() {
  const members = getAllMembers();
  const txns    = ls(SK.transactions, []);
  const rows = [
    ['ID', 'Nome', 'WhatsApp', 'Email', 'Aniversário', 'Tier', 'Saldo', 'Total Ganhos', 'Total Resgatados', 'Pedidos', 'Cadastro'],
    ...members.map(m => {
      const spinCount = txns.filter(t => t.memberId === m.id && t.type === 'spin_bonus').length;
      return [
        m.id, m.name, m.phone, m.email, m.birthDate,
        m.tier, m.pointsBalance, m.totalPointsEarned, m.totalPointsRedeemed,
        spinCount,
        new Date(m.createdAt).toLocaleDateString('pt-BR'),
      ];
    }),
  ];
  return rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
