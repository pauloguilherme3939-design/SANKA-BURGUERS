// pedido-app.jsx — Rastreamento de Pedido · Sanka Burgers

import { SANKA_CONFIG } from './lib/config.js'

const { useState, useEffect, useRef } = React;

/* ── Status config ───────────────────────────────────────────── */
const STEPS = [
  { id: 'recebido',      label: 'Pedido Recebido',  icon: '✅', desc: 'Recebemos seu pedido!',                       eta: 2  },
  { id: 'preparando',    label: 'Preparando',        icon: '👨‍🍳', desc: 'Estamos montando seu lanche.',               eta: 8  },
  { id: 'na_chapa',      label: 'Na Chapa',          icon: '🔥', desc: 'A carne está na chapa. Cheiro bom aí?',      eta: 12 },
  { id: 'finalizando',   label: 'Finalizando',       icon: '🧀', desc: 'Queijo derretendo, montagem final.',          eta: 5  },
  { id: 'saiu_entrega',  label: 'Saiu para Entrega', icon: '🏍️', desc: 'A moto já saiu. Falta pouco!',               eta: 15 },
  { id: 'entregue',      label: 'Entregue!',         icon: '🎉', desc: 'Chegou! Bom apetite. ⭐ Avalie no iFood.',   eta: 0  },
];

function getStepIndex(status) {
  return STEPS.findIndex(s => s.id === status);
}

/* ── Confetti ────────────────────────────────────────────────── */
function Confetti() {
  const colors = ['#EA580C','#F97316','#D97706','#F59E0B','#4ade80','#60a5fa','#f472b6'];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    dur: 2.5 + Math.random() * 1.5,
    size: 6 + Math.random() * 8,
    rot: Math.random() * 360,
  }));
  return (
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size, height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/* ── ETA counter ─────────────────────────────────────────────── */
function useEta(minutes) {
  const [secs, setSecs] = useState(minutes * 60);
  useEffect(() => {
    if (secs <= 0) return;
    const iv = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, []);
  const m = Math.floor(secs / 60), s = secs % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(m)}:${pad(s)}`;
}

/* ── SearchForm ──────────────────────────────────────────────── */
function SearchForm({ onFound }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const id = val.trim().toUpperCase();
    if (!id) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`/api/pedido?id=${encodeURIComponent(id)}`);
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Pedido não encontrado'); }
      const order = await r.json();
      onFound(order);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="pedido-search-wrap">
      <div className="eyebrow">Rastreamento</div>
      <h1 className="section-title" style={{fontSize:'clamp(32px,6vw,60px)',marginBottom:14}}>
        ONDE ESTÁ<br /><em>SEU PEDIDO?</em>
      </h1>
      <p className="section-sub" style={{marginBottom:32}}>
        Digite o código de 6 letras que enviamos no WhatsApp.
      </p>
      <form onSubmit={handleSubmit} className="pedido-search-form" aria-label="Buscar pedido">
        <input
          className="pedido-search-input"
          type="text"
          inputMode="text"
          maxLength={6}
          placeholder="ABC123"
          value={val}
          onChange={e => setVal(e.target.value.toUpperCase())}
          aria-label="Código do pedido"
          autoFocus
          autoComplete="off"
        />
        <button className="btn btn-primary btn-lg" type="submit" disabled={loading || val.length < 4}>
          {loading ? 'Buscando...' : 'VER STATUS →'}
        </button>
      </form>
      {err && <p className="pedido-search-err" role="alert">{err}</p>}
    </div>
  );
}

/* ── StepIcon ────────────────────────────────────────────────── */
function StepIcon({ step, state }) {
  return (
    <div className={`pedido-step-icon pedido-step-icon--${state}`} aria-hidden="true">
      {state === 'done' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <span className="pedido-step-emoji">{step.icon}</span>
      )}
    </div>
  );
}

/* ── OrderTracker ────────────────────────────────────────────── */
function OrderTracker({ initialOrder }) {
  const [order,   setOrder]   = useState(initialOrder);
  const [prevStatus, setPrev] = useState(null);
  const [celebrate, setCelebrate] = useState(initialOrder.status === 'entregue');
  const pollRef = useRef(null);

  const currentIdx = getStepIndex(order.status);
  const currentStep = STEPS[currentIdx] || STEPS[0];
  const etaMinutes  = STEPS.slice(currentIdx + 1).reduce((s, st) => s + st.eta, 0);
  const eta = useEta(etaMinutes);

  useEffect(() => {
    if (order.status === 'entregue') return;
    async function poll() {
      try {
        const r = await fetch(`/api/pedido?id=${encodeURIComponent(order.id)}`);
        if (!r.ok) return;
        const fresh = await r.json();
        if (fresh.status !== order.status) {
          setPrev(order.status);
          setOrder(fresh);
          if (fresh.status === 'entregue') setCelebrate(true);
        }
      } catch {}
    }
    pollRef.current = setInterval(poll, 30000);
    return () => clearInterval(pollRef.current);
  }, [order.id, order.status]);

  const trackUrl = `${window.location.origin}/pedido.html?id=${order.id}`;

  function copyLink() {
    navigator.clipboard.writeText(trackUrl).catch(() => {});
  }

  return (
    <div className="pedido-tracker-wrap">
      {celebrate && <Confetti />}

      {/* Header */}
      <div className="pedido-header" data-reveal>
        <div className="eyebrow">Pedido #{order.id}</div>
        <h1 className="section-title" style={{fontSize:'clamp(32px,5.5vw,56px)',marginBottom:10}}>
          {currentStep.label}
        </h1>
        <p className="section-sub">{currentStep.desc}</p>
        {order.status !== 'entregue' && etaMinutes > 0 && (
          <div className="pedido-eta" aria-live="polite">
            <span className="pedido-eta-label">ETA</span>
            <span className="pedido-eta-time">{eta}</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="pedido-timeline" role="list" aria-label="Progresso do pedido">
        {STEPS.map((step, i) => {
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
          return (
            <div key={step.id} className={`pedido-step pedido-step--${state}`} role="listitem" data-reveal data-delay={String(i + 1)}>
              <div className="pedido-step-left">
                <StepIcon step={step} state={state} />
                {i < STEPS.length - 1 && (
                  <div className={`pedido-step-line pedido-step-line--${i < currentIdx ? 'done' : 'pending'}`} aria-hidden="true" />
                )}
              </div>
              <div className="pedido-step-content">
                <div className="pedido-step-name">{step.label}</div>
                {state === 'active' && <div className="pedido-step-desc">{step.desc}</div>}
                {state === 'active' && step.id === 'na_chapa' && (
                  <div className="pedido-chapa-pulse" aria-hidden="true">🔥🔥🔥</div>
                )}
                {state === 'active' && step.id === 'saiu_entrega' && (
                  <div className="pedido-moto-anim" aria-hidden="true">🏍️ 💨</div>
                )}
              </div>
              {state === 'done' && order.history?.find(h => h.status === step.id) && (
                <div className="pedido-step-time">
                  {new Date(order.history.find(h => h.status === step.id).ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compartilhar */}
      <div className="pedido-share" data-reveal>
        <p style={{fontFamily:'var(--f-m)',fontSize:11,color:'var(--ink-mute)',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:10}}>
          Compartilhe o link do rastreio
        </p>
        <div className="pedido-share-row">
          <code className="pedido-share-link">{trackUrl}</code>
          <button className="btn btn-outline btn-sm" onClick={copyLink} aria-label="Copiar link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copiar
          </button>
        </div>
      </div>

      {order.status === 'entregue' && (
        <div className="pedido-done-cta" data-reveal>
          <h2 className="section-title" style={{fontSize:'clamp(28px,4vw,48px)'}}>
            BOM<br /><em>APETITE!</em>
          </h2>
          <p className="section-sub" style={{marginBottom:28}}>
            Gostou? Avalie a Sanka no iFood e Google. Isso nos ajuda muito!
          </p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            <a href={`https://wa.me/${SANKA_CONFIG.whatsapp}?text=${encodeURIComponent('Olá! Quero fazer outro pedido. 🍔')}`} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              PEDIR DE NOVO
            </a>
            <a href="cardapio.html" className="btn btn-outline">Ver Cardápio</a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────── */
function PedidoApp() {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      fetch(`/api/pedido?id=${encodeURIComponent(id.toUpperCase())}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setOrder(data);
            if (window.SankaAnalytics) SankaAnalytics.trackOrder(data.id);
          }
        })
        .catch(() => {});
    }
  }, []);

  function useScrollReveal() {
    useEffect(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
      return () => io.disconnect();
    });
  }
  useScrollReveal();

  return (
    <>
      <nav className="nav scrolled" style={{position:'sticky',top:0}}>
        <div className="wrap nav-inner">
          <a href="index.html" className="nav-logo" aria-label="Sanka Burgers">
            <div className="nav-logo-mark" aria-hidden="true">S</div>
            <div className="nav-logo-name">SANKA<b>.</b></div>
          </a>
          <span className="nav-page-title">Rastrear Pedido</span>
          <a href="cardapio.html" className="btn btn-outline btn-sm">Cardápio</a>
        </div>
      </nav>
      <main className="pedido-main section">
        <div className="wrap" style={{maxWidth:640}}>
          {!order
            ? <SearchForm onFound={setOrder} />
            : <OrderTracker initialOrder={order} />
          }
        </div>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PedidoApp />);
