// monte-app.jsx — Monte Seu Burger · Sanka Burgers

import { SANKA_CONFIG } from './lib/config.js'

const { useState, useEffect, useRef, useMemo } = React;

/* ── Dados ───────────────────────────────────────────────────── */
const BASE_PRICE = 22;

const BREAD_OPTS = [
  { id: 'brioche',     label: 'Brioche',           note: 'Incluso', price: 0 },
  { id: 'australiano', label: 'Australiano',        note: 'Incluso', price: 0 },
  { id: 'lowcarb',     label: 'Sem Pão (Low Carb)', note: 'Incluso', price: 0 },
];
const MEAT_OPTS = [
  { id: 'blend120', label: 'Blend 120g',        note: 'Incluso', price: 0 },
  { id: 'blend150', label: 'Blend 150g',        note: '+R$ 4',   price: 4 },
  { id: 'duplo',    label: 'Duplo 120+120g',    note: '+R$ 9',   price: 9 },
  { id: 'frango',   label: 'Frango Grelhado',   note: 'Incluso', price: 0 },
  { id: 'vegetal',  label: 'Hambúrguer Vegetal',note: 'Incluso', price: 0 },
];
const CHEESE_OPTS = [
  { id: 'none',      label: 'Sem Queijo',  note: '',        price: 0 },
  { id: 'prato',     label: 'Prato',       note: 'Incluso', price: 0 },
  { id: 'cheddar',   label: 'Cheddar',     note: '+R$ 1',   price: 1 },
  { id: 'provolone', label: 'Provolone',   note: '+R$ 2',   price: 2 },
  { id: 'mussarela', label: 'Mussarela',   note: '+R$ 1',   price: 1 },
  { id: 'catupiry',  label: 'Catupiry',    note: '+R$ 3',   price: 3 },
];
const TOPPING_OPTS = [
  { id: 'bacon',    label: 'Bacon',               note: '+R$ 5',  price: 5, emoji: '🥓' },
  { id: 'ovo',      label: 'Ovo',                 note: '+R$ 3',  price: 3, emoji: '🍳' },
  { id: 'cebola',   label: 'Cebola Caramelizada', note: '+R$ 3',  price: 3, emoji: '🧅' },
  { id: 'picles',   label: 'Picles',              note: '+R$ 2',  price: 2, emoji: '🥒' },
  { id: 'alface',   label: 'Alface',              note: 'Grátis', price: 0, emoji: '🥬' },
  { id: 'tomate',   label: 'Tomate',              note: 'Grátis', price: 0, emoji: '🍅' },
  { id: 'rucula',   label: 'Rúcula',              note: 'Grátis', price: 0, emoji: '🌿' },
  { id: 'biquinho', label: 'Biquinho',            note: '+R$ 3',  price: 3, emoji: '🌶️' },
  { id: 'abacaxi',  label: 'Abacaxi',             note: '+R$ 3',  price: 3, emoji: '🍍' },
];
const SAUCE_OPTS = [
  { id: 'maionese', label: 'Maionese da Casa' },
  { id: 'bbq',      label: 'Barbecue'         },
  { id: 'mostarda', label: 'Mostarda & Mel'   },
  { id: 'picante',  label: 'Molho Picante'    },
  { id: 'rose',     label: 'Rosé'             },
  { id: 'verde',    label: 'Molho Verde'      },
];

/* ── Gamificação ─────────────────────────────────────────────── */
const VIBES = [
  "Monte seu burger perfeito.",
  "Boa escolha.",
  "Tá ficando bom...",
  "Agora sim.",
  "Calma aí, gigante.",
  "Você é doido? 🔥",
];

/* ── URL sharing ─────────────────────────────────────────────── */
function buildShareUrl(bread, meat, cheese, toppings, sauce) {
  const params = new URLSearchParams({
    pao:     bread,
    carne:   meat,
    queijo:  cheese,
    toppings: toppings.join(','),
    molho:   sauce,
  });
  return `${window.location.origin}/monte.html?${params}`;
}

function parseShareUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    const valid = id => typeof id === 'string' && id.length > 0;
    const bread  = BREAD_OPTS.find(b => b.id === p.get('pao'))?.id   || 'brioche';
    const meat   = MEAT_OPTS.find(m => m.id === p.get('carne'))?.id  || 'blend120';
    const cheese = CHEESE_OPTS.find(c => c.id === p.get('queijo'))?.id || 'none';
    const sauce  = SAUCE_OPTS.find(s => s.id === p.get('molho'))?.id  || 'maionese';
    const tops   = (p.get('toppings') || '').split(',').filter(t => TOPPING_OPTS.some(o => o.id === t));
    return { bread, meat, cheese, toppings: tops, sauce };
  } catch { return { bread: 'brioche', meat: 'blend120', cheese: 'none', toppings: [], sauce: 'maionese' }; }
}

/* ── Layers do burger ────────────────────────────────────────── */
function buildLayers(bread, meat, cheese, toppings, sauce) {
  const layers = [];

  layers.push({ id: 'bread-top', type: `bread-top bread-${bread}`, label: BREAD_OPTS.find(b => b.id === bread)?.label });

  if (cheese && cheese !== 'none') {
    layers.push({ id: 'cheese', type: 'cheese', label: CHEESE_OPTS.find(c => c.id === cheese)?.label });
  }
  ['bacon', 'ovo', 'cebola'].forEach(id => {
    if (toppings.includes(id)) {
      layers.push({ id: `ht-${id}`, type: 'topping-hot', label: TOPPING_OPTS.find(o => o.id === id)?.label });
    }
  });

  layers.push({ id: 'meat', type: `meat meat-${meat}`, label: MEAT_OPTS.find(m => m.id === meat)?.label });

  ['alface', 'rucula', 'tomate', 'picles', 'biquinho', 'abacaxi'].forEach(id => {
    if (toppings.includes(id)) {
      layers.push({ id: `vt-${id}`, type: `topping-veg topping-${id}`, label: TOPPING_OPTS.find(o => o.id === id)?.label });
    }
  });

  if (sauce) {
    layers.push({ id: `sauce-${sauce}`, type: `sauce sauce-${sauce}`, label: SAUCE_OPTS.find(s => s.id === sauce)?.label });
  }

  if (bread === 'lowcarb') {
    layers.push({ id: 'bread-bot', type: 'lowcarb-bot', label: 'Wrap' });
  } else {
    layers.push({ id: 'bread-bot', type: `bread-bot bread-bot-${bread}`, label: '' });
  }

  return layers;
}

/* ── BurgerLayer ─────────────────────────────────────────────── */
function BurgerLayer({ layer, idx }) {
  return (
    <div className={`blayer blayer--${layer.type}`} style={{ '--i': idx }}>
      <div className="blayer-inner">
        {layer.label && <span className="blayer-text">{layer.label}</span>}
      </div>
    </div>
  );
}

/* ── BurgerVisual ────────────────────────────────────────────── */
function BurgerVisual({ bread, meat, cheese, toppings, sauce, compact }) {
  const layers = buildLayers(bread, meat, cheese, toppings, sauce);
  const [rev, setRev] = useState(0);

  const prevMeat  = useRef(meat);
  const prevBread = useRef(bread);
  useEffect(() => {
    if (meat !== prevMeat.current || bread !== prevBread.current) {
      setRev(r => r + 1);
      prevMeat.current  = meat;
      prevBread.current = bread;
    }
  }, [meat, bread]);

  return (
    <div className={`burger-visual-wrap${compact ? ' is-compact' : ''}`} role="img" aria-label="Visualização do seu burger">
      <div className="burger-stack" key={rev}>
        {layers.map((layer, idx) => (
          <BurgerLayer key={layer.id} layer={layer} idx={idx} />
        ))}
      </div>
    </div>
  );
}

/* ── Step accordion ──────────────────────────────────────────── */
function Step({ number, title, summary, isOpen, isDone, onToggle, children }) {
  return (
    <div className={`builder-step${isOpen ? ' is-open' : ''}${isDone ? ' is-done' : ''}`}>
      <button className="builder-step-head" onClick={onToggle} aria-expanded={isOpen}>
        <div className="builder-step-num" aria-hidden="true">
          {isDone
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : number
          }
        </div>
        <div className="builder-step-info">
          <span className="builder-step-title">{title}</span>
          {(isDone || isOpen) && summary && (
            <span className="builder-step-summary">{summary}</span>
          )}
        </div>
        <svg className="builder-step-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {isOpen && <div className="builder-step-body">{children}</div>}
    </div>
  );
}

/* ── Opção radio ─────────────────────────────────────────────── */
function RadioOpt({ opt, selected, onSelect }) {
  return (
    <button className={`builder-opt${selected ? ' is-selected' : ''}`} onClick={() => onSelect(opt.id)}>
      <span className="builder-opt-label">{opt.label}</span>
      {opt.note && <span className="builder-opt-note">{opt.note}</span>}
    </button>
  );
}

/* ── Opção toggle (toppings) ─────────────────────────────────── */
function ToggleOpt({ opt, selected, onToggle }) {
  return (
    <button className={`builder-opt builder-opt--toggle${selected ? ' is-selected' : ''}`} onClick={() => onToggle(opt.id)}>
      <span className="builder-opt-emoji" aria-hidden="true">{opt.emoji}</span>
      <div className="builder-opt-info">
        <span className="builder-opt-label">{opt.label}</span>
        <span className="builder-opt-note">{opt.note}</span>
      </div>
      {selected && (
        <svg className="builder-opt-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  );
}

/* ── PriceCard ───────────────────────────────────────────────── */
function PriceCard({ meat, cheese, toppings, total, onOrder }) {
  const meatOpt   = MEAT_OPTS.find(m => m.id === meat);
  const cheeseOpt = CHEESE_OPTS.find(c => c.id === cheese);

  const extras = [];
  if (meatOpt?.price > 0) extras.push({ label: meatOpt.label, price: meatOpt.price });
  if (cheese !== 'none' && cheeseOpt?.price > 0) extras.push({ label: cheeseOpt.label, price: cheeseOpt.price });
  toppings.forEach(t => {
    const opt = TOPPING_OPTS.find(o => o.id === t);
    if (opt?.price > 0) extras.push({ label: opt.label, price: opt.price });
  });

  return (
    <div className="monte-price-card">
      <div className="monte-price-breakdown">
        <div className="monte-price-row">
          <span>Base</span>
          <span>R$ 22,00</span>
        </div>
        {extras.map(e => (
          <div key={e.label} className="monte-price-row">
            <span>{e.label}</span>
            <span>+R$ {e.price.toFixed(2).replace('.', ',')}</span>
          </div>
        ))}
      </div>
      <div className="monte-price-total">
        <span>Total</span>
        <span className="monte-price-val" aria-live="polite">R$ {total.toFixed(2).replace('.', ',')}</span>
      </div>
      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={onOrder}>
        MONTAR PEDIDO
      </button>
    </div>
  );
}

/* ── SummaryModal ────────────────────────────────────────────── */
function SummaryModal({ bread, meat, cheese, toppings, sauce, total, onClose }) {
  const [copied, setCopied] = useState(false);

  const breadOpt    = BREAD_OPTS.find(b => b.id === bread);
  const meatOpt     = MEAT_OPTS.find(m => m.id === meat);
  const cheeseOpt   = CHEESE_OPTS.find(c => c.id === cheese);
  const sauceOpt    = SAUCE_OPTS.find(s => s.id === sauce);
  const toppingLabels = toppings.map(t => TOPPING_OPTS.find(o => o.id === t)?.label).filter(Boolean);

  const waLines = [
    `🍔 *MONTE SEU BURGER — SANKA*`,
    ``,
    `• Pão: ${breadOpt?.label}`,
    `• Carne: ${meatOpt?.label}`,
    cheese !== 'none' ? `• Queijo: ${cheeseOpt?.label}` : null,
    toppingLabels.length ? `• Toppings: ${toppingLabels.join(', ')}` : null,
    `• Molho: ${sauceOpt?.label}`,
    ``,
    `💰 Total: R$ ${total.toFixed(2).replace('.', ',')}`,
  ].filter(l => l !== null).join('\n');

  const waUrl = `https://wa.me/${SANKA_CONFIG.whatsapp}?text=${encodeURIComponent(waLines)}`;

  function handleShare() {
    const url = buildShareUrl(bread, meat, cheese, toppings, sauce);
    if (navigator.share) {
      navigator.share({ title: 'Meu Burger — Sanka Burgers', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }).catch(() => {});
    }
  }

  const rows = [
    { label: 'Pão',      value: breadOpt?.label },
    { label: 'Carne',    value: meatOpt?.label },
    cheese !== 'none'       ? { label: 'Queijo',    value: cheeseOpt?.label } : null,
    toppingLabels.length    ? { label: 'Toppings',  value: toppingLabels.join(', ') } : null,
    { label: 'Molho',    value: sauceOpt?.label },
  ].filter(Boolean);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Resumo do pedido">
      <div className="summary-modal">
        <button className="summary-modal-close" onClick={onClose} aria-label="Fechar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="summary-header">
          <div className="eyebrow">Seu Burger</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(26px, 5vw, 40px)', marginBottom: 4 }}>
            PRONTO PARA<br /><em>PEDIR?</em>
          </h2>
        </div>

        <div className="summary-list">
          {rows.map(row => (
            <div key={row.label} className="summary-row">
              <span className="summary-row-label">{row.label}</span>
              <span className="summary-row-value">{row.value}</span>
            </div>
          ))}
          <div className="summary-row summary-row--total">
            <span className="summary-row-label">Total</span>
            <span className="summary-row-total-val">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="summary-actions">
          <a href={waUrl} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              if (window.SankaAnalytics) {
                const summary = rows.map(r => r.value).join(' + ');
                SankaAnalytics.buildBurger(total, summary);
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            PEDIR AGORA
          </a>
          <button className="btn btn-outline btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={handleShare}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {copied ? '✓ Link copiado!' : 'COMPARTILHAR'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────── */
function MonteApp() {
  const initial = parseShareUrl();

  const [step,        setStep]        = useState(0);
  const [bread,       setBread]       = useState(initial.bread);
  const [meat,        setMeat]        = useState(initial.meat);
  const [cheese,      setCheese]      = useState(initial.cheese);
  const [toppings,    setToppings]    = useState(initial.toppings);
  const [sauce,       setSauce]       = useState(initial.sauce);
  const [showSummary, setShowSummary] = useState(false);

  const total = useMemo(() => {
    const mp = MEAT_OPTS.find(m => m.id === meat)?.price     || 0;
    const cp = CHEESE_OPTS.find(c => c.id === cheese)?.price || 0;
    const tp = toppings.reduce((s, t) => s + (TOPPING_OPTS.find(o => o.id === t)?.price || 0), 0);
    return BASE_PRICE + mp + cp + tp;
  }, [meat, cheese, toppings]);

  const vibe = VIBES[Math.min(toppings.length, VIBES.length - 1)];

  function toggleTopping(id) {
    setToppings(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }
  function pickBread(id)  { setBread(id);  setTimeout(() => setStep(1), 220); }
  function pickMeat(id)   { setMeat(id);   setTimeout(() => setStep(2), 220); }
  function pickCheese(id) { setCheese(id); setTimeout(() => setStep(3), 220); }
  function pickSauce(id)  { setSauce(id);  setTimeout(() => setStep(4), 220); }

  const stepSummaries = [
    BREAD_OPTS.find(b => b.id === bread)?.label,
    MEAT_OPTS.find(m => m.id === meat)?.label,
    CHEESE_OPTS.find(c => c.id === cheese)?.label,
    toppings.length ? `${toppings.length} adicionado${toppings.length > 1 ? 's' : ''}` : 'Nenhum',
    SAUCE_OPTS.find(s => s.id === sauce)?.label,
  ];

  const WA = `https://wa.me/${SANKA_CONFIG.whatsapp}?text=${encodeURIComponent('Olá! Quero fazer um pedido. 🍔')}`;

  return (
    <>
      {/* Navegação */}
      <nav className="nav scrolled" style={{ position: 'sticky', top: 0 }}>
        <div className="wrap nav-inner">
          <a href="index.html" className="nav-logo" aria-label="Sanka Burgers — início">
            <div className="nav-logo-mark" aria-hidden="true">S</div>
            <div className="nav-logo-name">SANKA<b>.</b></div>
          </a>
          <span className="nav-page-title">Monte Seu Burger</span>
          <a href="cardapio.html" className="btn btn-outline btn-sm">Cardápio</a>
        </div>
      </nav>

      <main className="monte-main">
        <div className="wrap">

          {/* Título / vibe */}
          <div className="monte-vibe-wrap">
            <p className="monte-vibe" aria-live="polite" aria-atomic="true">{vibe}</p>
            <p className="monte-base-label">A partir de R$ 22,00 · Blend artesanal de acém, peito e costela</p>
          </div>

          <div className="monte-layout">

            {/* Coluna esquerda — burger visual (desktop) */}
            <div className="monte-visual-col">
              <div className="monte-visual-sticky">
                <BurgerVisual bread={bread} meat={meat} cheese={cheese} toppings={toppings} sauce={sauce} />
                <PriceCard meat={meat} cheese={cheese} toppings={toppings} total={total} onOrder={() => setShowSummary(true)} />
              </div>
            </div>

            {/* Coluna direita — builder */}
            <div className="monte-builder-col">

              {/* Mobile: burger compacto acima do builder */}
              <div className="monte-mobile-burger">
                <BurgerVisual bread={bread} meat={meat} cheese={cheese} toppings={toppings} sauce={sauce} compact />
              </div>

              <div className="builder-steps" role="list">

                <Step number={1} title="Pão" summary={stepSummaries[0]}
                  isOpen={step === 0} isDone={step > 0}
                  onToggle={() => setStep(step === 0 ? -1 : 0)}>
                  <div className="builder-opts">
                    {BREAD_OPTS.map(opt => (
                      <RadioOpt key={opt.id} opt={opt} selected={bread === opt.id} onSelect={pickBread} />
                    ))}
                  </div>
                </Step>

                <Step number={2} title="Carne" summary={stepSummaries[1]}
                  isOpen={step === 1} isDone={step > 1}
                  onToggle={() => setStep(step === 1 ? -1 : 1)}>
                  <div className="builder-opts">
                    {MEAT_OPTS.map(opt => (
                      <RadioOpt key={opt.id} opt={opt} selected={meat === opt.id} onSelect={pickMeat} />
                    ))}
                  </div>
                </Step>

                <Step number={3} title="Queijo" summary={stepSummaries[2]}
                  isOpen={step === 2} isDone={step > 2}
                  onToggle={() => setStep(step === 2 ? -1 : 2)}>
                  <div className="builder-opts">
                    {CHEESE_OPTS.map(opt => (
                      <RadioOpt key={opt.id} opt={opt} selected={cheese === opt.id} onSelect={pickCheese} />
                    ))}
                  </div>
                </Step>

                <Step number={4} title="Toppings" summary={stepSummaries[3]}
                  isOpen={step === 3} isDone={step > 3}
                  onToggle={() => setStep(step === 3 ? -1 : 3)}>
                  <div className="builder-opts builder-opts--toppings">
                    {TOPPING_OPTS.map(opt => (
                      <ToggleOpt key={opt.id} opt={opt} selected={toppings.includes(opt.id)} onToggle={toggleTopping} />
                    ))}
                  </div>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => setStep(4)}>
                    Continuar para Molho →
                  </button>
                </Step>

                <Step number={5} title="Molho" summary={stepSummaries[4]}
                  isOpen={step === 4} isDone={false}
                  onToggle={() => setStep(step === 4 ? -1 : 4)}>
                  <div className="builder-opts">
                    {SAUCE_OPTS.map(opt => (
                      <RadioOpt key={opt.id} opt={opt} selected={sauce === opt.id} onSelect={pickSauce} />
                    ))}
                  </div>
                  <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowSummary(true)}>
                      MONTAR PEDIDO — R$ {total.toFixed(2).replace('.', ',')}
                    </button>
                  </div>
                </Step>

              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile CTA fixo */}
      <div className="monte-mobile-cta" aria-label="Total e ação do pedido">
        <div>
          <div className="monte-mobile-price-label">Total</div>
          <div className="monte-mobile-price" aria-live="polite">R$ {total.toFixed(2).replace('.', ',')}</div>
        </div>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowSummary(true)}>
          MONTAR PEDIDO
        </button>
      </div>

      {/* Modal de resumo */}
      {showSummary && (
        <SummaryModal
          bread={bread} meat={meat} cheese={cheese} toppings={toppings} sauce={sauce}
          total={total}
          onClose={() => setShowSummary(false)}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MonteApp />);
