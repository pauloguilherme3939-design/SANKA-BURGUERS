// admin-clube-app.jsx — Painel Admin do Clube Sanka
// v4: + Roleta Sanka (config, histórico, pendentes, antifraude)

import {
  getAllMembers, getMemberById, getMemberTransactions, getMemberRedemptions,
  adminAdjustPoints, getAllRedemptions, markRedemptionUsed,
  getRewards, saveRewards, exportMembersCSV,
  getTierProgress,
} from './lib/clube/service.js';
import {
  getRouletteConfig, saveRouletteConfig, resetRouletteConfig,
  getAllSpinHistory, getPendingSpins, markSpinRedeemed, cancelSpin,
  getDeniedLog, clearDeniedLog, getRouletteStats,
  exportSpinsCSV, syncExpiredSpins,
} from './lib/clube/roulette-service.js';
import { TIERS, REWARDS_CATALOG } from './lib/clube/config.js';
import { DEFAULT_ROULETTE_CONFIG, validateChances } from './lib/clube/roulette-config.js';

const { useState, useMemo, useEffect } = React;

const ADMIN_PIN_KEY = 'sanka_admin_pin';
const DEFAULT_PIN   = 'sanka2025';

/* ── Tokens ──────────────────────────────────────────────────── */
const T = {
  bg:      '#0A0A0A',
  surface: '#111110',
  border:  'rgba(245,239,230,0.08)',
  fire:    '#EA580C',
  ink:     '#F5EFE6',
  dim:     '#8A7D6E',
  mute:    '#4E453C',
  body:    "'Space Grotesk', sans-serif",
  mono:    "'JetBrains Mono', monospace",
  display: "'Anton', sans-serif",
};

const cardStyle = {
  background: T.surface, border:`1px solid ${T.border}`,
  borderRadius:12, padding:'16px 18px', boxSizing:'border-box',
};
const inp = {
  background: T.surface, border:`1px solid ${T.border}`,
  borderRadius:8, padding:'10px 14px', color:T.ink,
  fontFamily:T.body, fontSize:14, outline:'none', width:'100%', boxSizing:'border-box',
};

/* ── Helpers ──────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function fmtPhone(p) {
  if (!p) return '—';
  if (p.length === 11) return `(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}`;
  if (p.length === 10) return `(${p.slice(0,2)}) ${p.slice(2,6)}-${p.slice(6)}`;
  return p;
}
function fmtPts(n) { return `${n} pts`; }

function tierInfo(tierId) {
  return TIERS.find(t => t.id === tierId) || TIERS[0];
}

function downloadCSV() {
  const csv  = exportMembersCSV();
  const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `clube-sanka-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Login screen ─────────────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [pin,  setPin]  = useState('');
  const [err,  setErr]  = useState('');

  function submit(e) {
    e.preventDefault();
    const stored = localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN;
    if (pin === stored) { onLogin(); }
    else { setErr('PIN incorreto.'); }
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ ...cardStyle, maxWidth:360, width:'100%', textAlign:'center' }}>
        <div style={{
          width:52, height:52, borderRadius:12, background:T.fire,
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 16px', fontFamily:T.display, fontSize:24, color:'#fff',
        }}>S</div>
        <h1 style={{ fontFamily:T.display, fontSize:24, color:T.ink, letterSpacing:2, marginBottom:6 }}>CLUBE SANKA</h1>
        <p style={{ color:T.dim, fontSize:13, fontFamily:T.body, marginBottom:24 }}>Painel administrativo</p>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input style={inp} type="password" placeholder="PIN de acesso" value={pin}
            onChange={e => { setPin(e.target.value); setErr(''); }} autoFocus />
          {err && <p style={{ color:'#F87171', fontSize:13, fontFamily:T.body }}>{err}</p>}
          <button type="submit" style={{
            background:T.fire, color:'#fff', border:'none',
            fontFamily:T.body, fontWeight:700, fontSize:14, letterSpacing:1,
            padding:'13px', borderRadius:10, cursor:'pointer',
          }}>ACESSAR</button>
        </form>
        <p style={{ marginTop:16, color:T.mute, fontSize:12, fontFamily:T.body }}>
          PIN padrão: <code style={{ color:T.dim }}>sanka2025</code>
        </p>
      </div>
    </div>
  );
}

/* ── Tab: Membros ─────────────────────────────────────────────── */
function MembersTab() {
  const [members,   setMembers]   = useState(getAllMembers);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [adjustPts, setAdjustPts] = useState('');
  const [adjustNote,setAdjustNote]= useState('');
  const [adjErr,    setAdjErr]    = useState('');
  const [adjOk,     setAdjOk]     = useState('');

  function refresh() { setMembers(getAllMembers()); }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [...members].reverse();
    return [...members].reverse().filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.phone.includes(q.replace(/\D/g,''))
    );
  }, [members, search]);

  const detail = selected ? getMemberById(selected) : null;
  const txns   = selected ? getMemberTransactions(selected, 20) : [];
  const reds   = selected ? getMemberRedemptions(selected) : [];

  function applyAdjust(e) {
    e.preventDefault();
    setAdjErr(''); setAdjOk('');
    const delta = parseInt(adjustPts, 10);
    if (isNaN(delta) || delta === 0) { setAdjErr('Informe um valor válido (ex: 50 ou -20).'); return; }
    const result = adminAdjustPoints(selected, delta, adjustNote || undefined);
    if (result.error === 'insufficient_points') { setAdjErr('Saldo insuficiente para remover essa quantidade.'); return; }
    if (result.error) { setAdjErr('Erro ao ajustar. Tente novamente.'); return; }
    setAdjOk(`✓ ${delta > 0 ? '+' : ''}${delta} pontos aplicados.`);
    setAdjustPts(''); setAdjustNote('');
    refresh();
    setSelected(selected); // re-trigger detail refresh
  }

  const monthNow = new Date().getMonth() + 1;
  const birthdays = members.filter(m => {
    if (!m.birthDate) return false;
    const month = parseInt((m.birthDate.split('/')?.[1] || '0'), 10);
    return month === monthNow;
  });

  if (detail) {
    const { tier, next, pct, remaining } = getTierProgress(detail.totalPointsEarned);
    return (
      <div>
        <button onClick={() => { setSelected(null); setAdjErr(''); setAdjOk(''); }} style={{
          background:'none', border:`1px solid ${T.border}`, color:T.dim,
          fontFamily:T.body, fontSize:13, padding:'8px 14px', borderRadius:8, cursor:'pointer', marginBottom:20,
        }}>← Voltar à lista</button>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
          <div style={cardStyle}>
            <div style={{ fontFamily:T.body, fontWeight:700, fontSize:16, color:T.ink, marginBottom:4 }}>{detail.name}</div>
            <a href={`https://wa.me/${detail.phone}`} target="_blank" rel="noopener noreferrer"
              style={{ color:T.fire, fontFamily:T.body, fontSize:13, textDecoration:'none' }}>
              {fmtPhone(detail.phone)}
            </a>
            {detail.email && <div style={{ color:T.dim, fontSize:12, marginTop:2, fontFamily:T.body }}>{detail.email}</div>}
            {detail.birthDate && <div style={{ color:T.mute, fontSize:12, marginTop:4, fontFamily:T.body }}>🎂 {detail.birthDate}</div>}
          </div>
          <div style={{ ...cardStyle, textAlign:'center' }}>
            <div style={{ fontFamily:T.mono, fontSize:36, fontWeight:700, color:T.fire }}>{detail.pointsBalance}</div>
            <div style={{ color:T.dim, fontSize:12, fontFamily:T.body }}>saldo atual</div>
          </div>
          <div style={{ ...cardStyle, textAlign:'center' }}>
            <span style={{
              display:'inline-block', padding:'5px 12px', borderRadius:99,
              background:`${tier.color}22`, border:`1px solid ${tier.color}55`,
              color:tier.color, fontFamily:T.body, fontWeight:700, fontSize:13,
            }}>
              {tier.emoji} {tier.label}
            </span>
            {next && <div style={{ fontSize:11, color:T.mute, fontFamily:T.body, marginTop:6 }}>
              {remaining} pts para {next.label}
            </div>}
          </div>
        </div>

        {/* Ajuste de pontos */}
        <div style={{ ...cardStyle, marginBottom:20 }}>
          <h3 style={{ fontFamily:T.body, fontWeight:700, fontSize:14, color:T.ink, marginBottom:14 }}>Ajustar pontos</h3>
          <form onSubmit={applyAdjust} style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', gap:10 }}>
              <input style={{ ...inp, maxWidth:120 }} type="number" placeholder="+50 ou -20"
                value={adjustPts} onChange={e => { setAdjustPts(e.target.value); setAdjErr(''); setAdjOk(''); }} />
              <input style={inp} type="text" placeholder="Motivo (opcional)"
                value={adjustNote} onChange={e => setAdjustNote(e.target.value)} />
            </div>
            {adjErr && <p style={{ color:'#F87171', fontSize:12, fontFamily:T.body }}>{adjErr}</p>}
            {adjOk  && <p style={{ color:'#4ADE80', fontSize:12, fontFamily:T.body }}>{adjOk}</p>}
            <button type="submit" style={{
              background:T.fire, color:'#fff', border:'none',
              fontFamily:T.body, fontWeight:700, fontSize:13,
              padding:'10px 20px', borderRadius:8, cursor:'pointer', alignSelf:'flex-start',
            }}>Aplicar ajuste</button>
          </form>
        </div>

        {/* Histórico de transações */}
        <div style={{ ...cardStyle, marginBottom:20 }}>
          <h3 style={{ fontFamily:T.body, fontWeight:700, fontSize:14, color:T.ink, marginBottom:12 }}>Últimas movimentações</h3>
          {txns.length === 0
            ? <p style={{ color:T.mute, fontSize:13, fontFamily:T.body }}>Nenhuma movimentação.</p>
            : txns.map(t => (
              <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontFamily:T.body, fontSize:13, color:T.ink }}>{t.description}</div>
                  <div style={{ fontSize:11, color:T.mute }}>{fmtDate(t.createdAt)}</div>
                </div>
                <div style={{ fontFamily:T.mono, fontWeight:700, color: t.points > 0 ? '#4ADE80' : '#F87171' }}>
                  {t.points > 0 ? '+' : ''}{t.points}
                </div>
              </div>
            ))
          }
        </div>

        {/* Resgates */}
        {reds.length > 0 && (
          <div style={cardStyle}>
            <h3 style={{ fontFamily:T.body, fontWeight:700, fontSize:14, color:T.ink, marginBottom:12 }}>Resgates</h3>
            {reds.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontFamily:T.body, fontSize:13, color:T.ink }}>{r.rewardEmoji} {r.rewardTitle}</div>
                  <div style={{ fontFamily:T.mono, fontSize:12, color:T.dim }}>{r.code}</div>
                  <div style={{ fontSize:11, color:T.mute }}>{fmtDate(r.createdAt)}</div>
                </div>
                <span style={{
                  fontSize:11, padding:'3px 8px', borderRadius:99,
                  background: r.status==='used' ? 'rgba(74,222,128,0.15)' : 'rgba(234,88,12,0.15)',
                  color:       r.status==='used' ? '#4ADE80'              : T.fire,
                  fontFamily:T.body, fontWeight:700,
                }}>
                  {r.status==='used' ? 'USADO' : 'PENDENTE'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
        {[
          ['Membros totais', members.length],
          ['Aniversariantes', birthdays.length],
          ['Com e-mail', members.filter(m => m.email).length],
        ].map(([label, value]) => (
          <div key={label} style={{ ...cardStyle, textAlign:'center' }}>
            <div style={{ fontFamily:T.mono, fontSize:32, fontWeight:700, color:T.fire }}>{value}</div>
            <div style={{ color:T.dim, fontSize:12, fontFamily:T.body, marginTop:4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input style={{ ...inp, maxWidth:280 }} type="search" placeholder="Buscar por nome ou WhatsApp…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={downloadCSV} style={{
          background:'none', border:`1px solid ${T.border}`, color:T.dim,
          fontFamily:T.body, fontSize:13, padding:'10px 16px', borderRadius:8, cursor:'pointer',
        }}>↓ Exportar CSV</button>
      </div>

      {birthdays.length > 0 && (
        <div style={{ ...cardStyle, marginBottom:16, borderColor:'rgba(234,88,12,0.3)' }}>
          <div style={{ fontFamily:T.body, fontWeight:700, fontSize:13, color:T.fire, marginBottom:8 }}>🎂 Aniversariantes este mês</div>
          {birthdays.map(m => (
            <div key={m.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'6px 0', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ color:T.ink, fontFamily:T.body, fontSize:13 }}>{m.name}</span>
              <a href={`https://wa.me/${m.phone}`} target="_blank" rel="noopener noreferrer"
                style={{ color:T.fire, fontSize:12, fontFamily:T.body }}>{fmtPhone(m.phone)}</a>
              <span style={{ color:T.mute, fontSize:12 }}>{m.birthDate}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ ...cardStyle, padding:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {['Nome','WhatsApp','Saldo','Tier','Cadastro'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontFamily:T.body, fontSize:12, color:T.mute, fontWeight:600, letterSpacing:0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:'24px', textAlign:'center', color:T.mute, fontFamily:T.body, fontSize:13 }}>
                {search ? 'Nenhum membro encontrado.' : 'Nenhum membro cadastrado ainda.'}
              </td></tr>
            ) : filtered.map(m => {
              const tier = tierInfo(m.tier);
              return (
                <tr key={m.id} onClick={() => setSelected(m.id)}
                  style={{ borderBottom:`1px solid ${T.border}`, cursor:'pointer', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#161412'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 16px', fontFamily:T.body, fontSize:14, color:T.ink }}>{m.name}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <a href={`https://wa.me/${m.phone}`} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ color:T.fire, fontFamily:T.body, fontSize:13, textDecoration:'none' }}>
                      {fmtPhone(m.phone)}
                    </a>
                  </td>
                  <td style={{ padding:'12px 16px', fontFamily:T.mono, fontSize:14, color:T.ink }}>{fmtPts(m.pointsBalance)}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ color:tier.color, fontFamily:T.body, fontSize:12, fontWeight:700 }}>
                      {tier.emoji} {tier.label}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px', fontFamily:T.mono, fontSize:12, color:T.mute }}>
                    {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <p style={{ color:T.mute, fontSize:12, fontFamily:T.body, marginTop:10, textAlign:'right' }}>
          {filtered.length} membro{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

/* ── Tab: Resgates pendentes ──────────────────────────────────── */
function RedemptionsTab() {
  const [redemptions, setRedemptions] = useState(getAllRedemptions);
  const [filter,      setFilter]      = useState('pending');

  function refresh() { setRedemptions(getAllRedemptions()); }

  function markUsed(id) {
    const r = markRedemptionUsed(id);
    if (!r.error) refresh();
  }

  const filtered = redemptions.filter(r => filter === 'all' || r.status === filter);

  const pendingCount = redemptions.filter(r => r.status === 'pending').length;

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[['pending','Pendentes'],['used','Usados'],['all','Todos']].map(([k,label]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding:'8px 16px', borderRadius:8, border:`1px solid ${filter===k ? T.fire : T.border}`,
            background: filter===k ? `${T.fire}22` : 'transparent',
            color: filter===k ? T.fire : T.dim,
            fontFamily:T.body, fontSize:13, fontWeight:700, cursor:'pointer',
          }}>
            {label}
            {k === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft:6, background:T.fire, color:'#fff', borderRadius:99, fontSize:11, padding:'1px 6px' }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0
        ? <p style={{ color:T.mute, fontSize:14, fontFamily:T.body, padding:'24px 0' }}>Nenhum resgate {filter === 'pending' ? 'pendente' : filter === 'used' ? 'usado' : ''}.</p>
        : filtered.map(r => {
          const member = getMemberById(r.memberId);
          return (
            <div key={r.id} style={{ ...cardStyle, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:22 }}>{r.rewardEmoji}</span>
                  <div>
                    <div style={{ fontFamily:T.body, fontWeight:700, fontSize:14, color:T.ink }}>{r.rewardTitle}</div>
                    {member && (
                      <div style={{ fontSize:12, color:T.dim, fontFamily:T.body }}>
                        {member.name} · <a href={`https://wa.me/${member.phone}`} target="_blank" rel="noopener noreferrer" style={{ color:T.fire }}>{fmtPhone(member.phone)}</a>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontFamily:T.mono, fontSize:14, color:T.dim, letterSpacing:1 }}>{r.code}</div>
                <div style={{ fontSize:11, color:T.mute, marginTop:4, fontFamily:T.body }}>{fmtDate(r.createdAt)} · {r.pointsCost} pts</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{
                  padding:'4px 10px', borderRadius:99, fontSize:11, fontFamily:T.body, fontWeight:700,
                  background: r.status==='used' ? 'rgba(74,222,128,0.15)' : 'rgba(234,88,12,0.15)',
                  color:       r.status==='used' ? '#4ADE80'              : T.fire,
                }}>
                  {r.status === 'used' ? `USADO ${r.usedAt ? fmtDate(r.usedAt) : ''}` : 'PENDENTE'}
                </span>
                {r.status === 'pending' && (
                  <button onClick={() => markUsed(r.id)} style={{
                    background:T.fire, color:'#fff', border:'none',
                    fontFamily:T.body, fontWeight:700, fontSize:12,
                    padding:'8px 14px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap',
                  }}>Marcar como usado</button>
                )}
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

/* ── Tab: Catálogo de recompensas ─────────────────────────────── */
function RewardsConfigTab() {
  const [rewards, setRewards] = useState(getRewards);
  const [saved,   setSaved]   = useState(false);

  function toggle(id) {
    const updated = rewards.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setRewards(updated);
    saveRewards(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function editPoints(id, val) {
    const pts = parseInt(val, 10);
    if (isNaN(pts) || pts < 1) return;
    const updated = rewards.map(r => r.id === id ? { ...r, points: pts } : r);
    setRewards(updated);
    saveRewards(updated);
  }

  function reset() {
    setRewards(REWARDS_CATALOG);
    saveRewards(REWARDS_CATALOG);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <p style={{ color:T.dim, fontSize:13, fontFamily:T.body }}>Configure custo e disponibilidade das recompensas.</p>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {saved && <span style={{ color:'#4ADE80', fontSize:13, fontFamily:T.body }}>✓ Salvo</span>}
          <button onClick={reset} style={{
            background:'none', border:`1px solid ${T.border}`, color:T.mute,
            fontFamily:T.body, fontSize:12, padding:'8px 14px', borderRadius:8, cursor:'pointer',
          }}>Restaurar padrão</button>
        </div>
      </div>

      {rewards.map(r => (
        <div key={r.id} style={{ ...cardStyle, marginBottom:10, display:'flex', alignItems:'center', gap:16, opacity: r.active !== false ? 1 : 0.5 }}>
          <span style={{ fontSize:32, flexShrink:0 }}>{r.emoji}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:T.body, fontWeight:700, fontSize:14, color:T.ink }}>{r.title}</div>
            <div style={{ fontSize:12, color:T.mute, fontFamily:T.body }}>{r.desc}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input
              type="number" min="1" value={r.points}
              onChange={e => editPoints(r.id, e.target.value)}
              style={{ ...inp, width:80, textAlign:'center', fontFamily:T.mono }}
            />
            <span style={{ color:T.mute, fontSize:12, fontFamily:T.body, whiteSpace:'nowrap' }}>pts</span>
            <button onClick={() => toggle(r.id)} style={{
              padding:'8px 14px', borderRadius:8, border:`1px solid ${T.border}`,
              background: r.active !== false ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              color:       r.active !== false ? '#4ADE80'             : '#F87171',
              fontFamily:T.body, fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
            }}>
              {r.active !== false ? 'Ativo' : 'Inativo'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Roleta Sanka ────────────────────────────────────────── */
function RouletteAdminTab() {
  const [cfg,     setCfg]     = useState(getRouletteConfig);
  const [subTab,  setSubTab]  = useState('config');
  const [saved,   setSaved]   = useState('');
  const [spins,   setSpins]   = useState(() => { syncExpiredSpins(); return getAllSpinHistory(); });
  const [denied,  setDenied]  = useState(getDeniedLog);
  const [filter,  setFilter]  = useState('all');
  const stats = getRouletteStats();

  function save(patch) {
    const next = { ...cfg, ...patch };
    setCfg(next);
    saveRouletteConfig(next);
    setSaved('✓ Salvo'); setTimeout(() => setSaved(''), 2000);
  }

  function savePrizes(prizes) {
    const { valid, sum } = validateChances(prizes);
    if (!valid) { setSaved(`⚠️ Chances somam ${sum.toFixed(1)}% (deve ser 100%)`); return; }
    save({ prizes });
  }

  function setPrizeField(id, field, value) {
    const updated = cfg.prizes.map(p => p.id === id ? { ...p, [field]: value } : p);
    setCfg(c => ({ ...c, prizes: updated }));
    // salva só ao confirmar para não fazer flood
  }

  function confirmPrizes() {
    savePrizes(cfg.prizes);
  }

  function doMarkUsed(spinId) {
    markSpinRedeemed(spinId);
    setSpins(getAllSpinHistory());
  }

  function doCancel(spinId) {
    cancelSpin(spinId);
    setSpins(getAllSpinHistory());
  }

  function doReset() {
    if (!confirm('Restaurar config padrão da roleta? Histórico de giros não será apagado.')) return;
    resetRouletteConfig();
    setCfg(getRouletteConfig());
    setSaved('✓ Config restaurada');
  }

  function downloadSpinsCSV() {
    syncExpiredSpins();
    const csv  = exportSpinsCSV();
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `roleta-sanka-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const modeColor = { preview:'#F59E0B', active:'#22C55E', disabled:'#6B7280' };
  const modeLabel = { preview:'Em preview', active:'Ativa', disabled:'Desativada' };

  const filteredSpins = filter === 'all'
    ? spins
    : spins.filter(s => s.status === filter);

  const subTabs = [
    { id:'config',   label:'Configuração' },
    { id:'prizes',   label:'Prêmios' },
    { id:'history',  label:`Histórico (${spins.length})` },
    { id:'pending',  label:`Pendentes (${stats.pending})` },
    { id:'antifraud',label:`Antifraude (${denied.length})` },
  ];

  return (
    <div>
      {/* Status strip */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <span style={{
          padding:'6px 14px', borderRadius:99, fontFamily:T.body, fontWeight:700, fontSize:13,
          background:`${modeColor[cfg.rouletteMode]}22`,
          border:`1px solid ${modeColor[cfg.rouletteMode]}55`,
          color:modeColor[cfg.rouletteMode],
        }}>
          ● {modeLabel[cfg.rouletteMode] || cfg.rouletteMode}
        </span>
        <div style={{ display:'flex', gap:8 }}>
          {['preview','active','disabled'].map(m => (
            <button key={m} onClick={() => save({ rouletteMode:m, rouletteEnabled: m==='active' })}
              style={{
                padding:'7px 14px', borderRadius:8, fontFamily:T.body, fontWeight:700, fontSize:12, cursor:'pointer',
                background: cfg.rouletteMode===m ? `${modeColor[m]}22` : 'transparent',
                border:`1px solid ${cfg.rouletteMode===m ? modeColor[m] : T.border}`,
                color: cfg.rouletteMode===m ? modeColor[m] : T.mute,
              }}>
              {m === 'preview' ? 'Preview' : m === 'active' ? '🟢 Ativar' : '⛔ Desativar'}
            </button>
          ))}
        </div>
        {saved && <span style={{ color: saved.startsWith('⚠️') ? '#FBBF24' : '#4ADE80', fontSize:13, fontFamily:T.body }}>{saved}</span>}
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, flexWrap:'wrap' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding:'8px 14px', borderRadius:8, border:`1px solid ${subTab===t.id ? T.fire : T.border}`,
            background: subTab===t.id ? `${T.fire}22` : 'transparent',
            color: subTab===t.id ? T.fire : T.dim,
            fontFamily:T.body, fontWeight:700, fontSize:12, cursor:'pointer',
          }}>{t.label}</button>
        ))}
        <button onClick={doReset} style={{
          marginLeft:'auto', padding:'8px 14px', borderRadius:8, border:`1px solid ${T.border}`,
          background:'transparent', color:T.mute, fontFamily:T.body, fontSize:12, cursor:'pointer',
        }}>Restaurar padrão</button>
      </div>

      {/* ── Config ── */}
      {subTab === 'config' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
          {[
            ['Cooldown (horas)', 'cooldownHours', 'number'],
            ['Giros por dia',    'maxSpinsPerUserPerDay',  'number'],
            ['Giros por semana', 'maxSpinsPerUserPerWeek', 'number'],
            ['Validade do prêmio (dias)', 'prizeValidityDays', 'number'],
          ].map(([label, field, type]) => (
            <div key={field} style={cardStyle}>
              <label style={{ display:'block', color:T.dim, fontSize:12, fontFamily:T.body, marginBottom:6 }}>{label}</label>
              <input
                type={type} min="0" value={cfg[field]}
                onChange={e => save({ [field]: Number(e.target.value) })}
                style={{ ...inp, fontFamily:T.mono, fontSize:18, width:100 }}
              />
            </div>
          ))}
          <div style={cardStyle}>
            <div style={{ color:T.dim, fontSize:12, fontFamily:T.body, marginBottom:8 }}>Opções</div>
            <label style={{ display:'flex', gap:8, alignItems:'center', cursor:'pointer', fontFamily:T.body, fontSize:13, color:T.ink }}>
              <input type="checkbox" checked={!!cfg.requiresClubSignup}
                onChange={e => save({ requiresClubSignup: e.target.checked })}
                style={{ accentColor:T.fire }} />
              Exige cadastro no Clube
            </label>
          </div>
          <div style={cardStyle}>
            <div style={{ color:T.dim, fontSize:12, fontFamily:T.body, marginBottom:8 }}>Estatísticas</div>
            {[['Total giros', stats.totalSpins],['Pendentes', stats.pending],['Resgatados', stats.redeemed],['Expirados', stats.expired],['Sem prêmio', stats.noprize]].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${T.border}` }}>
                <span style={{ color:T.mute, fontSize:12, fontFamily:T.body }}>{l}</span>
                <span style={{ fontFamily:T.mono, fontSize:13, color:T.ink }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Prêmios ── */}
      {subTab === 'prizes' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ color:T.dim, fontSize:13, fontFamily:T.body }}>
              As chances ativas devem somar 100%.{' '}
              <strong style={{ color: validateChances(cfg.prizes).valid ? '#4ADE80' : '#F87171' }}>
                Atual: {validateChances(cfg.prizes).sum.toFixed(1)}%
              </strong>
            </p>
            <button onClick={confirmPrizes} style={{
              background:T.fire, color:'#fff', border:'none',
              fontFamily:T.body, fontWeight:700, fontSize:13,
              padding:'9px 18px', borderRadius:8, cursor:'pointer',
            }}>Salvar prêmios</button>
          </div>
          {cfg.prizes.map(p => (
            <div key={p.id} style={{ ...cardStyle, marginBottom:10, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', opacity: p.active !== false ? 1 : 0.5 }}>
              <span style={{ fontSize:28, flexShrink:0 }}>{p.emoji}</span>
              <div style={{ flex:1, minWidth:120 }}>
                <input
                  value={p.label} onChange={e => setPrizeField(p.id,'label',e.target.value)}
                  style={{ ...inp, padding:'6px 10px', fontSize:13, marginBottom:4 }}
                />
                <div style={{ fontSize:11, color:T.mute, fontFamily:T.body }}>{p.type} · {p.id}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <input type="number" min="0" max="100" step="0.5" value={p.chance}
                  onChange={e => setPrizeField(p.id,'chance',parseFloat(e.target.value)||0)}
                  style={{ ...inp, width:70, textAlign:'center', fontFamily:T.mono }}
                />
                <span style={{ color:T.mute, fontSize:12, fontFamily:T.body }}>%</span>
              </div>
              {p.type === 'points' && (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <input type="number" min="1" value={p.value||0}
                    onChange={e => setPrizeField(p.id,'value',parseInt(e.target.value,10)||0)}
                    style={{ ...inp, width:70, textAlign:'center', fontFamily:T.mono }}
                  />
                  <span style={{ color:T.mute, fontSize:12, fontFamily:T.body }}>pts</span>
                </div>
              )}
              <button onClick={() => { setPrizeField(p.id,'active',!(p.active!==false)); }} style={{
                padding:'7px 12px', borderRadius:8, cursor:'pointer', fontFamily:T.body, fontWeight:700, fontSize:12,
                background: p.active !== false ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                border:`1px solid ${p.active !== false ? '#4ADE80' : '#F87171'}`,
                color:       p.active !== false ? '#4ADE80'            : '#F87171',
              }}>
                {p.active !== false ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          ))}
          <button onClick={confirmPrizes} style={{
            marginTop:8, background:T.fire, color:'#fff', border:'none',
            fontFamily:T.body, fontWeight:700, fontSize:13,
            padding:'11px 24px', borderRadius:8, cursor:'pointer',
          }}>Salvar prêmios</button>
        </div>
      )}

      {/* ── Histórico ── */}
      {subTab === 'history' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            {['all','pending','redeemed','expired','no_prize','cancelled'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding:'7px 13px', borderRadius:8, fontFamily:T.body, fontWeight:700, fontSize:12, cursor:'pointer',
                background: filter===f ? `${T.fire}22` : 'transparent',
                border:`1px solid ${filter===f ? T.fire : T.border}`,
                color: filter===f ? T.fire : T.dim,
              }}>{f === 'all' ? 'Todos' : f === 'no_prize' ? 'Sem prêmio' : f}</button>
            ))}
            <button onClick={downloadSpinsCSV} style={{
              marginLeft:'auto', padding:'7px 14px', borderRadius:8, border:`1px solid ${T.border}`,
              background:'transparent', color:T.dim, fontFamily:T.body, fontSize:12, cursor:'pointer',
            }}>↓ CSV</button>
          </div>
          {filteredSpins.length === 0
            ? <p style={{ color:T.mute, fontSize:13, fontFamily:T.body, padding:'20px 0' }}>Nenhum registro.</p>
            : filteredSpins.slice(0,100).map(s => {
              const member = getMemberById(s.customerId);
              const statusColor = { pending:'#F97316', redeemed:'#4ADE80', expired:'#6B7280', no_prize:'#4E453C', cancelled:'#F87171' };
              return (
                <div key={s.id} style={{ ...cardStyle, marginBottom:8, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <span style={{ fontSize:24, flexShrink:0 }}>{s.prizeEmoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:T.body, fontWeight:700, fontSize:13, color:T.ink }}>{s.prizeName}</div>
                    <div style={{ fontSize:12, color:T.dim, fontFamily:T.body }}>
                      {s.memberName} · {fmtPhone(s.phone)}
                    </div>
                    {s.code && <div style={{ fontFamily:T.mono, fontSize:12, color:T.mute, letterSpacing:1 }}>{s.code}</div>}
                    <div style={{ fontSize:11, color:T.mute, fontFamily:T.body, marginTop:2 }}>{fmtDate(s.createdAt)}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                    <span style={{
                      padding:'3px 10px', borderRadius:99, fontSize:11, fontFamily:T.body, fontWeight:700,
                      background:`${statusColor[s.status] || '#6B7280'}22`,
                      border:`1px solid ${statusColor[s.status] || '#6B7280'}55`,
                      color: statusColor[s.status] || '#6B7280',
                    }}>{s.status}</span>
                    {s.status === 'pending' && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { doMarkUsed(s.id); }} style={{
                          background:'rgba(74,222,128,0.12)', border:'1px solid #4ADE80', color:'#4ADE80',
                          fontFamily:T.body, fontWeight:700, fontSize:11, padding:'5px 10px', borderRadius:6, cursor:'pointer',
                        }}>Usado</button>
                        <button onClick={() => { doCancel(s.id); }} style={{
                          background:'rgba(248,113,113,0.12)', border:'1px solid #F87171', color:'#F87171',
                          fontFamily:T.body, fontWeight:700, fontSize:11, padding:'5px 10px', borderRadius:6, cursor:'pointer',
                        }}>Cancelar</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          }
          {filteredSpins.length > 100 && (
            <p style={{ color:T.mute, fontSize:12, fontFamily:T.body, textAlign:'center', paddingTop:8 }}>
              Mostrando 100 de {filteredSpins.length} registros. Exporte CSV para ver todos.
            </p>
          )}
        </div>
      )}

      {/* ── Pendentes ── */}
      {subTab === 'pending' && (
        <div>
          <p style={{ color:T.dim, fontSize:13, fontFamily:T.body, marginBottom:14 }}>
            Prêmios aguardando resgate. Marque como "Usado" ao confirmar o uso no pedido.
          </p>
          {getPendingSpins().length === 0
            ? <p style={{ color:T.mute, fontSize:13, fontFamily:T.body }}>Nenhum prêmio pendente.</p>
            : getPendingSpins().map(s => (
              <div key={s.id} style={{ ...cardStyle, marginBottom:10, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:28 }}>{s.prizeEmoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.body, fontWeight:700, fontSize:14, color:T.ink }}>{s.prizeName}</div>
                  <div style={{ fontSize:12, color:T.dim, fontFamily:T.body }}>
                    {s.memberName} ·{' '}
                    <a href={`https://wa.me/${s.phone}`} target="_blank" rel="noopener noreferrer" style={{ color:T.fire }}>{fmtPhone(s.phone)}</a>
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:13, color:T.dim, letterSpacing:1 }}>{s.code}</div>
                  <div style={{ fontSize:11, color:T.mute, fontFamily:T.body }}>
                    {fmtDate(s.createdAt)}
                    {s.expiresAt && ` · Expira ${fmtDate(s.expiresAt)}`}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { doMarkUsed(s.id); setSpins(getAllSpinHistory()); }} style={{
                    background:T.fire, color:'#fff', border:'none',
                    fontFamily:T.body, fontWeight:700, fontSize:12,
                    padding:'9px 16px', borderRadius:8, cursor:'pointer',
                  }}>Marcar como usado</button>
                  <button onClick={() => { doCancel(s.id); setSpins(getAllSpinHistory()); }} style={{
                    background:'none', border:`1px solid #F87171`, color:'#F87171',
                    fontFamily:T.body, fontWeight:700, fontSize:12,
                    padding:'9px 14px', borderRadius:8, cursor:'pointer',
                  }}>Cancelar</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Antifraude ── */}
      {subTab === 'antifraud' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ color:T.dim, fontSize:13, fontFamily:T.body }}>
              Tentativas de giro bloqueadas pelo sistema.
            </p>
            <button onClick={() => { clearDeniedLog(); setDenied([]); }} style={{
              background:'none', border:`1px solid ${T.border}`, color:T.mute,
              fontFamily:T.body, fontSize:12, padding:'8px 14px', borderRadius:8, cursor:'pointer',
            }}>Limpar log</button>
          </div>
          {denied.length === 0
            ? <p style={{ color:T.mute, fontSize:13, fontFamily:T.body }}>Nenhuma tentativa bloqueada.</p>
            : denied.slice(0,100).map((d,i) => (
              <div key={i} style={{ ...cardStyle, marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontFamily:T.body, fontSize:13, color:T.ink }}>{fmtPhone(d.phone)}</div>
                  <div style={{ fontSize:11, color:T.mute, fontFamily:T.body }}>{fmtDate(d.timestamp)}</div>
                </div>
                <span style={{
                  padding:'3px 10px', borderRadius:99, fontSize:11, fontFamily:T.body, fontWeight:700,
                  background:'rgba(248,113,113,0.12)', border:'1px solid #F87171', color:'#F87171',
                }}>
                  {d.reason}
                </span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────────── */
function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [tab,    setTab]    = useState('members');

  const tabs = [
    { id:'members',  label:'Membros',     icon:'👥' },
    { id:'resgates', label:'Resgates',    icon:'🎁' },
    { id:'rewards',  label:'Recompensas', icon:'⚙️' },
    { id:'roleta',   label:'Roleta',      icon:'🎰' },
  ];

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const pendingReds = getAllRedemptions().filter(r => r.status === 'pending').length;

  return (
    <div style={{ minHeight:'100vh', background:T.bg }}>
      {/* Header */}
      <header style={{
        borderBottom:`1px solid ${T.border}`, padding:'14px 24px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, background:'rgba(10,10,10,0.92)',
        backdropFilter:'blur(12px)', zIndex:50,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href="index.html" style={{ fontFamily:T.display, fontSize:20, color:T.ink, textDecoration:'none', letterSpacing:2 }}>
            SANKA<span style={{ color:T.fire }}>.</span>
          </a>
          <span style={{ color:T.mute, fontSize:13, fontFamily:T.body }}>/ Admin Clube</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <a href="clube.html" style={{ color:T.mute, fontFamily:T.body, fontSize:13, textDecoration:'none', padding:'6px 12px' }}>Ver clube</a>
          <button onClick={() => setAuthed(false)} style={{
            background:'none', border:`1px solid ${T.border}`, color:T.mute,
            fontFamily:T.body, fontSize:12, padding:'6px 12px', borderRadius:8, cursor:'pointer',
          }}>Sair</button>
        </div>
      </header>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'28px 20px' }}>
        {/* Tab nav */}
        <div style={{ display:'flex', gap:4, marginBottom:28, background:'#111110', borderRadius:12, padding:4, width:'fit-content' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'10px 20px', borderRadius:8, border:'none', cursor:'pointer',
              background: tab === t.id ? T.fire : 'transparent',
              color: tab === t.id ? '#fff' : T.dim,
              fontFamily:T.body, fontWeight:700, fontSize:13, transition:'all 0.2s',
              display:'flex', alignItems:'center', gap:6,
            }}>
              {t.icon} {t.label}
              {t.id === 'resgates' && pendingReds > 0 && (
                <span style={{ background: tab==='resgates' ? 'rgba(255,255,255,0.25)' : T.fire, color:'#fff', borderRadius:99, fontSize:11, padding:'1px 6px' }}>{pendingReds}</span>
              )}
              {t.id === 'roleta' && (() => { const n = getPendingSpins().length; return n > 0 ? <span style={{ background: tab==='roleta' ? 'rgba(255,255,255,0.25)' : T.fire, color:'#fff', borderRadius:99, fontSize:11, padding:'1px 6px' }}>{n}</span> : null; })()}
            </button>
          ))}
        </div>

        {tab === 'members'  && <MembersTab />}
        {tab === 'resgates' && <RedemptionsTab />}
        {tab === 'rewards'  && <RewardsConfigTab />}
        {tab === 'roleta'   && <RouletteAdminTab />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AdminApp />);
