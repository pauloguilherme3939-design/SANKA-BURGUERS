// clube-app.jsx — Clube Sanka: roleta de premiação diária + cadastro
// v2: confetti no ganho, share WhatsApp, milestones, histórico, UX premium

import { SANKA_CONFIG } from './lib/config.js'

const { useState, useEffect, useRef, useCallback } = React;
const WA = SANKA_CONFIG.whatsapp;

/* ── Prêmios ─────────────────────────────────────────────────────── */
const PRIZES = [
  { id: 0, label: '10% OFF',  full: '10% de desconto',         code: 'SANKA10', emoji: '🔥', color: '#EA580C', textColor: '#fff',     prob: 25 },
  { id: 1, label: 'BEBIDA',   full: 'Bebida grátis',           code: 'BEBIDA',  emoji: '🥤', color: '#92400E', textColor: '#F5EFE6',  prob: 12 },
  { id: 2, label: '15% OFF',  full: '15% de desconto',         code: 'SANKA15', emoji: '🎯', color: '#B91C1C', textColor: '#fff',     prob: 15 },
  { id: 3, label: 'AMANHÃ',   full: 'Tente amanhã!',           code: null,       emoji: '😅', color: '#292524', textColor: '#6B7280', prob: 20 },
  { id: 4, label: '20% OFF',  full: '20% de desconto',         code: 'SANKA20', emoji: '💥', color: '#7C2D12', textColor: '#fff',     prob: 10 },
  { id: 5, label: 'BATATA',   full: 'Porção de batata grátis', code: 'BATATA',  emoji: '🍟', color: '#A16207', textColor: '#fff',     prob: 10 },
  { id: 6, label: '25% OFF',  full: '25% de desconto',         code: 'SANKA25', emoji: '🚀', color: '#3B0764', textColor: '#fff',     prob:  3 },
  { id: 7, label: 'FRETE',    full: 'Frete grátis',            code: 'FRETE0',  emoji: '🛵', color: '#1E3A5F', textColor: '#fff',     prob:  5 },
];

const MILESTONES = [
  { days:  3, label: 'Iniciante 🌟',  reward: '+5% no próximo prêmio' },
  { days:  7, label: 'Viciado 🔥',    reward: 'Acesso a prêmios exclusivos' },
  { days: 14, label: 'Fiel 💎',       reward: 'Cupom extra no 14º dia' },
  { days: 30, label: 'Lendário 🏆',   reward: 'Brinde surpresa' },
];

const SLICE_DEG = 360 / PRIZES.length;
const CX = 200, CY = 200, R = 188, R_TEXT = 130;

const LS_JOINED  = 'sanka_clube_joined';
const LS_NAME    = 'sanka_clube_name';
const LS_SPIN_D  = 'sanka_spin_date';
const LS_PRIZE   = 'sanka_last_prize';
const LS_STREAK  = 'sanka_streak';
const LS_HISTORY = 'sanka_prize_history';
const LS_TOTAL   = 'sanka_total_spins';

/* ── Utils ───────────────────────────────────────────────────────── */
function todayStr() { return new Date().toISOString().slice(0, 10); }

function ls(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function getStreak() { return ls(LS_STREAK, { count: 0, date: '' }); }
function getHistory() { return ls(LS_HISTORY, []); }
function getTotalSpins() { return ls(LS_TOTAL, 0); }

function saveStreak(count, date) { lsSet(LS_STREAK, { count, date }); }
function addToHistory(prize) {
  const h = getHistory();
  h.unshift({ prize, date: todayStr() });
  lsSet(LS_HISTORY, h.slice(0, 14));
}

function getWeightedPrize() {
  const total = PRIZES.reduce((s, p) => s + p.prob, 0);
  let r = Math.random() * total;
  for (const p of PRIZES) { r -= p.prob; if (r <= 0) return p; }
  return PRIZES[0];
}

function nextMilestone(streak) {
  return MILESTONES.find(m => m.days > streak) || null;
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

/* ── Confetti ────────────────────────────────────────────────────── */
function Confetti() {
  const colors = ['#EA580C','#F97316','#FBBF24','#34D399','#60A5FA','#F472B6','#A78BFA'];
  const pieces = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: 5 + Math.random() * 90,
    delay: Math.random() * 0.8,
    dur: 2 + Math.random() * 1.5,
    size: 7 + Math.random() * 9,
    rot: Math.random() * 720,
  }));
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:100, overflow:'hidden' }} aria-hidden="true">
      {pieces.map(p => (
        <div key={p.id} style={{
          position:'absolute', top:'-10px', left:`${p.left}%`,
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: p.id % 3 === 0 ? '50%' : p.id % 3 === 1 ? '2px' : '0',
          transform: `rotate(${p.rot}deg)`,
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
      <style>{`@keyframes confettiFall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }`}</style>
    </div>
  );
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
        transition: spinning ? 'transform 4.2s cubic-bezier(0.12, 0.9, 0.2, 1)' : 'none',
        display: 'block',
        filter: spinning
          ? 'drop-shadow(0 0 48px rgba(234,88,12,0.7))'
          : 'drop-shadow(0 0 24px rgba(234,88,12,0.2))',
        willChange: 'transform',
      }}
    >
      {/* Outer glow ring */}
      <circle cx={CX} cy={CY} r={R+8} fill="none" stroke="rgba(234,88,12,0.15)" strokeWidth="4" />
      <circle cx={CX} cy={CY} r={R+4} fill="none" stroke="rgba(234,88,12,0.25)" strokeWidth="2" />

      {PRIZES.map((prize, i) => {
        const start  = i * SLICE_DEG;
        const end    = (i + 1) * SLICE_DEG;
        const midDeg = start + SLICE_DEG / 2;
        const tp     = polar(CX, CY, R_TEXT, midDeg);
        const ep     = polar(CX, CY, 106, midDeg);

        return (
          <g key={prize.id}>
            <path d={sectorPath(start, end)} fill={prize.color} stroke="#0A0A0A" strokeWidth="1.5" />
            {/* Sector border highlight */}
            <path d={sectorPath(start, end)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
            {/* Emoji */}
            <text x={ep.x.toFixed(1)} y={ep.y.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${midDeg}, ${ep.x.toFixed(1)}, ${ep.y.toFixed(1)})`}
              fontSize="17" style={{ userSelect:'none' }}
            >{prize.emoji}</text>
            {/* Label */}
            <text x={tp.x.toFixed(1)} y={tp.y.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${midDeg}, ${tp.x.toFixed(1)}, ${tp.y.toFixed(1)})`}
              fill={prize.textColor} fontSize="10.5" fontWeight="800"
              fontFamily="'Space Grotesk', sans-serif"
              style={{ userSelect:'none', letterSpacing:'0.8px' }}
            >{prize.label}</text>
          </g>
        );
      })}

      {/* Centre hub */}
      <circle cx={CX} cy={CY} r={32} fill="#0A0A0A" stroke="#EA580C" strokeWidth="3" />
      <circle cx={CX} cy={CY} r={26} fill="#111110" />
      <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
        fill="#EA580C" fontSize="20" fontWeight="900"
        fontFamily="'Anton', sans-serif">S</text>
    </svg>
  );
}

/* ── Countdown to midnight ───────────────────────────────────────── */
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

/* ── Streak display ──────────────────────────────────────────────── */
function StreakBar({ count }) {
  if (!count) return null;
  const next = nextMilestone(count);
  const prev = MILESTONES.filter(m => m.days <= count).at(-1);
  const from = prev ? prev.days : 0;
  const to   = next ? next.days : count;
  const pct  = next ? Math.min(100, ((count - from) / (to - from)) * 100) : 100;

  const flameLevel = count >= 30 ? '🏆' : count >= 14 ? '💎' : count >= 7 ? '🔥' : count >= 3 ? '⭐' : '✨';

  return (
    <div style={{ width:'100%', maxWidth:340 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, color:'#F5EFE6' }}>
          {flameLevel} {count} {count === 1 ? 'dia seguido' : 'dias seguidos'}
        </span>
        {next && (
          <span style={{ fontSize:12, color:'#4E453C' }}>{next.days - count} para {next.label}</span>
        )}
      </div>
      <div style={{ background:'#1C1917', borderRadius:999, height:6, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,#EA580C,#F97316)', borderRadius:999, transition:'width 0.8s ease' }} />
      </div>
      {next && (
        <div style={{ fontSize:11, color:'#4E453C', marginTop:4 }}>Recompensa: {next.reward}</div>
      )}
    </div>
  );
}

/* ── Tela: já girou hoje ─────────────────────────────────────────── */
function AlreadySpun({ lastPrize, streak, history }) {
  const countdown = useCountdown();
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!lastPrize?.code) return;
    navigator.clipboard?.writeText(lastPrize.code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  }

  const waMsg = lastPrize?.code
    ? encodeURIComponent(`Olá! Quero usar meu cupom *${lastPrize.code}* (${lastPrize.full}) no meu pedido. 🎰`)
    : '';

  return (
    <div style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>

      <StreakBar count={streak} />

      {/* Countdown */}
      <div style={{ textAlign:'center', background:'#111110', border:'1px solid rgba(245,239,230,0.08)', borderRadius:16, padding:'20px 28px', width:'100%', boxSizing:'border-box' }}>
        <div style={{ fontSize:11, color:'#4E453C', letterSpacing:3, marginBottom:8 }}>PRÓXIMA ROLETA EM</div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:42, fontWeight:700, color:'#EA580C', letterSpacing:4 }}>
          {countdown}
        </div>
      </div>

      {/* Prêmio do dia */}
      {lastPrize?.code ? (
        <div style={{ width:'100%', background:'#111110', border:'1.5px dashed rgba(234,88,12,0.4)', borderRadius:14, padding:'18px 20px', boxSizing:'border-box' }}>
          <div style={{ fontSize:11, color:'#4E453C', letterSpacing:3, marginBottom:8 }}>SEU PRÊMIO DE HOJE</div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <span style={{ fontSize:32 }}>{lastPrize.emoji}</span>
            <div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:700, color:'#F5EFE6', letterSpacing:4 }}>{lastPrize.code}</div>
              <div style={{ fontSize:13, color:'#8A7D6E' }}>{lastPrize.full}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={copy} style={{
              flex:1, background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(234,88,12,0.12)',
              border: `1px solid ${copied ? '#22C55E' : 'rgba(234,88,12,0.3)'}`,
              color: copied ? '#22C55E' : '#EA580C',
              fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13,
              padding:'10px', borderRadius:8, cursor:'pointer', letterSpacing:1,
            }}>
              {copied ? '✓ COPIADO' : 'COPIAR CUPOM'}
            </button>
            {waMsg && (
              <a href={`https://wa.me/${WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                style={{
                  flex:1, background:'#EA580C', color:'#fff',
                  fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13,
                  padding:'10px', borderRadius:8, textDecoration:'none',
                  display:'flex', alignItems:'center', justifyContent:'center', letterSpacing:1,
                }}>
                USAR AGORA
              </a>
            )}
          </div>
        </div>
      ) : lastPrize && (
        <div style={{ textAlign:'center', color:'#4E453C', fontSize:14, background:'#111110', borderRadius:12, padding:'16px 20px' }}>
          😅 Hoje foi "Tente Amanhã". Volte amanhã para girar de novo — a sorte muda!
        </div>
      )}

      {/* Histórico */}
      {history.length > 1 && (
        <div style={{ width:'100%' }}>
          <div style={{ fontSize:11, color:'#4E453C', letterSpacing:2, marginBottom:10 }}>ÚLTIMOS PRÊMIOS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {history.slice(1, 6).map((h, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'#111110', borderRadius:8, padding:'8px 14px',
                fontSize:13, color:'#6B7280',
              }}>
                <span>{h.prize.emoji} {h.prize.full}</span>
                <span style={{ fontSize:11 }}>{h.date.slice(5).replace('-','/')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <a href="cardapio.html" style={{
        display:'block', width:'100%', boxSizing:'border-box',
        background:'transparent', border:'1px solid rgba(245,239,230,0.12)',
        color:'#8A7D6E', fontFamily:"'Space Grotesk',sans-serif",
        fontWeight:700, fontSize:14, padding:'13px', borderRadius:10,
        textDecoration:'none', textAlign:'center', letterSpacing:1,
      }}>VER CARDÁPIO →</a>
    </div>
  );
}

/* ── Tela: prêmio ganho ──────────────────────────────────────────── */
function PrizeCard({ prize, streak, onBack }) {
  const [copied, setCopied]   = useState(false);
  const [confetti, setConfetti] = useState(!prize.code ? false : true);
  const expiry    = new Date(Date.now() + 7 * 86400000);
  const expiryStr = expiry.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
  const isMiss    = !prize.code;

  useEffect(() => {
    if (confetti) { const t = setTimeout(() => setConfetti(false), 3500); return () => clearTimeout(t); }
  }, []);

  function copy() {
    if (!prize.code) return;
    navigator.clipboard?.writeText(prize.code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  }

  const waMsg = prize.code
    ? encodeURIComponent(`Olá! Ganhei o prêmio na roleta do Clube Sanka! 🎰\nMeu cupom: *${prize.code}* — ${prize.full}.\nQuero usar no meu pedido!`)
    : '';

  const shareMsg = prize.code
    ? encodeURIComponent(`🎰 Ganhei *${prize.full}* na roleta do Clube Sanka em Rio Claro!\nVocê também pode girar todo dia de graça: sankaburgers.com.br/clube.html`)
    : '';

  const next = nextMilestone(streak);

  return (
    <div style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
      {confetti && <Confetti />}

      {/* Prize header */}
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize: isMiss ? 56 : 72, lineHeight:1, marginBottom:12, animation: isMiss ? 'none' : 'prizePopIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
          {prize.emoji}
        </div>
        <h2 style={{
          fontFamily:"'Anton',sans-serif",
          fontSize: isMiss ? 28 : 40,
          color: isMiss ? '#4E453C' : '#EA580C',
          letterSpacing: 3, marginBottom: 6, lineHeight:1.1,
        }}>
          {isMiss ? 'TENTE AMANHÃ' : prize.full.toUpperCase()}
        </h2>
        {!isMiss && <p style={{ color:'#8A7D6E', fontSize:14 }}>Válido por 7 dias · Informe ao pedir pelo WhatsApp</p>}
      </div>

      {/* Coupon box */}
      {prize.code && (
        <>
          <div onClick={copy} style={{
            width:'100%', boxSizing:'border-box',
            background:'#111110', border:'2px dashed rgba(234,88,12,0.5)',
            borderRadius:14, padding:'20px 24px', marginBottom:12,
            cursor:'pointer', textAlign:'center',
          }}>
            <div style={{ fontSize:11, color:'#4E453C', letterSpacing:3, marginBottom:10 }}>SEU CUPOM</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:34, fontWeight:700, color:'#F5EFE6', letterSpacing:6 }}>
              {prize.code}
            </div>
            <div style={{ fontSize:13, color: copied ? '#22C55E' : '#EA580C', marginTop:10, fontWeight:600 }}>
              {copied ? '✓ Copiado!' : '👆 Toque para copiar'}
            </div>
          </div>

          <p style={{ fontSize:12, color:'#4E453C', marginBottom:20, textAlign:'center' }}>
            Válido até {expiryStr} · Use no WhatsApp ao fazer o pedido
          </p>

          <a href={`https://wa.me/${WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
            style={{
              display:'block', width:'100%', boxSizing:'border-box',
              background:'#EA580C', color:'#fff',
              fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15,
              padding:'15px 24px', borderRadius:12, textDecoration:'none',
              textAlign:'center', letterSpacing:1, marginBottom:10,
            }}>
            🍔 PEDIR E USAR AGORA
          </a>

          <a href={`https://wa.me/?text=${shareMsg}`} target="_blank" rel="noopener noreferrer"
            style={{
              display:'block', width:'100%', boxSizing:'border-box',
              background:'rgba(234,88,12,0.1)', border:'1px solid rgba(234,88,12,0.25)',
              color:'#EA580C',
              fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, fontSize:13,
              padding:'12px 24px', borderRadius:10, textDecoration:'none',
              textAlign:'center', letterSpacing:0.5, marginBottom:20,
            }}>
            📤 Compartilhar com amigos
          </a>
        </>
      )}

      {isMiss && (
        <p style={{ color:'#4E453C', fontSize:15, marginBottom:28, lineHeight:1.8, textAlign:'center' }}>
          Não foi dessa vez — mas você tem 1 nova chance amanhã.<br />
          Não perca a sequência!{streak >= 2 ? ` Você está em ${streak} dias seguidos.` : ''}
        </p>
      )}

      {/* Streak */}
      {streak >= 2 && (
        <div style={{ width:'100%', marginBottom:20 }}>
          <StreakBar count={streak} />
        </div>
      )}
      {next && (
        <div style={{
          width:'100%', background:'rgba(234,88,12,0.07)', border:'1px solid rgba(234,88,12,0.15)',
          borderRadius:10, padding:'12px 16px', marginBottom:16, textAlign:'center', boxSizing:'border-box',
        }}>
          <div style={{ fontSize:12, color:'#6B7280' }}>Faltam <strong style={{ color:'#EA580C' }}>{next.days - streak} dias</strong> para {next.label}</div>
          <div style={{ fontSize:12, color:'#4E453C', marginTop:2 }}>Recompensa: {next.reward}</div>
        </div>
      )}

      <button onClick={onBack} style={{
        background:'transparent', border:'1px solid rgba(245,239,230,0.1)',
        color:'#4E453C', fontFamily:"'Space Grotesk',sans-serif",
        fontSize:13, padding:'10px 20px', borderRadius:8,
        cursor:'pointer', width:'100%',
      }}>
        ← Voltar ao Clube
      </button>

      <style>{`@keyframes prizePopIn { 0%{transform:scale(0.3) rotate(-10deg);opacity:0} 80%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}

/* ── Tela: roleta ────────────────────────────────────────────────── */
function SpinScreen({ name, streak, totalSpins, onSpun }) {
  const [phase,    setPhase]    = useState('idle');
  const [totalRot, setTotalRot] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);
  const timerRef = useRef(null);

  function spin() {
    if (phase !== 'idle') return;
    const prize  = getWeightedPrize();
    const idx    = prize.id;
    const offset = 360 - (idx * SLICE_DEG + SLICE_DEG / 2) + (Math.random() - 0.5) * (SLICE_DEG * 0.7);
    const newRot = totalRot + 360 * 7 + offset;

    setTotalRot(newRot);
    setWonPrize(prize);
    setPhase('spinning');

    timerRef.current = setTimeout(() => {
      const today  = todayStr();
      const s      = getStreak();
      const yest   = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newCnt = s.date === yest ? s.count + 1 : 1;

      lsSet(LS_SPIN_D, today);
      lsSet(LS_PRIZE, prize);
      saveStreak(newCnt, today);
      addToHistory(prize);
      lsSet(LS_TOTAL, getTotalSpins() + 1);

      if (window.SankaAnalytics) window.SankaAnalytics.claimOffer?.({ code: prize.code || 'TENTE', name: prize.full, originalPrice: 0, salePrice: 0 });

      onSpun(prize, newCnt);
      setPhase('won');
    }, 4500);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (phase === 'won' && wonPrize) {
    return <PrizeCard prize={wonPrize} streak={streak} onBack={() => { setPhase('idle'); setWonPrize(null); }} />;
  }

  const spinning = phase === 'spinning';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, width:'100%' }}>

      {streak >= 2 && (
        <div style={{ width:'100%', maxWidth:340 }}>
          <StreakBar count={streak} />
        </div>
      )}

      <p style={{ color:'#8A7D6E', fontSize:15, textAlign:'center', lineHeight:1.5 }}>
        {name.split(' ')[0]}, sua roleta de hoje está pronta!<br />
        <span style={{ fontSize:12, color:'#4E453C' }}>8 prêmios · 1 giro por dia</span>
      </p>

      {/* Wheel container */}
      <div style={{ position:'relative', width: 'min(320px, 88vw)', aspectRatio:'1' }}>
        {/* Pointer */}
        <div style={{
          position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)',
          width:0, height:0,
          borderLeft:'14px solid transparent',
          borderRight:'14px solid transparent',
          borderTop:'28px solid #EA580C',
          zIndex:10,
          filter:'drop-shadow(0 3px 8px rgba(234,88,12,0.7))',
        }} />
        {/* Outer glow ring when spinning */}
        {spinning && (
          <div style={{
            position:'absolute', inset:-6, borderRadius:'50%',
            border:'2px solid rgba(234,88,12,0.5)',
            animation:'pulseRing 0.6s ease-in-out infinite',
          }} />
        )}
        <Wheel rotation={totalRot} spinning={spinning} />
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        style={{
          background: spinning ? '#1C1917' : '#EA580C',
          color: spinning ? '#4E453C' : '#fff',
          border: 'none',
          fontFamily:"'Anton',sans-serif", fontSize:22, letterSpacing:4,
          padding:'16px 52px', borderRadius:14,
          cursor: spinning ? 'not-allowed' : 'pointer',
          transition:'all 0.2s',
          boxShadow: spinning ? 'none' : '0 0 40px rgba(234,88,12,0.45)',
          transform: spinning ? 'scale(0.97)' : 'scale(1)',
          minWidth: 200,
        }}
        aria-label={spinning ? 'Girando...' : 'Girar a roleta'}
      >
        {spinning ? '⏳ GIRANDO…' : '🎰 GIRAR ROLETA'}
      </button>

      <p style={{ color:'#4E453C', fontSize:12, textAlign:'center' }}>
        1 giro por dia · Prêmios válidos por 7 dias · Gratuito
      </p>

      {totalSpins > 0 && (
        <p style={{ fontSize:12, color:'#292524' }}>{totalSpins} giro{totalSpins !== 1 ? 's' : ''} no total</p>
      )}

      <style>{`@keyframes pulseRing { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.01)} }`}</style>
    </div>
  );
}

/* ── Formulário de cadastro ──────────────────────────────────────── */
function RegisterForm({ onJoined }) {
  const [form,    setForm]    = useState({ name:'', whatsapp:'', birthday:'', lgpd:false });
  const [errors,  setErrors]  = useState({});
  const [srvErr,  setSrvErr]  = useState('');
  const [loading, setLoading] = useState(false);
  const [step,    setStep]    = useState(0); // 0=intro, 1=form

  const inp = (field, hasErr) => ({
    width:'100%', boxSizing:'border-box',
    background:'#111110', border:`1.5px solid ${hasErr ? '#DC2626' : 'rgba(245,239,230,0.1)'}`,
    borderRadius:10, padding:'13px 16px', color:'#F5EFE6',
    fontFamily:"'Space Grotesk',sans-serif", fontSize:15,
    outline:'none', transition:'border-color 0.2s',
  });
  const lbl = { display:'block', color:'#8A7D6E', fontFamily:"'Space Grotesk',sans-serif", fontSize:13, marginBottom:6 };
  const errStyle = { color:'#DC2626', fontSize:12, marginTop:4 };

  function set(f, v) {
    setForm(p => ({ ...p, [f]: v }));
    setErrors(p => { const n={...p}; delete n[f]; return n; });
    setSrvErr('');
  }

  function validate() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Informe seu nome completo.';
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

  if (step === 0) {
    return (
      <div style={{ maxWidth:400, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:12 }}>🎰</div>
        <h1 style={{ fontFamily:"'Anton',sans-serif", fontSize:34, color:'#F5EFE6', letterSpacing:2, marginBottom:8 }}>
          CLUBE SANKA
        </h1>
        <p style={{ color:'#8A7D6E', fontSize:16, lineHeight:1.7, marginBottom:28 }}>
          Gire a roleta todo dia e ganhe prêmios reais no seu lanche.
          Gratuito. Sem pagar nada.
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:28, textAlign:'left' }}>
          {[
            ['🔥', 'Descontos até 25%', 'Todo dia uma nova chance'],
            ['🍟', 'Prêmios grátis',    'Batata, bebida, frete'],
            ['🎂', 'Cupom no aniversário', 'No seu dia especial'],
            ['🏆', 'Badges por sequência', '3, 7, 14 e 30 dias'],
          ].map(([ico, title, sub]) => (
            <div key={title} style={{ background:'#111110', borderRadius:12, padding:'14px 14px', border:'1px solid rgba(245,239,230,0.07)' }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{ico}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13, color:'#F5EFE6', marginBottom:2 }}>{title}</div>
              <div style={{ fontSize:12, color:'#4E453C' }}>{sub}</div>
            </div>
          ))}
        </div>

        <button onClick={() => setStep(1)} style={{
          width:'100%', background:'#EA580C', color:'#fff',
          border:'none', fontFamily:"'Space Grotesk',sans-serif",
          fontSize:16, fontWeight:700, letterSpacing:1,
          padding:'15px', borderRadius:12, cursor:'pointer',
          boxShadow:'0 0 32px rgba(234,88,12,0.35)',
        }}>
          QUERO ENTRAR →
        </button>

        <p style={{ marginTop:16, color:'#4E453C', fontSize:12 }}>
          Já é membro?{' '}
          <button onClick={() => {
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
            Recuperar conta
          </button>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:400, width:'100%' }}>
      <button onClick={() => setStep(0)} style={{ background:'none', border:'none', color:'#4E453C', cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif", fontSize:13, marginBottom:20, padding:0 }}>
        ← Voltar
      </button>
      <h2 style={{ fontFamily:"'Anton',sans-serif", fontSize:26, color:'#F5EFE6', letterSpacing:2, marginBottom:20 }}>
        CRIAR CONTA
      </h2>

      <form onSubmit={submit} noValidate style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <label style={lbl}>Nome completo</label>
          <input style={inp('name', !!errors.name)} type="text" placeholder="Seu nome"
            value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" autoFocus />
          {errors.name && <p style={errStyle}>{errors.name}</p>}
        </div>
        <div>
          <label style={lbl}>WhatsApp</label>
          <input style={inp('whatsapp', !!errors.whatsapp)} type="tel" placeholder="(19) 9 1234-5678"
            value={form.whatsapp} onChange={e => set('whatsapp', maskPhone(e.target.value))}
            autoComplete="tel" inputMode="numeric" />
          {errors.whatsapp && <p style={errStyle}>{errors.whatsapp}</p>}
        </div>
        <div>
          <label style={lbl}>Aniversário <span style={{ color:'#4E453C' }}>(opcional — cupom grátis no seu dia)</span></label>
          <input style={{ ...inp('birthday', !!errors.birthday), maxWidth:110 }}
            type="text" placeholder="DD/MM" value={form.birthday}
            onChange={e => set('birthday', maskBirthday(e.target.value))}
            inputMode="numeric" maxLength={5} />
          {errors.birthday && <p style={errStyle}>{errors.birthday}</p>}
        </div>
        <label style={{ display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer', color:'#8A7D6E', fontSize:13 }}>
          <input type="checkbox" checked={form.lgpd} onChange={e => set('lgpd', e.target.checked)}
            style={{ marginTop:3, accentColor:'#EA580C', flexShrink:0 }} />
          Aceito receber promoções da Sanka Burgers no WhatsApp. Posso cancelar a qualquer momento.
        </label>
        {errors.lgpd && <p style={errStyle}>{errors.lgpd}</p>}
        {srvErr && <p style={{ ...errStyle, textAlign:'center', fontSize:14 }}>{srvErr}</p>}
        <button type="submit" disabled={loading} style={{
          background: loading ? '#1C1917' : '#EA580C',
          color: loading ? '#4E453C' : '#fff',
          border:'none', fontFamily:"'Space Grotesk',sans-serif",
          fontSize:15, fontWeight:700, letterSpacing:1,
          padding:'15px', borderRadius:12, cursor: loading ? 'not-allowed' : 'pointer',
          transition:'background .2s',
        }}>
          {loading ? 'Cadastrando…' : '🎰 ENTRAR E GIRAR →'}
        </button>
      </form>
    </div>
  );
}

/* ── App principal ───────────────────────────────────────────────── */
function ClubeApp() {
  const [name,       setName]       = useState(() => ls(LS_NAME, ''));
  const [joined,     setJoined]     = useState(() => !!ls(LS_JOINED, null));
  const [spinDate,   setSpinDate]   = useState(() => ls(LS_SPIN_D, ''));
  const [lastPrize,  setLastPrize]  = useState(() => ls(LS_PRIZE, null));
  const [streak,     setStreak]     = useState(() => getStreak().count);
  const [history,    setHistory]    = useState(() => getHistory());
  const [totalSpins, setTotalSpins] = useState(() => getTotalSpins());

  const alreadySpun = spinDate === todayStr();

  function onJoined(n) { setName(n); setJoined(true); }

  function onSpun(prize, newStreak) {
    const today = todayStr();
    setSpinDate(today);
    setLastPrize(prize);
    setStreak(newStreak);
    setHistory(getHistory());
    setTotalSpins(getTotalSpins());
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <header style={{
        borderBottom:'1px solid rgba(245,239,230,0.07)', padding:'14px 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, background:'rgba(10,10,10,0.9)', backdropFilter:'blur(12px)', zIndex:50,
      }}>
        <a href="index.html" style={{ fontFamily:"'Anton',sans-serif", fontSize:20, color:'#F5EFE6', textDecoration:'none', letterSpacing:2 }}>
          SANKA<span style={{ color:'#EA580C' }}>.</span>
        </a>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {joined && name && (
            <span style={{ color:'#8A7D6E', fontFamily:"'Space Grotesk',sans-serif", fontSize:13 }}>
              <strong style={{ color:'#F5EFE6' }}>{name.split(' ')[0]}</strong>
              {streak >= 2 && <span style={{ color:'#EA580C', marginLeft:6 }}>🔥{streak}</span>}
            </span>
          )}
          <a href="cardapio.html" style={{ color:'#4E453C', fontFamily:"'Space Grotesk',sans-serif", fontSize:13, textDecoration:'none' }}>Cardápio</a>
        </div>
      </header>

      {/* Conteúdo */}
      <main style={{
        flex:1, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'flex-start',
        padding:'32px 20px 48px', gap:24, boxSizing:'border-box',
      }}>
        {!joined ? (
          <RegisterForm onJoined={onJoined} />
        ) : alreadySpun ? (
          <AlreadySpun lastPrize={lastPrize} streak={streak} history={history} />
        ) : (
          <>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:11, color:'#EA580C', letterSpacing:3, marginBottom:6 }}>CLUBE SANKA</div>
              <h1 style={{ fontFamily:"'Anton',sans-serif", fontSize:30, color:'#F5EFE6', letterSpacing:2, marginBottom:0 }}>
                GIRE E GANHE
              </h1>
            </div>
            <SpinScreen name={name} streak={streak} totalSpins={totalSpins} onSpun={onSpun} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop:'1px solid rgba(245,239,230,0.05)',
        padding:'16px 20px',
        display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap',
      }}>
        {[['Cardápio','cardapio.html'],['Monte Seu Burger','monte.html'],['Oferta','oferta.html'],['Início','index.html']].map(([l,h]) => (
          <a key={h} href={h} style={{ color:'#292524', fontFamily:"'Space Grotesk',sans-serif", fontSize:13, textDecoration:'none' }}>{l}</a>
        ))}
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ClubeApp />);
