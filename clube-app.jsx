// clube-app.jsx — Clube Sanka: roleta de premiação diária + cadastro

import { SANKA_CONFIG } from './lib/config.js'

const { useState, useEffect, useRef } = React;
const WA = SANKA_CONFIG.whatsapp;

/* ── Prêmios ─────────────────────────────────────────────────────── */
const PRIZES = [
  { id: 0, label: '10% OFF',    full: '10% de desconto',      code: 'SANKA10', emoji: '🔥', color: '#EA580C', textColor: '#fff', prob: 25 },
  { id: 1, label: 'BEBIDA',     full: 'Bebida grátis',        code: 'BEBIDA',  emoji: '🥤', color: '#92400E', textColor: '#F5EFE6', prob: 12 },
  { id: 2, label: '15% OFF',    full: '15% de desconto',      code: 'SANKA15', emoji: '🎯', color: '#B91C1C', textColor: '#fff', prob: 15 },
  { id: 3, label: 'AMANHÃ',     full: 'Tente amanhã!',        code: null,       emoji: '😅', color: '#1C1917', textColor: '#6B7280', prob: 20 },
  { id: 4, label: '20% OFF',    full: '20% de desconto',      code: 'SANKA20', emoji: '💥', color: '#7C2D12', textColor: '#fff', prob: 10 },
  { id: 5, label: 'BATATA',     full: 'Porção de batata grátis', code: 'BATATA', emoji: '🍟', color: '#A16207', textColor: '#fff', prob: 10 },
  { id: 6, label: '25% OFF',    full: '25% de desconto',      code: 'SANKA25', emoji: '🚀', color: '#3B0764', textColor: '#fff', prob: 3  },
  { id: 7, label: 'FRETE',      full: 'Frete grátis',         code: 'FRETE0',  emoji: '🛵', color: '#1E3A5F', textColor: '#fff', prob: 5  },
];

const SLICE_DEG = 360 / PRIZES.length; // 45
const CX = 200, CY = 200, R = 190, R_TEXT = 132;

const LS_JOINED = 'sanka_clube_joined';
const LS_NAME   = 'sanka_clube_name';
const LS_SPIN_D = 'sanka_spin_date';
const LS_PRIZE  = 'sanka_last_prize';
const LS_STREAK = 'sanka_streak';

/* ── Utils ───────────────────────────────────────────────────────── */
function todayStr() { return new Date().toISOString().slice(0, 10); }

function getStreak() {
  try { return JSON.parse(localStorage.getItem(LS_STREAK) || '{"count":0,"date":""}'); }
  catch { return { count: 0, date: '' }; }
}

function saveStreak(count, date) {
  localStorage.setItem(LS_STREAK, JSON.stringify({ count, date }));
}

function getWeightedPrize() {
  const total = PRIZES.reduce((s, p) => s + p.prob, 0);
  let r = Math.random() * total;
  for (const p of PRIZES) { r -= p.prob; if (r <= 0) return p; }
  return PRIZES[0];
}

function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function maskBirthday(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0,2)}/${d.slice(2)}`;
}

/* ── SVG Wheel ───────────────────────────────────────────────────── */
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(start, end) {
  const s = polar(CX, CY, R, start);
  const e = polar(CX, CY, R, end);
  return `M${CX} ${CY} L${s.x.toFixed(1)} ${s.y.toFixed(1)} A${R} ${R} 0 0 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)} Z`;
}

function Wheel({ rotation, spinning }) {
  return (
    <svg
      viewBox="0 0 400 400"
      style={{
        width: '100%', height: '100%',
        transform: `rotate(${rotation}deg)`,
        transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        display: 'block',
        filter: 'drop-shadow(0 0 32px rgba(234,88,12,0.25))',
      }}
    >
      {/* Borda exterior */}
      <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="rgba(234,88,12,0.3)" strokeWidth="2" />

      {PRIZES.map((prize, i) => {
        const start  = i * SLICE_DEG;
        const end    = (i + 1) * SLICE_DEG;
        const midDeg = start + SLICE_DEG / 2;
        const tp     = polar(CX, CY, R_TEXT, midDeg);

        return (
          <g key={prize.id}>
            <path d={sectorPath(start, end)} fill={prize.color} stroke="#0A0A0A" strokeWidth="1.5" />
            {/* Emoji */}
            <text
              x={polar(CX, CY, 105, midDeg).x.toFixed(1)}
              y={polar(CX, CY, 105, midDeg).y.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${midDeg}, ${polar(CX,CY,105,midDeg).x.toFixed(1)}, ${polar(CX,CY,105,midDeg).y.toFixed(1)})`}
              fontSize="16" style={{ userSelect:'none' }}
            >{prize.emoji}</text>
            {/* Label */}
            <text
              x={tp.x.toFixed(1)} y={tp.y.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${midDeg}, ${tp.x.toFixed(1)}, ${tp.y.toFixed(1)})`}
              fill={prize.textColor} fontSize="11" fontWeight="700"
              fontFamily="'Space Grotesk', sans-serif"
              style={{ userSelect:'none', letterSpacing: '0.5px' }}
            >{prize.label}</text>
          </g>
        );
      })}

      {/* Centro */}
      <circle cx={CX} cy={CY} r={30} fill="#0A0A0A" stroke="#EA580C" strokeWidth="2.5" />
      <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
        fill="#EA580C" fontSize="17" fontWeight="900"
        fontFamily="'Anton', sans-serif">S</text>
    </svg>
  );
}

/* ── Contagem regressiva ─────────────────────────────────────────── */
function useCountdown() {
  const [t, setT] = useState('');
  useEffect(() => {
    function calc() {
      const now  = new Date();
      const next = new Date(); next.setHours(24, 0, 0, 0);
      const d    = next - now;
      const h    = Math.floor(d / 3600000);
      const m    = Math.floor((d % 3600000) / 60000);
      const s    = Math.floor((d % 60000) / 1000);
      setT(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ── Streak Badge ────────────────────────────────────────────────── */
function StreakBadge({ count }) {
  if (!count || count < 2) return null;
  const msg = count >= 7  ? `${count} dias 🔥 LENDÁRIO`
            : count >= 3  ? `${count} dias seguidos 🔥`
            : `${count} dias seguidos`;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.3)',
      borderRadius: 999, padding: '5px 14px', fontSize: 13,
      fontWeight: 700, color: '#EA580C',
    }}>{msg}</div>
  );
}

/* ── Tela: já girou hoje ─────────────────────────────────────────── */
function AlreadySpun({ lastPrize, streak }) {
  const countdown = useCountdown();
  return (
    <div style={{ textAlign:'center', maxWidth:360, width:'100%' }}>
      <div style={{ fontSize:52, marginBottom:12 }}>⏰</div>
      <h2 style={{ fontFamily:"'Anton',sans-serif", fontSize:26, color:'#F5EFE6', letterSpacing:1, marginBottom:8 }}>
        Você já girou hoje
      </h2>
      <p style={{ color:'#8A7D6E', fontSize:14, marginBottom:20 }}>Próxima roleta disponível em:</p>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:38, fontWeight:700, color:'#EA580C', letterSpacing:4, marginBottom:24 }}>
        {countdown}
      </div>
      <StreakBadge count={streak} />

      {lastPrize?.code && (
        <div style={{ marginTop:24, background:'#111110', border:'1px solid rgba(234,88,12,0.2)', borderRadius:12, padding:'16px 20px' }}>
          <div style={{ fontSize:11, color:'#4E453C', letterSpacing:2, marginBottom:6 }}>PRÊMIO DE HOJE</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:24, fontWeight:700, color:'#EA580C', letterSpacing:4 }}>
            {lastPrize.code}
          </div>
          <div style={{ fontSize:13, color:'#8A7D6E', marginTop:4 }}>{lastPrize.full}</div>
        </div>
      )}
      {!lastPrize?.code && lastPrize && (
        <p style={{ marginTop:20, color:'#4E453C', fontSize:14 }}>Hoje foi "Tente Amanhã". Volte amanhã para girar de novo!</p>
      )}

      <a href="cardapio.html" style={{
        display:'block', marginTop:24, background:'#EA580C', color:'#fff',
        fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14,
        padding:'13px', borderRadius:10, textDecoration:'none', letterSpacing:1,
      }}>VER CARDÁPIO →</a>
    </div>
  );
}

/* ── Tela: prêmio ganho ──────────────────────────────────────────── */
function PrizeCard({ prize, onBack }) {
  const [copied, setCopied] = useState(false);
  const expiry    = new Date(Date.now() + 7 * 86400000);
  const expiryStr = expiry.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
  const isMiss    = !prize.code;

  function copy() {
    if (!prize.code) return;
    navigator.clipboard?.writeText(prize.code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  }

  const waMsg = prize.code
    ? encodeURIComponent(`Olá! Quero usar o cupom *${prize.code}* (${prize.full}) no meu pedido.`)
    : '';

  return (
    <div style={{ textAlign:'center', maxWidth:380, width:'100%' }}>
      <div style={{ fontSize:64, marginBottom:8 }}>{prize.emoji}</div>
      <h2 style={{ fontFamily:"'Anton',sans-serif", fontSize:38, color: isMiss ? '#4E453C' : '#EA580C', letterSpacing:2, marginBottom:6 }}>
        {prize.full.toUpperCase()}
      </h2>

      {prize.code ? (
        <>
          <p style={{ color:'#8A7D6E', fontSize:14, marginBottom:24 }}>
            Use no seu próximo pedido pelo WhatsApp
          </p>

          {/* Coupon box */}
          <div onClick={copy} style={{
            background:'#111110', border:'2px dashed rgba(234,88,12,0.45)',
            borderRadius:12, padding:'18px 24px', marginBottom:10, cursor:'pointer',
          }}>
            <div style={{ fontSize:11, color:'#4E453C', letterSpacing:3, marginBottom:8 }}>SEU CUPOM</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:32, fontWeight:700, color:'#F5EFE6', letterSpacing:5 }}>
              {prize.code}
            </div>
            <div style={{ fontSize:12, color: copied ? '#22C55E' : '#EA580C', marginTop:8 }}>
              {copied ? '✓ Copiado!' : 'Toque para copiar'}
            </div>
          </div>

          <p style={{ fontSize:12, color:'#4E453C', marginBottom:24 }}>
            Válido até {expiryStr} · Informe no WhatsApp ao pedir
          </p>

          <a href={`https://wa.me/${WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
            style={{
              display:'block', background:'#EA580C', color:'#fff',
              fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15,
              padding:'14px 24px', borderRadius:10, textDecoration:'none',
              marginBottom:12, letterSpacing:1,
            }}>
            USAR AGORA NO PEDIDO →
          </a>
        </>
      ) : (
        <p style={{ color:'#4E453C', fontSize:15, marginBottom:32, lineHeight:1.7 }}>
          Não foi dessa vez — mas você tem 1 nova chance amanhã.<br />
          Não perca a sequência!
        </p>
      )}

      <button onClick={onBack} style={{
        background:'transparent', border:'1px solid rgba(245,239,230,0.12)',
        color:'#4E453C', fontFamily:"'Space Grotesk',sans-serif",
        fontSize:13, padding:'10px 20px', borderRadius:8, cursor:'pointer',
      }}>
        ← Voltar ao Clube
      </button>
    </div>
  );
}

/* ── Tela: roleta ────────────────────────────────────────────────── */
function SpinScreen({ name, streak, onSpun }) {
  const [phase,     setPhase]     = useState('idle'); // idle | spinning | won
  const [totalRot,  setTotalRot]  = useState(0);
  const [wonPrize,  setWonPrize]  = useState(null);
  const timerRef = useRef(null);

  function spin() {
    if (phase !== 'idle') return;

    const prize  = getWeightedPrize();
    const idx    = prize.id;
    const offset = 360 - (idx * SLICE_DEG + SLICE_DEG / 2) + (Math.random() - 0.5) * 18;
    const newRot = totalRot + 360 * 6 + offset;

    setTotalRot(newRot);
    setWonPrize(prize);
    setPhase('spinning');

    timerRef.current = setTimeout(() => {
      const today   = todayStr();
      const s       = getStreak();
      const yest    = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newCnt  = s.date === yest ? s.count + 1 : 1;

      localStorage.setItem(LS_SPIN_D, today);
      localStorage.setItem(LS_PRIZE,  JSON.stringify(prize));
      saveStreak(newCnt, today);

      if (window.SankaAnalytics) window.SankaAnalytics.claimOffer?.({ code: prize.code || 'TENTE', name: prize.full, originalPrice: 0, salePrice: 0 });

      onSpun(prize, newCnt);
      setPhase('won');
    }, 4300);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (phase === 'won' && wonPrize) {
    return <PrizeCard prize={wonPrize} onBack={() => { setPhase('idle'); setWonPrize(null); }} />;
  }

  const spinning = phase === 'spinning';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, width:'100%' }}>
      {streak >= 2 && <StreakBadge count={streak} />}

      <p style={{ color:'#8A7D6E', fontSize:14, textAlign:'center' }}>
        {name.split(' ')[0]}, sua roleta de hoje está pronta!
      </p>

      {/* Roleta */}
      <div style={{ position:'relative', width:300, height:300, maxWidth:'88vw' }}>
        {/* Ponteiro */}
        <div style={{
          position:'absolute', top:-12, left:'50%',
          transform:'translateX(-50%)',
          width:0, height:0,
          borderLeft:'12px solid transparent',
          borderRight:'12px solid transparent',
          borderTop:'24px solid #EA580C',
          zIndex:10,
          filter:'drop-shadow(0 2px 6px rgba(234,88,12,0.6))',
        }} />
        <Wheel rotation={totalRot} spinning={spinning} />
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        style={{
          background: spinning ? '#1C1917' : '#EA580C',
          color: spinning ? '#4E453C' : '#fff',
          border:'none',
          fontFamily:"'Anton',sans-serif", fontSize:20, letterSpacing:3,
          padding:'15px 44px', borderRadius:12,
          cursor: spinning ? 'not-allowed' : 'pointer',
          transition:'background .2s',
          boxShadow: spinning ? 'none' : '0 0 32px rgba(234,88,12,0.35)',
        }}
      >
        {spinning ? 'GIRANDO…' : 'GIRAR ROLETA'}
      </button>

      <p style={{ color:'#4E453C', fontSize:12, textAlign:'center' }}>
        1 giro por dia · Prêmios válidos por 7 dias
      </p>
    </div>
  );
}

/* ── Formulário de cadastro ──────────────────────────────────────── */
function RegisterForm({ onJoined }) {
  const [form,    setForm]    = useState({ name:'', whatsapp:'', birthday:'', lgpd:false });
  const [errors,  setErrors]  = useState({});
  const [srvErr,  setSrvErr]  = useState('');
  const [loading, setLoading] = useState(false);

  const inp = (field, hasErr) => ({
    width:'100%', background:'#111110', border:`1px solid ${hasErr ? '#DC2626' : 'rgba(245,239,230,0.1)'}`,
    borderRadius:8, padding:'12px 16px', color:'#F5EFE6',
    fontFamily:"'Space Grotesk',sans-serif", fontSize:15,
    outline:'none', boxSizing:'border-box',
  });
  const lbl = {
    display:'block', color:'#8A7D6E', fontFamily:"'Space Grotesk',sans-serif",
    fontSize:13, marginBottom:6,
  };
  const err = { color:'#DC2626', fontSize:12, marginTop:4 };

  function set(f, v) {
    setForm(p => ({ ...p, [f]: v }));
    setErrors(p => { const n={...p}; delete n[f]; return n; });
    setSrvErr('');
  }

  function validate() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2)  e.name = 'Informe seu nome completo.';
    const wa = form.whatsapp.replace(/\D/g,'');
    if (wa.length < 10 || wa.length > 11) e.whatsapp = 'WhatsApp inválido (ex: (19) 9 1234-5678).';
    if (form.birthday) {
      const m = form.birthday.match(/^(\d{2})\/(\d{2})$/);
      if (!m || +m[1]<1 || +m[1]>31 || +m[2]<1 || +m[2]>12) e.birthday = 'Use o formato DD/MM.';
    }
    if (!form.lgpd) e.lgpd = 'Você precisa aceitar para continuar.';
    return e;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setSrvErr('');
    try {
      const res  = await fetch('/api/clube', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: form.name.trim(), whatsapp: form.whatsapp.replace(/\D/g,''), birthday: form.birthday || null }),
      });
      const data = await res.json();
      if (!res.ok) { if (data.errors) setErrors(data.errors); else setSrvErr(data.error || 'Algo deu errado.'); return; }
      localStorage.setItem(LS_JOINED, '1');
      localStorage.setItem(LS_NAME,   form.name.trim());
      if (window.SankaAnalytics) window.SankaAnalytics.joinClub?.();
      onJoined(form.name.trim());
    } catch { setSrvErr('Sem conexão. Verifique sua internet.'); }
    finally  { setLoading(false); }
  }

  return (
    <div style={{ maxWidth:400, width:'100%' }}>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:52, marginBottom:12 }}>🎰</div>
        <h1 style={{ fontFamily:"'Anton',sans-serif", fontSize:32, color:'#F5EFE6', letterSpacing:2, marginBottom:8 }}>
          CLUBE SANKA
        </h1>
        <p style={{ color:'#8A7D6E', fontSize:15, lineHeight:1.65 }}>
          Cadastre-se uma vez e gire a roleta todo dia.<br />
          Descontos, prêmios grátis e surpresas diárias.
        </p>
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginBottom:24 }}>
        {['🔥 Descontos até 25%', '🍟 Prêmios grátis', '🎂 Cupom no aniversário', '🏆 Sequência de dias'].map(t => (
          <span key={t} style={{
            background:'rgba(234,88,12,0.1)', border:'1px solid rgba(234,88,12,0.22)',
            borderRadius:999, padding:'4px 12px', fontSize:12,
            color:'#F97316', fontFamily:"'Space Grotesk',sans-serif",
          }}>{t}</span>
        ))}
      </div>

      <form onSubmit={submit} noValidate style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <label style={lbl}>Nome completo</label>
          <input style={inp('name', !!errors.name)} type="text" placeholder="Seu nome" value={form.name}
            onChange={e => set('name', e.target.value)} autoComplete="name" />
          {errors.name && <p style={err}>{errors.name}</p>}
        </div>
        <div>
          <label style={lbl}>WhatsApp</label>
          <input style={inp('whatsapp', !!errors.whatsapp)} type="tel" placeholder="(19) 9 1234-5678"
            value={form.whatsapp} onChange={e => set('whatsapp', maskPhone(e.target.value))}
            autoComplete="tel" inputMode="numeric" />
          {errors.whatsapp && <p style={err}>{errors.whatsapp}</p>}
        </div>
        <div>
          <label style={lbl}>
            Aniversário <span style={{ color:'#4E453C' }}>(opcional — cupom especial no seu dia)</span>
          </label>
          <input style={{ ...inp('birthday', !!errors.birthday), maxWidth:110 }}
            type="text" placeholder="DD/MM" value={form.birthday}
            onChange={e => set('birthday', maskBirthday(e.target.value))}
            inputMode="numeric" maxLength={5} />
          {errors.birthday && <p style={err}>{errors.birthday}</p>}
        </div>
        <label style={{ display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer', color:'#8A7D6E', fontSize:13 }}>
          <input type="checkbox" checked={form.lgpd} onChange={e => set('lgpd', e.target.checked)}
            style={{ marginTop:3, accentColor:'#EA580C', flexShrink:0 }} />
          Aceito receber promoções da Sanka Burgers no WhatsApp. Posso pedir pra sair a qualquer momento.
        </label>
        {errors.lgpd && <p style={err}>{errors.lgpd}</p>}
        {srvErr && <p style={{ ...err, textAlign:'center', fontSize:14 }}>{srvErr}</p>}
        <button type="submit" disabled={loading} style={{
          background: loading ? '#1C1917' : '#EA580C',
          color: loading ? '#4E453C' : '#fff',
          border:'none', fontFamily:"'Space Grotesk',sans-serif",
          fontSize:15, fontWeight:700, letterSpacing:1,
          padding:'14px', borderRadius:10,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition:'background .2s',
        }}>
          {loading ? 'Cadastrando…' : 'ENTRAR E GIRAR →'}
        </button>
      </form>

      <p style={{ textAlign:'center', color:'#4E453C', fontSize:12, marginTop:16 }}>
        Já é membro?{' '}
        <button onClick={() => {
          // Se o usuário diz que é membro, verifica via API
          const wa = prompt('Informe seu WhatsApp cadastrado:');
          if (!wa) return;
          fetch(`/api/clube/check?whatsapp=${wa.replace(/\D/g,'')}`)
            .then(r => r.json())
            .then(d => {
              if (d.name) { localStorage.setItem(LS_JOINED,'1'); localStorage.setItem(LS_NAME, d.name); location.reload(); }
              else alert('WhatsApp não encontrado. Faça o cadastro acima.');
            })
            .catch(() => alert('Erro ao verificar. Tente novamente.'));
        }} style={{ background:'none', border:'none', color:'#EA580C', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
          Clique aqui para recuperar sua conta
        </button>
      </p>
    </div>
  );
}

/* ── App principal ───────────────────────────────────────────────── */
function ClubeApp() {
  const [name,      setName]      = useState(() => localStorage.getItem(LS_NAME) || '');
  const [joined,    setJoined]    = useState(() => !!localStorage.getItem(LS_JOINED));
  const [spinDate,  setSpinDate]  = useState(() => localStorage.getItem(LS_SPIN_D) || '');
  const [lastPrize, setLastPrize] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_PRIZE) || 'null'); } catch { return null; }
  });
  const [streak,    setStreak]    = useState(() => getStreak().count);

  const alreadySpun = spinDate === todayStr();

  function onJoined(n) { setName(n); setJoined(true); }

  function onSpun(prize, newStreak) {
    setSpinDate(todayStr());
    setLastPrize(prize);
    setStreak(newStreak);
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <header style={{
        borderBottom:'1px solid rgba(245,239,230,0.07)', padding:'16px 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <a href="index.html" style={{ fontFamily:"'Anton',sans-serif", fontSize:20, color:'#F5EFE6', textDecoration:'none', letterSpacing:2 }}>
          SANKA<span style={{ color:'#EA580C' }}>.</span>
        </a>
        {joined && name && (
          <span style={{ color:'#8A7D6E', fontFamily:"'Space Grotesk',sans-serif", fontSize:13 }}>
            Olá, <strong style={{ color:'#F5EFE6' }}>{name.split(' ')[0]}</strong>
            {streak >= 2 && <span style={{ color:'#EA580C', marginLeft:6 }}>🔥 {streak}</span>}
          </span>
        )}
      </header>

      {/* Conteúdo */}
      <main style={{
        flex:1, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'32px 20px', gap:24, boxSizing:'border-box',
      }}>
        {!joined ? (
          <RegisterForm onJoined={onJoined} />
        ) : alreadySpun ? (
          <AlreadySpun lastPrize={lastPrize} streak={streak} />
        ) : (
          <>
            <div style={{ textAlign:'center' }}>
              <h1 style={{ fontFamily:"'Anton',sans-serif", fontSize:26, color:'#F5EFE6', letterSpacing:2, marginBottom:4 }}>
                GIRE E GANHE
              </h1>
            </div>
            <SpinScreen name={name} streak={streak} onSpun={onSpun} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop:'1px solid rgba(245,239,230,0.07)',
        padding:'16px 20px',
        display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap',
      }}>
        {[['Cardápio','cardapio.html'],['Monte Seu Burger','monte.html'],['Oferta do Dia','oferta.html'],['Início','index.html']].map(([l,h]) => (
          <a key={h} href={h} style={{ color:'#4E453C', fontFamily:"'Space Grotesk',sans-serif", fontSize:13, textDecoration:'none' }}>{l}</a>
        ))}
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ClubeApp />);
