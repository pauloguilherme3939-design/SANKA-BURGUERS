// clube-app.jsx — Clube Sanka: sistema de fidelidade por pontos + Roleta
// v4: roulette-service integrado, modo preview/active/disabled
// BACKEND: localStorage (MVP — Supabase-ready, ver lib/clube/service.js)

import {
  createMember, getMemberByPhone, getMemberById,
  getMemberTransactions, getMemberRedemptions,
  getRewards, redeemReward,
  getTierForPoints, getTierProgress,
} from './lib/clube/service.js';
import {
  getRouletteConfig, getSpinState, executeSpin,
  getSpinHistory, markSpinRedeemed, syncExpiredSpins,
} from './lib/clube/roulette-service.js';
import { TIERS } from './lib/clube/config.js';
import { SANKA_CONFIG } from './lib/config.js';

const { useState, useEffect, useRef, useCallback } = React;
const WA = SANKA_CONFIG.whatsapp;

const LS_SESSION = 'sanka_club_session'; // memberId persistido

/* ── Utils ───────────────────────────────────────────────────── */
function ls(key, fb) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fb; }
  catch { return fb; }
}
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function maskPhone(v) {
  const d = v.replace(/\D/g,'').slice(0,11);
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function maskBirth(v) {
  const d = v.replace(/\D/g,'').slice(0,4);
  return d.length <= 2 ? d : `${d.slice(0,2)}/${d.slice(2)}`;
}
function fmtPts(n) { return `${n} pt${n !== 1 ? 's' : ''}`; }
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' });
}

/* ── Design tokens (inline styles via objects) ───────────────── */
const T = {
  bg:      '#0A0A0A',
  surface: '#111110',
  border:  'rgba(245,239,230,0.08)',
  fire:    '#EA580C',
  ink:     '#F5EFE6',
  dim:     '#8A7D6E',
  mute:    '#4E453C',
  mono:    "'JetBrains Mono', monospace",
  body:    "'Space Grotesk', sans-serif",
  display: "'Anton', sans-serif",
};

const inp = (err) => ({
  width:'100%', boxSizing:'border-box',
  background: T.surface,
  border: `1.5px solid ${err ? '#DC2626' : T.border}`,
  borderRadius:10, padding:'13px 16px', color: T.ink,
  fontFamily: T.body, fontSize:15, outline:'none',
});
const lbl = { display:'block', color: T.dim, fontFamily: T.body, fontSize:13, marginBottom:6 };
const errTxt = { color:'#DC2626', fontSize:12, marginTop:4, fontFamily: T.body };
const cardStyle = {
  background: T.surface, border:`1px solid ${T.border}`,
  borderRadius:14, padding:'18px 20px', width:'100%', boxSizing:'border-box',
};

/* ── Shared: Confetti ────────────────────────────────────────── */
function Confetti() {
  const cols = ['#EA580C','#F97316','#FBBF24','#34D399','#60A5FA','#F472B6'];
  const pieces = Array.from({ length: 70 }, (_,i) => ({
    id: i, col: cols[i % cols.length],
    l: 5 + Math.random()*90, delay: Math.random()*0.8,
    dur: 2 + Math.random()*1.5, sz: 7 + Math.random()*9,
  }));
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:200, overflow:'hidden' }} aria-hidden>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:'absolute', top:'-10px', left:`${p.l}%`,
          width:p.sz, height:p.sz, background:p.col,
          borderRadius: p.id%3===0 ? '50%' : '2px',
          animation:`cf ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
      <style>{`@keyframes cf{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

/* ── Shared: TierBadge ───────────────────────────────────────── */
function TierBadge({ tierId, size = 'sm' }) {
  const tier = TIERS.find(t => t.id === tierId) || TIERS[0];
  const fs   = size === 'lg' ? 13 : 11;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      background:`${tier.color}22`, border:`1px solid ${tier.color}55`,
      color: tier.color, borderRadius:99,
      padding: size === 'lg' ? '5px 12px' : '3px 8px',
      fontSize: fs, fontFamily: T.body, fontWeight:700, letterSpacing:0.5,
    }}>
      {tier.emoji} {tier.label}
    </span>
  );
}

/* ── View: ClubSignup ────────────────────────────────────────── */
function ClubSignup({ onDone, onLoginClick }) {
  const [step,    setStep]    = useState(0);
  const [form,    setForm]    = useState({ name:'', phone:'', email:'', birthDate:'', consent:false });
  const [errors,  setErrors]  = useState({});
  const [srvErr,  setSrvErr]  = useState('');
  const [loading, setLoading] = useState(false);

  function set(f, v) {
    setForm(p => ({ ...p, [f]:v }));
    setErrors(p => { const n={...p}; delete n[f]; return n; });
    setSrvErr('');
  }

  function validate() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Informe seu nome completo.';
    const ph = form.phone.replace(/\D/g,'');
    if (ph.length < 10 || ph.length > 11) e.phone = 'WhatsApp inválido (ex: (19) 9 1234-5678).';
    if (form.birthDate) {
      const m = form.birthDate.match(/^(\d{2})\/(\d{2})$/);
      if (!m || +m[1]<1||+m[1]>31||+m[2]<1||+m[2]>12) e.birthDate = 'Use o formato DD/MM.';
    }
    if (!form.consent) e.consent = 'Você precisa aceitar para continuar.';
    return e;
  }

  function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setSrvErr('');

    const result = createMember({
      name: form.name, phone: form.phone, email: form.email,
      birthDate: form.birthDate, consentMarketing: form.consent,
    });

    setLoading(false);
    if (result.error === 'phone_exists') {
      setSrvErr('Esse WhatsApp já está cadastrado. Use "Entrar" para acessar sua conta.');
      return;
    }
    if (result.error) { setSrvErr('Algo deu errado. Tente novamente.'); return; }
    window.SankaAnalytics?.clubSignup('signup_form');
    onDone(result.member.id);
  }

  if (step === 0) return (
    <div style={{ maxWidth:400, width:'100%', textAlign:'center' }}>
      <div style={{ fontSize:64, marginBottom:12 }}>🎰</div>
      <h1 style={{ fontFamily:T.display, fontSize:34, color:T.ink, letterSpacing:2, marginBottom:8 }}>CLUBE SANKA</h1>
      <p style={{ color:T.dim, fontSize:16, lineHeight:1.7, marginBottom:28 }}>
        Acumule pontos a cada pedido e troque por prêmios de verdade.<br />
        <span style={{ fontSize:13, color:T.mute }}>Gratuito. Sem app. Só pelo WhatsApp.</span>
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:28, textAlign:'left' }}>
        {[
          ['🎰','Roleta diária','Ganhe pontos todo dia só de abrir'],
          ['🍟','Prêmios reais','Batata, queijo, desconto, combo'],
          ['🔥','Tiers de fidelidade','Suba de nível e ganhe mais'],
          ['🎂','Bônus aniversário','Pontos extras no seu mês'],
        ].map(([ico,title,sub]) => (
          <div key={title} style={{ ...cardStyle, padding:'14px' }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{ico}</div>
            <div style={{ fontFamily:T.body, fontWeight:700, fontSize:13, color:T.ink, marginBottom:2 }}>{title}</div>
            <div style={{ fontSize:12, color:T.mute }}>{sub}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setStep(1)} style={{
        width:'100%', background:T.fire, color:'#fff', border:'none',
        fontFamily:T.body, fontSize:16, fontWeight:700, letterSpacing:1,
        padding:'15px', borderRadius:12, cursor:'pointer',
        boxShadow:'0 0 32px rgba(234,88,12,0.35)',
      }}>CRIAR CONTA → GANHAR 20 PTS</button>

      <p style={{ marginTop:16, color:T.mute, fontSize:13 }}>
        Já tem conta?{' '}
        <button onClick={onLoginClick} style={{ background:'none', border:'none', color:T.fire, cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600 }}>
          Entrar
        </button>
      </p>
    </div>
  );

  return (
    <div style={{ maxWidth:400, width:'100%' }}>
      <button onClick={() => setStep(0)} style={{ background:'none', border:'none', color:T.mute, cursor:'pointer', fontFamily:T.body, fontSize:13, marginBottom:20, padding:0 }}>
        ← Voltar
      </button>
      <h2 style={{ fontFamily:T.display, fontSize:26, color:T.ink, letterSpacing:2, marginBottom:6 }}>CRIAR CONTA</h2>
      <p style={{ color:T.dim, fontSize:13, marginBottom:24 }}>Você recebe 20 pontos de boas-vindas ao se cadastrar.</p>

      <form onSubmit={submit} noValidate style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <label style={lbl}>Nome completo</label>
          <input style={inp(errors.name)} type="text" placeholder="Seu nome" value={form.name}
            onChange={e => set('name', e.target.value)} autoComplete="name" autoFocus />
          {errors.name && <p style={errTxt}>{errors.name}</p>}
        </div>
        <div>
          <label style={lbl}>WhatsApp</label>
          <input style={inp(errors.phone)} type="tel" placeholder="(19) 9 1234-5678" value={form.phone}
            onChange={e => set('phone', maskPhone(e.target.value))} autoComplete="tel" inputMode="numeric" />
          {errors.phone && <p style={errTxt}>{errors.phone}</p>}
        </div>
        <div>
          <label style={lbl}>E-mail <span style={{ color:T.mute }}>(opcional)</span></label>
          <input style={inp(false)} type="email" placeholder="seuemail@gmail.com" value={form.email}
            onChange={e => set('email', e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label style={lbl}>Aniversário <span style={{ color:T.mute }}>(opcional — bônus no seu mês)</span></label>
          <input style={{ ...inp(errors.birthDate), maxWidth:110 }} type="text" placeholder="DD/MM"
            value={form.birthDate} onChange={e => set('birthDate', maskBirth(e.target.value))}
            inputMode="numeric" maxLength={5} />
          {errors.birthDate && <p style={errTxt}>{errors.birthDate}</p>}
        </div>
        <label style={{ display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer', color:T.dim, fontSize:13, fontFamily:T.body }}>
          <input type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)}
            style={{ marginTop:3, accentColor:T.fire, flexShrink:0 }} />
          Aceito receber promoções da Sanka Burgers via WhatsApp. Posso cancelar a qualquer momento.
        </label>
        {errors.consent && <p style={errTxt}>{errors.consent}</p>}
        {srvErr && <p style={{ ...errTxt, textAlign:'center', fontSize:14 }}>{srvErr}</p>}
        <button type="submit" disabled={loading} style={{
          background: loading ? '#1C1917' : T.fire, color: loading ? T.mute : '#fff',
          border:'none', fontFamily:T.body, fontSize:15, fontWeight:700, letterSpacing:1,
          padding:'15px', borderRadius:12, cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Cadastrando…' : '🎰 ENTRAR E GANHAR 20 PTS'}
        </button>
      </form>
    </div>
  );
}

/* ── View: ClubLogin ─────────────────────────────────────────── */
function ClubLogin({ onDone, onSignupClick }) {
  const [phone,   setPhone]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function submit(e) {
    e.preventDefault();
    const ph = phone.replace(/\D/g,'');
    if (ph.length < 10) { setError('Informe um WhatsApp válido.'); return; }
    setLoading(true);
    const member = getMemberByPhone(ph);
    setLoading(false);
    if (!member) { setError('WhatsApp não encontrado. Crie sua conta.'); return; }
    window.SankaAnalytics?.clubLogin();
    onDone(member.id);
  }

  return (
    <div style={{ maxWidth:400, width:'100%', textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>👋</div>
      <h1 style={{ fontFamily:T.display, fontSize:28, color:T.ink, letterSpacing:2, marginBottom:8 }}>BEM-VINDO DE VOLTA</h1>
      <p style={{ color:T.dim, fontSize:14, marginBottom:28 }}>Informe seu WhatsApp para acessar sua conta.</p>

      <form onSubmit={submit} noValidate style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <input style={inp(!!error)} type="tel" placeholder="(19) 9 1234-5678" value={phone}
          onChange={e => { setPhone(maskPhone(e.target.value)); setError(''); }}
          autoComplete="tel" inputMode="numeric" autoFocus />
        {error && <p style={errTxt}>{error}</p>}
        <button type="submit" disabled={loading} style={{
          background:T.fire, color:'#fff', border:'none',
          fontFamily:T.body, fontSize:15, fontWeight:700, letterSpacing:1,
          padding:'15px', borderRadius:12, cursor:'pointer',
        }}>
          {loading ? 'Buscando…' : 'ACESSAR MINHA CONTA'}
        </button>
      </form>

      <p style={{ marginTop:20, color:T.mute, fontSize:13 }}>
        Ainda não tem conta?{' '}
        <button onClick={onSignupClick} style={{ background:'none', border:'none', color:T.fire, cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600 }}>
          Criar conta grátis
        </button>
      </p>
    </div>
  );
}

/* ── Dashboard: PointsBalance ────────────────────────────────── */
function PointsBalance({ member }) {
  const { tier, next, pct, remaining } = getTierProgress(member.totalPointsEarned);

  return (
    <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:12 }}>
      {/* Balance card */}
      <div style={{ ...cardStyle, textAlign:'center', padding:'24px 20px' }}>
        <div style={{ fontSize:11, color:T.mute, letterSpacing:3, marginBottom:8, fontFamily:T.body }}>SEU SALDO</div>
        <div style={{ fontFamily:T.mono, fontSize:52, fontWeight:700, color:T.fire, lineHeight:1 }}>
          {member.pointsBalance}
        </div>
        <div style={{ color:T.dim, fontSize:13, marginTop:4, fontFamily:T.body }}>pontos</div>
        <div style={{ marginTop:14 }}>
          <TierBadge tierId={member.tier} size="lg" />
        </div>
      </div>

      {/* Tier progress */}
      {next && (
        <div style={cardStyle}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontFamily:T.body, fontSize:13, color:T.dim }}>
              Próximo nível: <strong style={{ color: next.color }}>{next.emoji} {next.label}</strong>
            </span>
            <span style={{ fontFamily:T.mono, fontSize:12, color:T.mute }}>{remaining} pts</span>
          </div>
          <div style={{ background:'#1C1917', borderRadius:999, height:6, overflow:'hidden' }}>
            <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${tier.color},${next.color})`, borderRadius:999, transition:'width 0.8s ease' }} />
          </div>
          <div style={{ marginTop:8, fontSize:12, color:T.mute, fontFamily:T.body }}>
            Benefícios ao atingir: {next.perks.slice(1).join(' · ')}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[
          ['Total ganhos', fmtPts(member.totalPointsEarned)],
          ['Total resgatados', fmtPts(member.totalPointsRedeemed)],
        ].map(([label, value]) => (
          <div key={label} style={{ ...cardStyle, textAlign:'center', padding:'14px' }}>
            <div style={{ fontFamily:T.mono, fontSize:22, fontWeight:700, color:T.ink }}>{value}</div>
            <div style={{ fontSize:12, color:T.mute, fontFamily:T.body, marginTop:4 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Dashboard: RewardsCatalog ───────────────────────────────── */
function RewardsCatalog({ member, onRefresh }) {
  const rewards  = getRewards().filter(r => r.active !== false);
  const [modal,  setModal]  = useState(null); // redemption object
  const [loading, setLoading] = useState(null);
  const [errMsg,  setErrMsg]  = useState('');

  function redeem(rewardId) {
    setErrMsg('');
    setLoading(rewardId);
    const result = redeemReward(member.id, rewardId);
    setLoading(null);
    if (result.error === 'insufficient_points') { setErrMsg('Pontos insuficientes para esta recompensa.'); return; }
    if (result.error) { setErrMsg('Algo deu errado. Tente novamente.'); return; }
    const rewardObj = getRewards().find(r => r.id === rewardId);
    window.SankaAnalytics?.rewardRedeemed(rewardId, rewardObj?.points);
    setModal(result.redemption);
    onRefresh();
  }

  return (
    <div style={{ width:'100%' }}>
      {errMsg && (
        <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'12px 16px', marginBottom:14, color:'#FCA5A5', fontSize:13, fontFamily:T.body }}>
          {errMsg}
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }}>
        {rewards.map(r => {
          const canAfford = member.pointsBalance >= r.points;
          return (
            <div key={r.id} style={{
              ...cardStyle, display:'flex', flexDirection:'column', alignItems:'center', gap:8,
              padding:'18px 12px', textAlign:'center', opacity: canAfford ? 1 : 0.5,
              transition:'opacity 0.2s, transform 0.2s',
            }}>
              <span style={{ fontSize:36 }}>{r.emoji}</span>
              <div style={{ fontFamily:T.body, fontWeight:700, fontSize:13, color:T.ink }}>{r.title}</div>
              <div style={{ fontSize:12, color:T.mute, fontFamily:T.body, lineHeight:1.4 }}>{r.desc}</div>
              <div style={{ fontFamily:T.mono, fontSize:15, fontWeight:700, color: canAfford ? T.fire : T.mute, marginTop:4 }}>
                {fmtPts(r.points)}
              </div>
              <button
                onClick={() => redeem(r.id)}
                disabled={!canAfford || loading === r.id}
                style={{
                  width:'100%', background: canAfford ? T.fire : '#1C1917',
                  color: canAfford ? '#fff' : T.mute,
                  border: canAfford ? 'none' : `1px solid ${T.border}`,
                  fontFamily:T.body, fontWeight:700, fontSize:12, letterSpacing:0.5,
                  padding:'9px', borderRadius:8, cursor: canAfford ? 'pointer' : 'not-allowed',
                  marginTop:2,
                }}
              >
                {loading === r.id ? '…' : canAfford ? 'RESGATAR' : 'PONTOS INSUF.'}
              </button>
            </div>
          );
        })}
      </div>

      {modal && <RedemptionModal redemption={modal} member={member} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ── Dashboard: RedemptionModal ──────────────────────────────── */
function RedemptionModal({ redemption, member, onClose }) {
  const [copied, setCopied] = useState(false);
  const waMsg = encodeURIComponent(
    `Olá! Quero usar meu código de resgate do Clube Sanka.\n\n` +
    `Recompensa: *${redemption.rewardTitle}*\n` +
    `Código: *${redemption.code}*\n\n` +
    `Conta: ${member.name}`
  );

  function copy() {
    navigator.clipboard?.writeText(redemption.code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <>
      <Confetti />
      <div style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:150,
        display:'flex', alignItems:'center', justifyContent:'center', padding:20,
      }} onClick={onClose}>
        <div style={{ ...cardStyle, maxWidth:360, width:'100%', textAlign:'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize:52, marginBottom:12 }}>{redemption.rewardEmoji}</div>
          <h2 style={{ fontFamily:T.display, fontSize:26, color:T.fire, letterSpacing:2, marginBottom:6 }}>
            RESGATE CONFIRMADO!
          </h2>
          <p style={{ color:T.dim, fontSize:13, marginBottom:20, fontFamily:T.body }}>
            Informe o código no WhatsApp ao fazer o pedido.
          </p>

          <div onClick={copy} style={{
            background:'#0A0A0A', border:`2px dashed ${T.fire}88`, borderRadius:12,
            padding:'16px 20px', marginBottom:16, cursor:'pointer',
          }}>
            <div style={{ fontSize:11, color:T.mute, letterSpacing:3, fontFamily:T.body, marginBottom:8 }}>SEU CÓDIGO</div>
            <div style={{ fontFamily:T.mono, fontSize:22, fontWeight:700, color:T.ink, letterSpacing:3 }}>{redemption.code}</div>
            <div style={{ fontSize:12, color: copied ? '#22C55E' : T.fire, marginTop:8, fontFamily:T.body, fontWeight:600 }}>
              {copied ? '✓ Copiado!' : '👆 Toque para copiar'}
            </div>
          </div>

          <a href={`https://wa.me/${WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
            style={{
              display:'block', width:'100%', boxSizing:'border-box',
              background:T.fire, color:'#fff', textDecoration:'none',
              fontFamily:T.body, fontWeight:700, fontSize:14, letterSpacing:1,
              padding:'14px', borderRadius:10, marginBottom:10,
            }}>
            🍔 USAR AGORA NO WHATSAPP
          </a>

          <button onClick={onClose} style={{
            background:'none', border:`1px solid ${T.border}`, color:T.mute,
            fontFamily:T.body, fontSize:13, padding:'10px', borderRadius:8,
            cursor:'pointer', width:'100%',
          }}>
            Ver mais recompensas
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Dashboard: HistoryTab ───────────────────────────────────── */
function HistoryTab({ member }) {
  const [tab, setTab] = useState('txns');
  const txns  = getMemberTransactions(member.id);
  const reds  = getMemberRedemptions(member.id);

  const typeLabel = {
    signup_bonus:  '🎁 Bônus de cadastro',
    spin_bonus:    '🎰 Roleta diária',
    roulette_spin: '🎰 Roleta Sanka',
    admin_adjust:  '🔧 Ajuste admin',
    redeem:        '🎁 Resgate',
    order_earn:    '🍔 Pedido',
  };

  return (
    <div style={{ width:'100%' }}>
      <div style={{ display:'flex', gap:0, marginBottom:16, background:'#111110', borderRadius:10, padding:4 }}>
        {[['txns','Pontos'],['reds','Resgates']].map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex:1, padding:'9px', borderRadius:8, border:'none', cursor:'pointer',
            background: tab === k ? T.fire : 'transparent',
            color: tab === k ? '#fff' : T.dim,
            fontFamily:T.body, fontWeight:700, fontSize:13, transition:'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'txns' && (
        txns.length === 0
          ? <p style={{ color:T.mute, textAlign:'center', fontSize:14, fontFamily:T.body, padding:'30px 0' }}>Nenhuma movimentação ainda.</p>
          : txns.map(t => (
            <div key={t.id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 16px', marginBottom:8,
              background:T.surface, borderRadius:10, border:`1px solid ${T.border}`,
            }}>
              <div>
                <div style={{ fontFamily:T.body, fontSize:13, color:T.ink }}>
                  {typeLabel[t.type] || t.type}
                </div>
                <div style={{ fontSize:11, color:T.mute, marginTop:2 }}>{fmtDate(t.createdAt)}</div>
              </div>
              <div style={{
                fontFamily:T.mono, fontWeight:700, fontSize:16,
                color: t.points > 0 ? '#22C55E' : '#F87171',
              }}>
                {t.points > 0 ? '+' : ''}{t.points}
              </div>
            </div>
          ))
      )}

      {tab === 'reds' && (
        reds.length === 0
          ? <p style={{ color:T.mute, textAlign:'center', fontSize:14, fontFamily:T.body, padding:'30px 0' }}>Nenhum resgate ainda.</p>
          : reds.map(r => (
            <div key={r.id} style={{
              padding:'14px 16px', marginBottom:8,
              background:T.surface, borderRadius:10, border:`1px solid ${T.border}`,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontFamily:T.body, fontWeight:700, fontSize:13, color:T.ink }}>
                  {r.rewardEmoji} {r.rewardTitle}
                </div>
                <span style={{
                  fontSize:11, fontFamily:T.body, fontWeight:700, padding:'3px 8px', borderRadius:99,
                  background: r.status === 'used' ? 'rgba(34,197,94,0.15)' : 'rgba(234,88,12,0.15)',
                  color:       r.status === 'used' ? '#22C55E'              : T.fire,
                }}>
                  {r.status === 'used' ? 'USADO' : 'PENDENTE'}
                </span>
              </div>
              <div style={{ fontFamily:T.mono, fontSize:13, color:T.dim, letterSpacing:1 }}>{r.code}</div>
              <div style={{ fontSize:11, color:T.mute, marginTop:4, fontFamily:T.body }}>
                {fmtDate(r.createdAt)} · {r.pointsCost} pontos
              </div>
            </div>
          ))
      )}
    </div>
  );
}

/* ── Roulette: SVG wheel ─────────────────────────────────────── */
const CX = 200, CY = 200, R = 188, RT = 126;

function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function sectorPath(SLICE, i) {
  const s = polar(CX,CY,R, i*SLICE);
  const e = polar(CX,CY,R, (i+1)*SLICE);
  const large = SLICE > 180 ? 1 : 0;
  return `M${CX} ${CY} L${s.x.toFixed(1)} ${s.y.toFixed(1)} A${R} ${R} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)} Z`;
}

function RouletteWheel({ prizes, rotation, spinning }) {
  const SLICE = 360 / prizes.length;
  return (
    <svg viewBox="0 0 400 400" style={{
      width:'100%', height:'100%', display:'block',
      transform:`rotate(${rotation}deg)`,
      transition: spinning ? 'transform 4.2s cubic-bezier(0.12,0.9,0.2,1)' : 'none',
      filter: spinning
        ? 'drop-shadow(0 0 48px rgba(234,88,12,0.65))'
        : 'drop-shadow(0 0 18px rgba(234,88,12,0.18))',
      willChange:'transform',
    }}>
      <circle cx={CX} cy={CY} r={R+8} fill="none" stroke="rgba(234,88,12,0.12)" strokeWidth="4" />
      <circle cx={CX} cy={CY} r={R+4} fill="none" stroke="rgba(234,88,12,0.08)" strokeWidth="2" />
      {prizes.map((p, i) => {
        const mid = i*SLICE + SLICE/2;
        const tp  = polar(CX,CY,RT,mid);
        const ep  = polar(CX,CY,108,mid);
        return (
          <g key={p.id || i}>
            <path d={sectorPath(SLICE,i)} fill={p.color || '#292524'} stroke="#0A0A0A" strokeWidth="1.5" />
            <text x={ep.x.toFixed(1)} y={ep.y.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${mid},${ep.x.toFixed(1)},${ep.y.toFixed(1)})`}
              fontSize="15" style={{ userSelect:'none' }}>{p.emoji}</text>
            <text x={tp.x.toFixed(1)} y={tp.y.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${mid},${tp.x.toFixed(1)},${tp.y.toFixed(1)})`}
              fill={p.textColor || '#fff'} fontSize="9.5" fontWeight="800"
              fontFamily="'Space Grotesk',sans-serif"
              style={{ userSelect:'none', letterSpacing:'0.6px' }}>{p.label}</text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={32} fill="#0A0A0A" stroke={T.fire} strokeWidth="3" />
      <circle cx={CX} cy={CY} r={26} fill="#111110" />
      <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
        fill={T.fire} fontSize="20" fontWeight="900" fontFamily="'Anton',sans-serif">S</text>
    </svg>
  );
}

/* ── Roulette: countdown hook ────────────────────────────────── */
function useCountdown(endISO) {
  const [str, setStr] = useState('');
  useEffect(() => {
    if (!endISO) return;
    function calc() {
      const diff = new Date(endISO) - new Date();
      if (diff <= 0) { setStr('00:00:00'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setStr(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endISO]);
  return str;
}

/* ── Roulette: prize card (result screen) ────────────────────── */
function PrizeResultCard({ spin, onClose }) {
  const [copied, setCopied] = useState(false);
  const isMiss = spin.resultType === 'no_prize';
  const isPoints = spin.resultType === 'points';
  const expiryStr = spin.expiresAt
    ? new Date(spin.expiresAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
    : null;

  const waMsg = spin.code
    ? encodeURIComponent(
        `Olá! Ganhei *${spin.prizeName}* na Roleta Sanka.\nMeu código: *${spin.code}*\n\nQuero usar no meu pedido!`
      )
    : '';

  function copy() {
    if (!spin.code) return;
    navigator.clipboard?.writeText(spin.code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div style={{ ...cardStyle, maxWidth:360, width:'100%', textAlign:'center' }}>
      <div style={{ fontSize: isMiss ? 52 : 64, lineHeight:1, marginBottom:12 }}>{spin.prizeEmoji}</div>

      <h3 style={{
        fontFamily:T.display, letterSpacing:2, marginBottom:8,
        fontSize: isMiss ? 22 : 30,
        color:    isMiss ? T.mute : T.fire,
      }}>
        {isMiss ? 'HOJE NÃO FOI' : isPoints ? `+${spin.value} PONTOS!` : spin.prizeName.toUpperCase()}
      </h3>

      {isMiss && (
        <p style={{ color:T.mute, fontSize:14, fontFamily:T.body, lineHeight:1.7, marginBottom:20 }}>
          Hoje a chapa não liberou prêmio, mas você continua acumulando pontos no Clube Sanka.
        </p>
      )}

      {isPoints && (
        <p style={{ color:T.dim, fontSize:14, fontFamily:T.body, marginBottom:20 }}>
          Pontos creditados no seu saldo do Clube Sanka.
        </p>
      )}

      {spin.code && (
        <>
          <div onClick={copy} style={{
            background:'#0A0A0A', border:`2px dashed ${T.fire}66`, borderRadius:12,
            padding:'16px 18px', marginBottom:10, cursor:'pointer',
          }}>
            <div style={{ fontSize:11, color:T.mute, letterSpacing:3, fontFamily:T.body, marginBottom:8 }}>SEU CÓDIGO</div>
            <div style={{ fontFamily:T.mono, fontSize:20, fontWeight:700, color:T.ink, letterSpacing:3 }}>{spin.code}</div>
            <div style={{ fontSize:12, color: copied ? '#22C55E' : T.fire, marginTop:8, fontFamily:T.body }}>
              {copied ? '✓ Copiado!' : '👆 Toque para copiar'}
            </div>
          </div>

          {expiryStr && (
            <p style={{ fontSize:12, color:T.mute, fontFamily:T.body, marginBottom:14 }}>
              Válido até {expiryStr} · Use no WhatsApp ao fazer o pedido.
            </p>
          )}

          <a href={`https://wa.me/${WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
            style={{
              display:'block', width:'100%', boxSizing:'border-box',
              background:T.fire, color:'#fff', textDecoration:'none',
              fontFamily:T.body, fontWeight:700, fontSize:14, letterSpacing:1,
              padding:'13px', borderRadius:10, marginBottom:10,
            }}>
            🍔 USAR PRÊMIO NO WHATSAPP
          </a>
        </>
      )}

      <button onClick={onClose} style={{
        background:'none', border:`1px solid ${T.border}`, color:T.mute,
        fontFamily:T.body, fontSize:12, padding:'10px', borderRadius:8,
        cursor:'pointer', width:'100%',
      }}>
        {isMiss ? 'Voltar' : 'Voltar ao Clube'}
      </button>

      <p style={{ marginTop:16, fontSize:11, color:T.mute, fontFamily:T.body, lineHeight:1.6 }}>
        Benefícios sujeitos à disponibilidade, validade e regras da campanha. A Sanka pode alterar ou encerrar campanhas a qualquer momento.
      </p>
    </div>
  );
}

/* ── Roulette: cooldown screen ───────────────────────────────── */
function CooldownScreen({ spinState, memberName }) {
  const countdown = useCountdown(spinState.cooldownEnd);
  const last      = spinState.lastSpin;

  const reasonMsg = {
    cooldown:     'Você já girou hoje. Próxima chance:',
    daily_limit:  'Limite diário atingido. Volte amanhã.',
    weekly_limit: 'Limite semanal atingido. Volte na semana que vem.',
  }[spinState.reason] || 'Aguardando próxima jogada.';

  return (
    <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:14, alignItems:'center' }}>
      <div style={{ ...cardStyle, textAlign:'center', width:'100%' }}>
        <div style={{ fontSize:11, color:T.mute, letterSpacing:3, fontFamily:T.body, marginBottom:6 }}>
          {reasonMsg.toUpperCase()}
        </div>
        {spinState.cooldownEnd && (
          <div style={{ fontFamily:T.mono, fontSize:40, fontWeight:700, color:T.fire, letterSpacing:3 }}>
            {countdown}
          </div>
        )}
      </div>

      {last && last.resultType !== 'no_prize' && last.code && last.status === 'pending' && (
        <div style={{ ...cardStyle, width:'100%' }}>
          <div style={{ fontSize:11, color:T.mute, letterSpacing:2, fontFamily:T.body, marginBottom:8 }}>SEU ÚLTIMO PRÊMIO</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:28 }}>{last.prizeEmoji}</span>
            <div>
              <div style={{ fontFamily:T.body, fontWeight:700, fontSize:14, color:T.ink }}>{last.prizeName}</div>
              <div style={{ fontFamily:T.mono, fontSize:13, color:T.dim, letterSpacing:1 }}>{last.code}</div>
            </div>
          </div>
          <a href={`https://wa.me/${WA}?text=${encodeURIComponent(`Olá! Quero usar meu prêmio *${last.prizeName}* da Roleta Sanka. Código: *${last.code}*`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display:'block', marginTop:12, background:`${T.fire}1a`, border:`1px solid ${T.fire}44`,
              color:T.fire, fontFamily:T.body, fontWeight:700, fontSize:12, textDecoration:'none',
              padding:'10px', borderRadius:8, textAlign:'center',
            }}>
            Usar no WhatsApp →
          </a>
        </div>
      )}
    </div>
  );
}

/* ── Roulette: RouletteTab ───────────────────────────────────── */
function RouletteTab({ member, onRefresh }) {
  const config    = getRouletteConfig();
  const prizes    = config.prizes || [];
  const mode      = config.rouletteMode || 'disabled';
  const SLICE     = 360 / Math.max(prizes.length, 1);

  const [rot,     setRot]     = useState(0);
  const [phase,   setPhase]   = useState('idle'); // idle | spinning | result
  const [result,  setResult]  = useState(null);   // { spin, prizeIndex }
  const [spinState, setSpinState] = useState(() => getSpinState(member.id));
  const [confetti,  setConfetti]  = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    syncExpiredSpins();
    setSpinState(getSpinState(member.id));
    return () => clearTimeout(timerRef.current);
  }, []);

  // Modo "disabled" → ocultar completamente
  if (mode === 'disabled') return null;

  // Modo "preview" → teaser
  if (mode === 'preview') return (
    <div style={{ ...cardStyle, textAlign:'center', maxWidth:380, width:'100%' }}>
      <div style={{ fontSize:52, marginBottom:12 }}>🎰</div>
      <h3 style={{ fontFamily:T.display, fontSize:24, color:T.ink, letterSpacing:2, marginBottom:8 }}>
        ROLETA SANKA
      </h3>
      <p style={{ color:T.dim, fontSize:14, fontFamily:T.body, lineHeight:1.7, marginBottom:16 }}>
        Em breve, membros do Clube Sanka poderão girar a Roleta e concorrer a benefícios de lançamento.
      </p>
      <div style={{ background:'#0A0A0A', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
        <div style={{ fontSize:11, color:T.mute, letterSpacing:2, fontFamily:T.body, marginBottom:4 }}>PRÊMIOS PREVISTOS</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
          {prizes.filter(p => p.type !== 'no_prize').map(p => (
            <span key={p.id} style={{ background:`${p.color}33`, border:`1px solid ${p.color}55`, color:'#F5EFE6', borderRadius:99, padding:'4px 10px', fontSize:12, fontFamily:T.body }}>
              {p.emoji} {p.label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ fontSize:11, color:T.mute, fontFamily:T.body }}>
        Você já está cadastrado no Clube. Será notificado quando a Roleta abrir.
      </div>
    </div>
  );

  // Modo "active" → roleta funcional
  function spin() {
    if (phase !== 'idle') return;
    const refreshedState = getSpinState(member.id);
    if (!refreshedState.eligible) { setSpinState(refreshedState); setPhase('cooldown'); return; }

    const outcome = executeSpin(member.id);
    if (outcome.error) {
      setSpinState(getSpinState(member.id));
      setPhase('cooldown');
      return;
    }

    window.SankaAnalytics?.rouletteSpin();

    const { prizeIndex } = outcome;
    const offset = 360 - (prizeIndex * SLICE + SLICE / 2) + (Math.random() - 0.5) * (SLICE * 0.65);
    const newRot = rot + 360 * 7 + offset;
    setRot(newRot);
    setPhase('spinning');

    timerRef.current = setTimeout(() => {
      setResult(outcome);
      setPhase('result');
      if (outcome.spin.resultType !== 'no_prize') {
        setConfetti(true);
        window.SankaAnalytics?.rouletteWin(outcome.spin.prizeId, outcome.spin.resultType);
      }
      onRefresh();
    }, 4500);
  }

  function onCloseResult() {
    setResult(null);
    setConfetti(false);
    setPhase('idle');
    setSpinState(getSpinState(member.id));
  }

  // Após render initial, verifica se está em cooldown
  useEffect(() => {
    if (phase === 'idle' && !spinState.eligible) setPhase('cooldown');
  }, [spinState]);

  const spinning = phase === 'spinning';

  if (phase === 'result' && result) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
      {confetti && <Confetti />}
      <PrizeResultCard spin={result.spin} onClose={onCloseResult} />
    </div>
  );

  if (phase === 'cooldown') return (
    <CooldownScreen spinState={spinState} memberName={member.name} />
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, width:'100%' }}>
      {confetti && <Confetti />}

      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:11, color:T.fire, letterSpacing:3, fontFamily:T.body, marginBottom:4 }}>ROLETA SANKA</div>
        <p style={{ color:T.dim, fontSize:14, fontFamily:T.body, lineHeight:1.5 }}>
          Entre no Clube, gire e concorra a benefícios de lançamento.
          <br /><span style={{ fontSize:12, color:T.mute }}>1 giro por dia · Gratuito</span>
        </p>
      </div>

      {/* Wheel */}
      <div style={{ position:'relative', width:'min(300px,86vw)', aspectRatio:'1' }}>
        <div style={{
          position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)',
          width:0, height:0,
          borderLeft:'13px solid transparent', borderRight:'13px solid transparent',
          borderTop:`26px solid ${T.fire}`,
          zIndex:10, filter:`drop-shadow(0 2px 8px rgba(234,88,12,0.7))`,
        }} />
        {spinning && (
          <div style={{
            position:'absolute', inset:-6, borderRadius:'50%',
            border:`2px solid ${T.fire}55`,
            animation:'rlPulse 0.6s ease-in-out infinite',
          }} />
        )}
        <RouletteWheel prizes={prizes} rotation={rot} spinning={spinning} />
      </div>

      <button onClick={spin} disabled={spinning} style={{
        background: spinning ? '#1C1917' : T.fire,
        color:      spinning ? T.mute    : '#fff',
        border:'none', fontFamily:T.display, fontSize:20, letterSpacing:3,
        padding:'14px 52px', borderRadius:12,
        cursor: spinning ? 'not-allowed' : 'pointer',
        boxShadow: spinning ? 'none' : `0 0 36px rgba(234,88,12,0.4)`,
        minWidth:210, transition:'all 0.2s',
      }}>
        {spinning ? '⏳ GIRANDO…' : '🎰 GIRAR ROLETA'}
      </button>

      <p style={{ fontSize:11, color:T.mute, textAlign:'center', fontFamily:T.body, lineHeight:1.6, maxWidth:300 }}>
        Benefícios sujeitos à disponibilidade, validade e regras da campanha.<br />
        A Sanka pode alterar ou encerrar campanhas a qualquer momento.
      </p>

      <style>{`@keyframes rlPulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.7;transform:scale(1.01)}}`}</style>
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────────── */
function Dashboard({ memberId, onLogout }) {
  const [tab, setTab] = useState('wallet');
  const [member, setMember] = useState(() => getMemberById(memberId));

  function refresh() { setMember(getMemberById(memberId)); }

  if (!member) return null;

  const tabs = [
    { id:'wallet',   label:'Carteira', icon:'💳' },
    { id:'rewards',  label:'Resgatar', icon:'🎁' },
    { id:'spin',     label:'Roleta',   icon:'🎰' },
    { id:'history',  label:'Histórico',icon:'📋' },
  ];

  return (
    <div style={{ width:'100%', maxWidth:420 }}>
      {/* Member header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:T.body, fontWeight:700, fontSize:16, color:T.ink }}>
            {member.name.split(' ')[0]}
          </div>
          <TierBadge tierId={member.tier} />
        </div>
        <div style={{ fontFamily:T.mono, fontSize:26, fontWeight:700, color:T.fire }}>
          {member.pointsBalance}<span style={{ fontSize:12, color:T.mute, fontFamily:T.body }}> pts</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'#111110', borderRadius:12, padding:4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'9px 4px', borderRadius:8, border:'none', cursor:'pointer',
            background: tab === t.id ? T.fire : 'transparent',
            color: tab === t.id ? '#fff' : T.mute,
            fontFamily:T.body, fontWeight:700, fontSize:11, transition:'all 0.2s',
            letterSpacing:0.5,
          }}>
            <div style={{ fontSize:16, marginBottom:2 }}>{t.icon}</div>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'wallet'  && <PointsBalance member={member} />}
      {tab === 'rewards' && <RewardsCatalog member={member} onRefresh={refresh} />}
      {tab === 'spin'    && <RouletteTab member={member} onRefresh={refresh} />}
      {tab === 'history' && <HistoryTab member={member} />}

      {/* Logout */}
      <button onClick={onLogout} style={{
        marginTop:28, background:'none', border:`1px solid ${T.border}`,
        color:T.mute, fontFamily:T.body, fontSize:12, padding:'10px', borderRadius:8,
        cursor:'pointer', width:'100%',
      }}>
        Sair da conta
      </button>
    </div>
  );
}

/* ── App root ────────────────────────────────────────────────── */
function ClubeApp() {
  const [view,      setView]      = useState('intro');
  const [memberId,  setMemberId]  = useState(() => ls(LS_SESSION, null));

  useEffect(() => {
    if (memberId) {
      // valida que o membro ainda existe
      const m = getMemberById(memberId);
      if (m) { setView('dashboard'); }
      else   { lsSet(LS_SESSION, null); setMemberId(null); }
    }
  }, []);

  function login(id) {
    lsSet(LS_SESSION, id);
    setMemberId(id);
    setView('dashboard');
  }

  function logout() {
    lsSet(LS_SESSION, null);
    setMemberId(null);
    setView('intro');
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <header style={{
        borderBottom:`1px solid ${T.border}`, padding:'14px 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, background:'rgba(10,10,10,0.92)',
        backdropFilter:'blur(12px)', zIndex:50,
      }}>
        <a href="index.html" style={{ fontFamily:T.display, fontSize:20, color:T.ink, textDecoration:'none', letterSpacing:2 }}>
          SANKA<span style={{ color:T.fire }}>.</span>
        </a>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <a href="cardapio.html" style={{ color:T.mute, fontFamily:T.body, fontSize:13, textDecoration:'none' }}>Cardápio</a>
          {view !== 'dashboard' && view !== 'login' && (
            <button onClick={() => setView('login')} style={{
              background:'none', border:`1px solid ${T.border}`, color:T.dim,
              fontFamily:T.body, fontSize:12, padding:'6px 12px', borderRadius:8,
              cursor:'pointer',
            }}>Entrar</button>
          )}
        </div>
      </header>

      {/* Content */}
      <main style={{
        flex:1, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'flex-start',
        padding:'32px 20px 56px', gap:24, boxSizing:'border-box',
      }}>
        {view === 'intro'     && <ClubSignup onDone={login} onLoginClick={() => setView('login')} />}
        {view === 'login'     && <ClubLogin  onDone={login} onSignupClick={() => setView('intro')} />}
        {view === 'dashboard' && memberId && <Dashboard memberId={memberId} onLogout={logout} />}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop:`1px solid rgba(245,239,230,0.05)`, padding:'16px 20px',
        display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap',
      }}>
        {[['Cardápio','cardapio.html'],['Monte Seu Burger','monte.html'],['Oferta','oferta.html'],['Início','index.html'],['Privacidade','privacidade.html'],['Termos do Clube','termos-clube.html']].map(([l,h]) => (
          <a key={h} href={h} style={{ color:T.mute, fontFamily:T.body, fontSize:12, textDecoration:'none' }}>{l}</a>
        ))}
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ClubeApp />);
