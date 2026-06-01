// sections.jsx — Sanka Burgers
// Home focada em conversão · Mobile-first · Etapa 3

import { FoodPlaceholder } from './placeholders.jsx'
import { SANKA_BURGERS } from './data.jsx'
import { SANKA_CONFIG } from './lib/config.js'

const { useState, useEffect, useRef } = React;

/* ── Ícones inline SVG ──────────────────────────────────────── */
function IcoWA() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
function IcoPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  );
}
function IcoClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IcoPhone() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.18a16 16 0 006.91 6.91l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}
function IcoIG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}
function IcoArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="2" y1="7" x2="12" y2="7"/><polyline points="8 3 12 7 8 11"/>
    </svg>
  );
}
function IcoMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function IcoX() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function waLink(msg) {
  const num = SANKA_CONFIG.whatsapp;
  return msg
    ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg)
    : 'https://wa.me/' + num;
}

/* ── Destaques data ──────────────────────────────────────────── */
const FEATURED_CODES  = ['SB-003', 'SB-004', 'SB-015'];
const FEATURED_CENTER = 'SB-004';
const FEATURED_BADGE  = {
  'SB-003': { text: 'Clássico',    variant: 'badge-hot'  },
  'SB-004': { text: 'Mais Pedido', variant: 'badge-hot'  },
  'SB-015': { text: 'Assinatura',  variant: 'badge-gold' },
};

/* ── Reviews ─────────────────────────────────────────────────── */
const REVIEWS = [
  { text: "Melhor hambúrguer que já comi em Rio Claro. O X Panceta é absurdo de bom.", name: "Mariana S.", meta: "iFood · Cliente recorrente", stars: 5 },
  { text: "Pedi uma vez e virei viciado. A carne é completamente diferente do fast-food.", name: "Diego R.", meta: "Google · 5 estrelas", stars: 5 },
  { text: "X Provolone ao Mel mudou minha percepção de hambúrguer. Entrega rápida também.", name: "Camila A.", meta: "iFood · Primeira vez", stars: 5 },
];

/* ── Como funciona ───────────────────────────────────────────── */
const HOW_STEPS = [
  { num: "01", title: "Escolha seu lanche", desc: "17 opções no cardápio — dos clássicos aos autorais. Tem sempre algo novo pra experimentar." },
  { num: "02", title: "Peça pelo WhatsApp", desc: "Sem aplicativo, sem cadastro. Só manda a mensagem. Confirmamos o pedido em segundos." },
  { num: "03", title: "Receba em 35 min", desc: "Saiu da chapa, foi pro entregador. Raio de 6 km coberto em até 35 minutos — garantido." },
];

/* ── Oferta Relâmpago: helpers ───────────────────────────────── */
const OFERTA_CODES = ['SB-004','SB-007','SB-012','SB-003','SB-009','SB-015','SB-001'];
function getSpHour() { return ((new Date().getUTCHours() - 3 + 24) % 24); }
function getSpDow()  { const h = new Date().getUTCHours(); const d = new Date().getUTCDay(); return h < 3 ? (d - 1 + 7) % 7 : d; }
function isOfertaAtiva() { const h = getSpHour(); return h >= 19 && h < 22; }
function getOfertaTargetTs(spH) {
  const t = new Date(); t.setUTCHours((spH + 3) % 24, 0, 0, 0);
  if (t.getTime() <= Date.now()) t.setUTCDate(t.getUTCDate() + 1);
  return t.getTime();
}
function _ofertaStore() {
  const d = new Date().toISOString().slice(0, 10);
  try { return JSON.parse(localStorage.getItem('sk-oferta') || '{}'); } catch { return {}; }
}
function getOfertaRemaining() {
  const d = new Date().toISOString().slice(0, 10); const s = _ofertaStore();
  if (s.date !== d) { try { localStorage.setItem('sk-oferta', JSON.stringify({date:d,n:30})); } catch{} return 30; }
  return typeof s.n === 'number' ? s.n : 30;
}
function decrementOfertaRemaining() {
  const d = new Date().toISOString().slice(0, 10); const s = _ofertaStore();
  const n = s.date === d ? Math.max(0, s.n - 1) : 29;
  try { localStorage.setItem('sk-oferta', JSON.stringify({date:d,n})); } catch{}
  return n;
}
function useOfertaCountdown(targetTs) {
  const [ms, setMs] = useState(Math.max(0, targetTs - Date.now()));
  useEffect(() => { const iv = setInterval(() => setMs(Math.max(0, targetTs - Date.now())), 1000); return () => clearInterval(iv); }, [targetTs]);
  const s = Math.floor(ms / 1000); const pad = n => String(n).padStart(2, '0');
  return { hh: pad(Math.floor(s / 3600)), mm: pad(Math.floor((s % 3600) / 60)), ss: pad(s % 60) };
}

/* ── Animated counter hook ───────────────────────────────────── */
function useCounter(target, active, duration) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    let raf;
    function tick() {
      const p = Math.min((Date.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

/* ═══════════════════════════════════════════════════════════════
   1. NAVEGAÇÃO
═══════════════════════════════════════════════════════════════ */
function Nav() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    h();
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);
  const WA = waLink('Olá! Quero fazer um pedido. 🍔');

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`} aria-label="Navegação principal">
        <div className="wrap nav-inner">
          <a href="#" className="nav-logo" aria-label="Sanka Burgers — início">
            <div className="nav-logo-mark" aria-hidden="true">S</div>
            <div className="nav-logo-name">SANKA<b>.</b></div>
          </a>

          <div className="nav-links" role="list">
            <a href="cardapio.html"   role="listitem">Cardápio</a>
            <a href="nossa-carne.html" role="listitem">Nossa Carne</a>
            <a href="#como-funciona"  role="listitem">Como Pedir</a>
            <a href="#localizacao"    role="listitem">Localização</a>
          </div>

          <div className="nav-right-group">
            <a href={WA} className="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer">
              <IcoWA />
              <span className="nav-cta-label">PEDIR</span>
            </a>
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              aria-controls="nav-drawer"
            >
              {menuOpen ? <IcoX /> : <IcoMenu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      <div
        className={`nav-drawer-overlay${menuOpen ? ' is-open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer lateral */}
      <aside
        id="nav-drawer"
        className={`nav-drawer${menuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-label="Menu de navegação"
        aria-modal="true"
      >
        <div className="nav-drawer-head">
          <span className="nav-logo-name" style={{ fontSize: 22 }}>SANKA<b style={{ color: 'var(--fire)' }}>.</b></span>
          <button className="nav-drawer-close" onClick={close} aria-label="Fechar menu"><IcoX /></button>
        </div>
        <nav className="nav-drawer-links" aria-label="Links do menu">
          <a href="cardapio.html"    onClick={close}>Cardápio</a>
          <a href="nossa-carne.html" onClick={close}>Nossa Carne</a>
          <a href="#como-funciona"   onClick={close}>Como Pedir</a>
          <a href="#localizacao"     onClick={close}>Localização</a>
          <a href="#clube"           onClick={close}>Clube Sanka</a>
        </nav>
        <div style={{ padding: '0 24px 32px' }}>
          <a href={WA} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} target="_blank" rel="noopener noreferrer">
            <IcoWA /> PEDIR AGORA
          </a>
        </div>
      </aside>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. HERO
═══════════════════════════════════════════════════════════════ */
function Hero() {
  const bgRef = useRef(null);
  const WA    = waLink('Olá! Quero fazer um pedido. 🍔');

  useEffect(() => {
    const onScroll = () => {
      if (bgRef.current) {
        bgRef.current.style.transform = `scale(1.06) translateY(${window.scrollY * 0.18}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="hero" id="hero">
      <div className="hero-bg" aria-hidden="true" ref={bgRef}>
        <FoodPlaceholder
          label="Hero"
          sub="X PROVOLONE AO MEL"
          tags="cheeseburger,gourmet,burger,food,dark"
          mood={2}
          seed={42}
          src="/assets/burgers/sb-004.png"
          eager
          priority
        />
      </div>
      <div className="hero-overlay" aria-hidden="true" />

      <div className="wrap hero-content">
        <div className="hero-eyebrow">
          <span className="dot" aria-hidden="true" />
          Rio Claro / SP · Aberto agora · ★ 4.9 iFood
        </div>

        <h1>
          HAMBÚRGUER<br />
          <span className="accent">DE VERDADE.</span>
        </h1>

        <p className="hero-sub">
          Blend artesanal de acém, peito e costela.
          Moído todo dia. Pão da padaria local.
          Sem industrial. <strong>Nunca.</strong>
        </p>

        <div className="hero-ctas">
          <a href={WA} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer">
            <IcoWA />
            PEDIR AGORA
          </a>
          <a href="cardapio.html" className="btn btn-outline btn-lg">
            VER CARDÁPIO
            <IcoArrow />
          </a>
        </div>

        <div className="hero-proof" aria-label="Estatísticas">
          <div className="hero-proof-item">
            <span className="val">★ 4.9</span>
            <span className="lbl">iFood · Google</span>
          </div>
          <div className="hero-proof-item">
            <span className="val">35 min</span>
            <span className="lbl">Entrega média</span>
          </div>
          <div className="hero-proof-item">
            <span className="val">+4 mil</span>
            <span className="lbl">Pedidos/mês</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="scroll-indicator" aria-hidden="true">
        <div className="scroll-dot" />
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. DESTAQUES
═══════════════════════════════════════════════════════════════ */
function Destaques() {
  const items = FEATURED_CODES
    .map(code => SANKA_BURGERS.find(b => b.code === code))
    .filter(Boolean);

  return (
    <section className="section" id="cardapio" aria-labelledby="dest-title">
      <div className="wrap">
        <div className="featured-head">
          <div>
            <div className="eyebrow">Nossos Destaques</div>
            <h2 id="dest-title" className="section-title">
              Os que mais<br /><em>viciam.</em>
            </h2>
          </div>
          <a href="cardapio.html" className="btn btn-outline" style={{ alignSelf: 'flex-end' }}>
            Cardápio Completo <IcoArrow />
          </a>
        </div>

        <div className="featured-grid">
          {items.map((burger, idx) => {
            const isCenter  = burger.code === FEATURED_CENTER;
            const badgeInfo = FEATURED_BADGE[burger.code];
            return (
              <article
                key={burger.code}
                className={`fcard${isCenter ? ' is-featured' : ''}`}
                data-reveal
                data-delay={String(idx + 1)}
              >
                <div className="fcard-media">
                  <FoodPlaceholder
                    label={burger.name}
                    tags={burger.tags}
                    mood={idx + 1}
                    seed={100 + idx}
                    src={burger.src}
                    eager
                    priority
                  />
                  <div className="fcard-badges" aria-hidden="true">
                    {badgeInfo && <span className={`badge ${badgeInfo.variant}`}>{badgeInfo.text}</span>}
                    <span style={{ fontFamily: 'var(--f-m)', fontSize: 10, color: 'var(--ink-mute)', background: 'rgba(10,10,10,0.7)', padding: '4px 8px', borderRadius: 6, backdropFilter: 'blur(8px)', letterSpacing: '0.14em' }}>
                      {burger.code}
                    </span>
                  </div>
                </div>

                <div className="fcard-body">
                  <h3>{burger.name}</h3>
                  <p>{burger.desc}</p>
                  <div className="fcard-foot">
                    <div className="fcard-price" aria-label={`R$ ${burger.price.toFixed(2).replace('.', ',')}`}>
                      <span className="cur">R$</span>
                      {burger.price.toFixed(2).replace('.', ',')}
                    </div>
                    <a href={`cardapio.html#${burger.code.toLowerCase()}`} className="add-btn" aria-label={`Ver ${burger.name} no cardápio`}>
                      Pedir <IcoArrow />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. PROVA ARTESANAL (com contadores animados)
═══════════════════════════════════════════════════════════════ */
function ProvaArtesanal() {
  const [active, setActive] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); io.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const grams = useCounter(200, active, 1200);
  const pct   = useCounter(100, active, 1500);

  return (
    <section className="prova" ref={ref} aria-labelledby="prova-title">
      <h2 id="prova-title" className="sr-only">Por que a Sanka é diferente</h2>
      <div className="prova-grid">

        <div className="prova-item" data-reveal>
          <div className="prova-num" aria-live="polite">{grams}<span className="prova-unit">g</span></div>
          <h3>Carne moída no dia</h3>
          <p>Blend exclusivo de acém, peito e costela. Compramos o corte inteiro e moemos na casa — todo dia, antes de abrir.</p>
        </div>

        <div className="prova-item prova-zero" data-reveal data-delay="2">
          <div className="prova-num">0</div>
          <h3>Hambúrguer industrial</h3>
          <p className="prova-never-text">Nunca.</p>
          <p>Nenhum dos nossos lanches leva hambúrguer de pacote. Essa é a única regra que não muda.</p>
        </div>

        <div className="prova-item" data-reveal data-delay="4">
          <div className="prova-num" aria-live="polite">{pct}<span className="prova-unit">%</span></div>
          <h3>Acém + Peito + Costela</h3>
          <p>Só cortes nobres, sem mistura industrial. O blend foi testado por meses até chegar no sabor e textura certos.</p>
        </div>

      </div>
      <div style={{ textAlign: 'center', marginTop: 52 }} data-reveal>
        <a href="nossa-carne.html" className="btn btn-outline btn-sm" style={{ gap: 8 }}>
          Por que nossa carne é diferente
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   5. MONTE SEU BURGER — CTA banner
═══════════════════════════════════════════════════════════════ */
function MonteBanner() {
  const WA = waLink('Olá! Quero montar um burger personalizado. 🍔');
  return (
    <section className="monte-banner" aria-label="Monte seu burger">
      <div className="wrap">
        <div className="monte-inner" data-reveal>
          <div className="monte-text">
            <div className="eyebrow">Personalize</div>
            <h2 className="section-title" style={{ color: '#fff' }}>
              MONTE<br /><em>SEU BURGER</em>
            </h2>
            <p style={{ color: 'rgba(245,239,230,0.65)', fontSize: 15, lineHeight: 1.65, maxWidth: 400 }}>
              Escolha a carne, o queijo, o molho, os adicionais.
              Do seu jeito. Na hora. Sem limite de criatividade.
            </p>
          </div>
          <a href={WA} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer">
            <IcoWA /> PEDIR AGORA
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   6. OFERTA RELÂMPAGO — 19h–22h SP, rotação semanal, countdown
═══════════════════════════════════════════════════════════════ */
function OfertaDia() {
  const [ativa,     setAtiva]     = useState(() => isOfertaAtiva());
  const [targetTs,  setTargetTs]  = useState(() => getOfertaTargetTs(isOfertaAtiva() ? 22 : 19));
  const [remaining, setRemaining] = useState(() => getOfertaRemaining());
  const cd = useOfertaCountdown(targetTs);

  useEffect(() => {
    function tick() {
      const a = isOfertaAtiva();
      setAtiva(a);
      setTargetTs(getOfertaTargetTs(a ? 22 : 19));
      if (a) setRemaining(getOfertaRemaining());
    }
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, []);

  if (!ativa) return null;

  const burger = SANKA_BURGERS.find(b => b.code === OFERTA_CODES[getSpDow()]);
  if (!burger) return null;

  const salePrice = (burger.price * 0.75).toFixed(2).replace('.', ',');
  const origPrice = burger.price.toFixed(2).replace('.', ',');

  function handlePedir() {
    const n = decrementOfertaRemaining();
    setRemaining(n);
    const msg = `Olá! Quero aproveitar a oferta relâmpago! 🍔🔥\n\n*${burger.name}* por R$ ${salePrice} (25% off, só até 22h)`;
    window.open(waLink(msg), '_blank', 'noopener');
  }

  return (
    <section className="section oferta-sec" aria-label="Oferta relâmpago" aria-live="polite">
      <div className="wrap">
        <div className="oferta-inner" data-reveal>
          <div className="oferta-label-wrap">
            <span className="oferta-label">OFERTA RELÂMPAGO</span>
          </div>
          <div className="oferta-grid">
            <div className="oferta-img">
              <FoodPlaceholder src={burger.src} label={burger.name} tags={burger.tags} />
            </div>
            <div className="oferta-content">
              <div className="eyebrow">Só hoje · Das 19h às 22h</div>
              <h2 className="section-title" style={{ marginBottom: 10 }}>{burger.name}</h2>
              <div className="oferta-prices">
                <span className="oferta-orig-price">R$ {origPrice}</span>
                <span className="oferta-sale-price">R$ {salePrice}</span>
              </div>
              <p className="oferta-timer-label">Termina em</p>
              <div className="oferta-countdown" aria-label={`Faltam ${cd.hh}h ${cd.mm}m ${cd.ss}s`}>
                {[{v:cd.hh,u:'h'},{v:cd.mm,u:'m'},{v:cd.ss,u:'s'}].map((item,i,arr)=>(
                  <React.Fragment key={item.u}>
                    <div className="oferta-countdown-block">
                      <span className="oferta-countdown-num" aria-live="off">{item.v}</span>
                      <span className="oferta-countdown-unit">{item.u}</span>
                    </div>
                    {i < arr.length-1 && <span className="oferta-countdown-sep" aria-hidden="true">:</span>}
                  </React.Fragment>
                ))}
              </div>
              <div className="oferta-remaining-wrap">
                <div className="oferta-remaining-bar">
                  <div className="oferta-remaining-fill" style={{width:`${(remaining/30)*100}%`}} aria-hidden="true" />
                </div>
                <span className="oferta-remaining-text">{remaining} de 30 restantes hoje</span>
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:24}}>
                <button className="btn btn-primary btn-lg" onClick={handlePedir} disabled={remaining===0}>
                  <IcoWA /> {remaining===0 ? 'ESGOTADO' : 'QUERO ESSA OFERTA'}
                </button>
                <a href="oferta.html" className="btn btn-outline btn-sm" style={{alignSelf:'center'}}>
                  Ver página completa
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   7. NOSSA CARNE — teaser banner
═══════════════════════════════════════════════════════════════ */
function NossaCarneTeaser() {
  const burger = SANKA_BURGERS.find(b => b.code === 'SB-015');
  return (
    <section className="carne-teaser" aria-label="Nossa carne">
      <div className="wrap">
        <div className="carne-teaser-inner" data-reveal>
          <div className="carne-teaser-img" aria-hidden="true">
            {burger && (
              <FoodPlaceholder
                src={burger.src}
                label={burger.name}
                tags={burger.tags}
              />
            )}
          </div>
          <div className="carne-teaser-text">
            <div className="eyebrow">Nossa obsessão</div>
            <h2 className="section-title">
              A CARNE<br /><em>IMPORTA.</em>
            </h2>
            <p className="section-sub" style={{ marginBottom: 32 }}>
              Enquanto outros usam hambúrguer de pacote, nós compramos o corte inteiro,
              moemos na casa e formamos o blend na hora. Isso muda tudo.
            </p>
            <a href="nossa-carne.html" className="btn btn-outline">
              Entender o diferencial <IcoArrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   8. COMO FUNCIONA
═══════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const WA = waLink('Olá! Quero fazer um pedido. 🍔');
  return (
    <section className="section how" id="como-funciona" aria-labelledby="how-title">
      <div className="wrap">
        <div data-reveal>
          <div className="eyebrow">Como pedir</div>
          <h2 id="how-title" className="section-title">
            Simples. Rápido.<br /><em>Sem complicação.</em>
          </h2>
        </div>

        <div className="how-steps" role="list">
          {HOW_STEPS.map((step, i) => (
            <div key={step.num} className="how-step" role="listitem" data-reveal data-delay={String(i + 1)}>
              <div className="how-num" aria-hidden="true">{step.num}</div>
              <div className="how-body">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="how-cta" data-reveal>
          <a href={WA} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer">
            <IcoWA /> FAZER MEU PEDIDO AGORA
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   9. DEPOIMENTOS
═══════════════════════════════════════════════════════════════ */
function Reviews() {
  return (
    <section className="section" aria-labelledby="reviews-title">
      <div className="wrap">
        <div data-reveal>
          <div className="eyebrow">Quem já provou</div>
          <h2 id="reviews-title" className="section-title">
            Não somos nós<br /><em>que falamos.</em>
          </h2>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            Mais de 4.000 pedidos/mês. Avaliação 4.9 no iFood e Google.
          </p>
        </div>

        <div className="reviews-grid">
          {REVIEWS.map((r, i) => (
            <article key={i} className="review-card" data-reveal data-delay={String(i + 1)}>
              <div className="review-stars" aria-label={`${r.stars} de 5 estrelas`}>
                {'★'.repeat(r.stars)}
              </div>
              <blockquote className="review-text">"{r.text}"</blockquote>
              <footer className="review-footer">
                <div className="review-avatar" aria-hidden="true">{r.name[0]}</div>
                <div>
                  <div className="review-name">{r.name}</div>
                  <div className="review-meta">{r.meta}</div>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   10. LOCALIZAÇÃO & HORÁRIO
═══════════════════════════════════════════════════════════════ */
function Location() {
  return (
    <section className="section location" id="localizacao" aria-labelledby="location-title">
      <div className="wrap">
        <div data-reveal>
          <div className="eyebrow">Onde estamos</div>
          <h2 id="location-title" className="section-title">
            Vem até nós<br /><em>ou a gente vai até você.</em>
          </h2>
        </div>

        <div className="location-grid">
          <div className="location-map" data-reveal>
            <div className="location-map-placeholder">
              <IcoPin />
              <strong>Mapa em breve</strong>
              <span>Rio Claro / SP</span>
            </div>
          </div>

          <div className="location-info" data-reveal data-delay="2">
            <div className="info-block">
              <div className="info-label"><IcoPin /> Endereço</div>
              <div className="info-value">
                Rua [TODO], nº [TODO]<br />
                [Bairro] · Rio Claro/SP
              </div>
            </div>

            <div className="info-block">
              <div className="info-label"><IcoClock /> Horário</div>
              <div className="hours-grid" role="table" aria-label="Horários de funcionamento">
                <span className="hours-day">Ter — Dom</span>
                <span className="hours-time">18:00 — 23:30</span>
                <span className="hours-day">Segunda</span>
                <span className="hours-time hours-closed">Fechado</span>
              </div>
            </div>

            <div className="info-block">
              <div className="info-label"><IcoPhone /> WhatsApp</div>
              <div className="info-value">
                <a href={waLink()} target="_blank" rel="noopener noreferrer">
                  (16) 99313-8450
                </a>
              </div>
              <p className="info-sub">Atendemos também pelo iFood e pedido presencial.</p>
            </div>

            <a href={waLink('Olá! Quero pedir delivery. 🍔')} className="btn btn-primary" target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'flex-start' }}>
              <IcoWA /> PEDIR DELIVERY
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   11. CLUBE SANKA — CTA
═══════════════════════════════════════════════════════════════ */
function ClubeCTA() {
  const WA = waLink('Quero saber mais sobre o Clube Sanka! 🏆');
  return (
    <section className="clube-cta section" id="clube" aria-labelledby="clube-title">
      <div className="wrap">
        <div className="clube-cta-inner" data-reveal>
          <div className="clube-cta-text">
            <div className="eyebrow">Programa de Fidelidade</div>
            <h2 id="clube-title" className="section-title">
              CLUBE<br /><em>SANKA.</em>
            </h2>
            <p className="section-sub" style={{ marginBottom: 36 }}>
              Pontuação a cada pedido. Resgates exclusivos.
              Ofertas antecipadas para membros do clube.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a href={WA} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer">
                <IcoWA /> ENTRAR NO CLUBE
              </a>
              <a href="admin-clube.html" className="btn btn-outline btn-lg">
                Já sou membro
              </a>
            </div>
          </div>
          <div className="clube-cta-badge" aria-hidden="true">
            <div className="clube-badge-ring">
              <span className="clube-badge-s">S</span>
              <span className="clube-badge-label">CLUBE SANKA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   12. FOOTER
═══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="#" className="nav-logo" aria-label="Sanka Burgers — topo da página">
              <div className="nav-logo-mark" aria-hidden="true">S</div>
              <div className="nav-logo-name">SANKA<b>.</b></div>
            </a>
            <p className="footer-brand-desc">
              Hambúrgueres artesanais em Rio Claro/SP.
              Carne moída na hora, blend exclusivo, sem atalhos.
            </p>
          </div>

          <div className="footer-col">
            <h5>Navegação</h5>
            <a href="cardapio.html">Cardápio</a>
            <a href="nossa-carne.html">Nossa Carne</a>
            <a href="#como-funciona">Como Pedir</a>
            <a href="#localizacao">Localização</a>
          </div>

          <div className="footer-col">
            <h5>Redes & Contato</h5>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IcoIG /> @sankaburgers
              </span>
            </a>
            <a href={waLink()} target="_blank" rel="noopener noreferrer">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IcoWA /> (16) 99313-8450
              </span>
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer">iFood</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Sanka Burgers · Rio Claro / SP</p>
          <p>Feito com fogo e blend exclusivo</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Aliases para compatibilidade com imports antigos ──────── */
const Proof       = ProvaArtesanal;
const FeaturedMenu = Destaques;

export {
  Nav, Hero, Destaques, ProvaArtesanal, MonteBanner, OfertaDia,
  NossaCarneTeaser, HowItWorks, Reviews, Location, ClubeCTA, Footer,
  Proof, FeaturedMenu,
};
export { IcoWA, IcoPin, IcoClock, IcoPhone, IcoIG, IcoArrow };
