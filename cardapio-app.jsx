// cardapio-app.jsx — Sanka Burgers · Página de Cardápio
// Arquitetura de menu psicológica: entry / hero / premium

import { SANKA_CATS, SANKA_BURGERS, SANKA_COMBOS, SANKA_SIDES, SANKA_DRINKS } from './data.jsx'
import { FoodPlaceholder } from './placeholders.jsx'
import { CartProvider, useCartContext } from './cart.jsx'
import { CheckoutModal } from './checkout-modal.jsx'
import { SANKA_CONFIG } from './lib/config.js'
import { SANKA_BRAND } from './lib/brand.js'

const { useState, useEffect, useMemo } = React;

/* ── Tier metadata ─────────────────────────────────────────────
   entry   = âncora de preço baixo (não destacado)
   hero    = item-alvo (com badge, borda fire)
   premium = âncora de preço alto (borda amber)
   Ordem de exibição: hero → premium → entry
────────────────────────────────────────────────────────────── */
const TIER = {
  'SK-L01': 'hero',
  'SK-L02': 'premium',
  'SK-L03': 'premium',
  'SK-L04': 'premium',
  'SK-L05': 'hero',
  'SK-L06': 'hero',
  'SK-L07': 'entry',
  'SK-L08': 'hero',
  'SK-L09': 'hero',
  'SK-L10': 'entry',
  'SK-L11': 'hero',
  'SK-L12': 'entry',
  'SK-L13': 'entry',
  'SK-L14': 'hero',
};

const SIDE_TIER = {
  'SK-P01': 'entry',
  'SK-P02': 'hero',
  'SK-P03': 'premium',
  'SK-P04': 'hero',
};

const COMBO_TIER = {
  'SK-C01': 'entry',
  'SK-C02': 'hero',
  'SK-C03': 'premium',
};

const TIER_SORT = { hero: 0, premium: 1, entry: 2 };

const FILTER_CATS = [
  { id: 'todos',      label: 'Tudo'                },
  { id: 'combos',     label: 'Combos'              },
  { id: 'artesanais', label: 'Burgers Artesanais'  },
  { id: 'alem',       label: 'Além dos Burgers'    },
  { id: 'porcoes',    label: 'Porções'             },
  { id: 'bebidas',    label: 'Bebidas'             },
];

const BURGER_CATS = ['artesanais', 'alem'];

/* ── Scroll Reveal ─────────────────────────────────────────────
   Roda após cada render para capturar novos [data-reveal] ao
   mudar filtro.
────────────────────────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('is-visible');
      }),
      { threshold: 0.06, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

/* ── Helpers ───────────────────────────────────────────────── */
function brl(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ── Nav ───────────────────────────────────────────────────── */
function CardapioNav() {
  const { count, openDrawer } = useCartContext();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`} aria-label="Navegação cardápio">
      <div className="wrap nav-inner">

        {/* Voltar */}
        <a href="index.html" className="nav-logo" aria-label="Voltar para o site">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <span className="nav-logo-name">SANKA<b>.</b></span>
        </a>

        {/* Título da página (desktop) */}
        <span className="nav-page-title" aria-hidden="true">Cardápio</span>

        {SANKA_BRAND.isMeatStoryActive && (
          <a href="nossa-carne.html" className="nav-carne-link" aria-label="Nossa Carne — saiba mais sobre nosso blend">Nossa Carne</a>
        )}

        {/* Direita: ícone do carrinho + CTA */}
        <div className="nav-right">
          <a
            href="admin-pedidos.html"
            className="nav-admin-link"
            aria-label="Administração — gerenciar pedidos"
          >
            ADM
          </a>
          <button
            className="nav-cart-btn"
            onClick={openDrawer}
            aria-label={`Carrinho — ${count} ${count === 1 ? 'item' : 'itens'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {count > 0 && (
              <span className="nav-cart-badge" aria-hidden="true">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>
          <button
            className="btn btn-primary btn-sm nav-cta-label"
            onClick={openDrawer}
          >
            {count > 0 ? `Ver pedido (${count})` : 'Pedir Agora'}
          </button>
        </div>

      </div>
    </nav>
  );
}

/* ── Filter Bar ────────────────────────────────────────────── */
function FilterBar({ active, onChange }) {
  return (
    <div className="filter-bar" role="navigation" aria-label="Categorias do cardápio">
      <div className="filter-scroll wrap">
        {FILTER_CATS.map(c => (
          <button
            key={c.id}
            className={`filter-chip${active === c.id ? ' is-active' : ''}`}
            onClick={() => onChange(c.id)}
            aria-pressed={active === c.id}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Menu Card ─────────────────────────────────────────────── */
function MenuCard({ item, tier, onAdd, delay }) {
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    if (item.purchaseDisabled) return;
    onAdd(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1100);
  }

  const isHero    = tier === 'hero';
  const isPremium = tier === 'premium';
  const isEntry   = tier === 'entry';

  const cls = [
    'menu-card',
    isHero && item.tag ? 'is-hero'    : '',
    isPremium          ? 'is-premium' : '',
    isEntry            ? 'is-entry'   : '',
  ].filter(Boolean).join(' ');

  const badgeVariant = item.tag === 'ASSINATURA' ? 'badge-gold'
    : item.tag === 'NOVO'                        ? 'badge-new'
    :                                              'badge-hot';

  const hasGradient = !!item.bg && !item.src;
  const imgTags = item.tags || (item.name || '').toLowerCase().replace(/\s+/g, ',');
  const displayedPrice = item.priceMax
    ? `${brl(item.price)} a ${brl(item.priceMax)}`
    : brl(item.price);
  const consultUrl = `https://wa.me/${SANKA_CONFIG.whatsapp}?text=${encodeURIComponent(`Olá! Quero confirmar os sabores e o valor de ${item.name}.`)}`;

  return (
    <article className={cls} id={item.code ? item.code.toLowerCase() : undefined} data-reveal data-delay={delay}>

      {/* Mídia */}
      <div className="menu-card-media">
        {hasGradient ? (
          <div className="menu-card-gradient" style={{ background: item.bg }}>
            {item.tag && (
              <span className="drink-tag">{item.tag}</span>
            )}
          </div>
        ) : (
          <FoodPlaceholder tags={imgTags} label={item.name} src={item.src} />
        )}
        {item.tag && !hasGradient && (
          <span className={`badge ${badgeVariant} menu-card-badge`}>
            {item.tag}
          </span>
        )}
      </div>

      {/* Corpo */}
      <div className="menu-card-body">
        <div>
          <div className="menu-card-top">
            <h3 className="menu-card-name">{item.name}</h3>
            {item.size && <span className="menu-card-size">{item.size}</span>}
          </div>
          <p className="menu-card-desc">{item.desc}</p>
        </div>

        <div className="menu-card-foot">
          <span className="menu-card-price">{displayedPrice}</span>
          {item.purchaseDisabled ? (
            <a
              className="btn-add"
              href={consultUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Consultar ${item.name} pelo WhatsApp`}
              onClick={() => window.SankaAnalytics?.waClick('menu_consulta')}
            >
              Consultar
            </a>
          ) : (
            <button
              className={`btn-add${justAdded ? ' is-added' : ''}`}
              onClick={handleAdd}
              aria-label={`Adicionar ${item.name} ao pedido`}
            >
            {justAdded ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                Adicionado
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Adicionar
              </>
            )}
            </button>
          )}
        </div>
      </div>

    </article>
  );
}

/* ── Section Head ──────────────────────────────────────────── */
function SectionHead({ title, count }) {
  return (
    <div className="menu-sec-head" data-reveal>
      <h2 className="menu-sec-title">{title}</h2>
      <span className="menu-sec-count">{count} {count === 1 ? 'item' : 'itens'}</span>
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="empty-state" data-reveal>
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.25, margin: '0 auto 20px' }}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <h3>Nada por aqui</h3>
      <p>Tente outra categoria ou fale com a gente pelo WhatsApp.</p>
    </div>
  );
}


/* ── Cardápio Page ─────────────────────────────────────────── */
function CardapioPage() {
  const [filter, setFilter] = useState('todos');
  const { addItem, count, openDrawer } = useCartContext();

  function handleAdd(item) {
    addItem(item);
    openDrawer();
    if (window.SankaAnalytics) SankaAnalytics.addToCart(item);
  }

  useScrollReveal();

  /* ── Enriquecer dados com tier + id + type ── */
  const burgers = useMemo(() =>
    SANKA_BURGERS
      .map(b => ({ ...b, id: b.code, type: 'burger', tier: TIER[b.code] || 'hero' }))
      .sort((a, b) => (TIER_SORT[a.tier] ?? 1) - (TIER_SORT[b.tier] ?? 1)),
    []
  );

  const combos = useMemo(() =>
    SANKA_COMBOS
      .map(c => ({ ...c, id: c.code, type: 'combo', cat: 'combos', tier: COMBO_TIER[c.code] || 'hero' }))
      .sort((a, b) => (TIER_SORT[a.tier] ?? 1) - (TIER_SORT[b.tier] ?? 1)),
    []
  );

  const sides = useMemo(() =>
    SANKA_SIDES
      .map(s => ({ ...s, id: s.code, type: 'side', cat: 'porcoes', tier: SIDE_TIER[s.code] || 'hero' }))
      .sort((a, b) => (TIER_SORT[a.tier] ?? 1) - (TIER_SORT[b.tier] ?? 1)),
    []
  );

  // Bebidas informadas no cardápio de lançamento.
  const drinks = useMemo(() =>
    SANKA_DRINKS.map((d) => ({
      ...d,
      id: d.code,
      type: 'drink',
      cat: 'bebidas',
      tier: d.price <= 10 ? 'entry' : d.price >= 20 ? 'premium' : 'hero',
    })).sort((a, b) => (TIER_SORT[a.tier] ?? 1) - (TIER_SORT[b.tier] ?? 1)),
    []
  );

  /* ── Agrupar hambúrgueres por categoria ── */
  const burgerGroups = useMemo(() =>
    BURGER_CATS.map(catId => ({
      id: catId,
      label: SANKA_CATS.find(c => c.id === catId)?.label || catId,
      items: burgers.filter(b => b.cat === catId),
    })).filter(g => g.items.length > 0),
    [burgers]
  );

  /* ── Visibilidade por filtro ── */
  const isAll      = filter === 'todos';
  const isBurger   = BURGER_CATS.includes(filter);
  const showCombos = isAll || filter === 'combos';
  const showSides  = isAll || filter === 'porcoes';
  const showDrinks = isAll || filter === 'bebidas';

  const visibleGroups = isBurger
    ? burgerGroups.filter(g => g.id === filter)
    : isAll ? burgerGroups : [];

  const hasContent = visibleGroups.length > 0 || showCombos || showSides || showDrinks;

  function handleFilter(catId) {
    setFilter(catId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const WA = 'https://wa.me/' + SANKA_CONFIG.whatsapp + '?text=' + encodeURIComponent('Olá! Quero fazer um pedido. 🍔');

  return (
    <>
      <CardapioNav />

      {/* Spacer para o nav fixo */}
      <div style={{ height: '64px' }} aria-hidden="true" />

      <FilterBar active={filter} onChange={handleFilter} />

      <span id="cardapio" aria-hidden="true" />
      <main className="cardapio-main" id="main-content" tabIndex="-1">
        <div className="wrap">

          {/* Cabeçalho — só no filtro "Tudo" */}
          {isAll && (
            <div className="cardapio-head" data-reveal>
              <p className="eyebrow">Menu completo</p>
              <h1 className="cardapio-h1">
                Nosso<br/>
                <span className="accent">Cardápio</span>
              </h1>
              <p className="cardapio-sub">
                Cardápio de lançamento da Sanka Burgers. Escolha seus itens e finalize pelo WhatsApp.
              </p>
            </div>
          )}

          {/* Combos */}
          {showCombos && (
            <section className="menu-section" id="sec-combos">
              <SectionHead title="Combos" count={combos.length} />
              <div className="menu-grid">
                {combos.map((item, idx) => (
                  <MenuCard key={item.id} item={item} tier={item.tier} onAdd={handleAdd} delay={String((idx % 3) + 1)} />
                ))}
              </div>
            </section>
          )}

          {/* Seções de hambúrgueres */}
          {visibleGroups.map(group => (
            <section key={group.id} className="menu-section" id={`sec-${group.id}`}>
              <SectionHead title={group.label} count={group.items.length} />
              <div className="menu-grid">
                {group.items.map((item, idx) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    tier={item.tier}
                    onAdd={handleAdd}
                    delay={String((idx % 3) + 1)}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Porções */}
          {showSides && (
            <section className="menu-section" id="sec-porcoes">
              <SectionHead title="Porções" count={sides.length} />
              <div className="menu-grid">
                {sides.map((item, idx) => (
                  <MenuCard key={item.id} item={item} tier={item.tier} onAdd={handleAdd} delay={String((idx % 3) + 1)} />
                ))}
              </div>
            </section>
          )}

          {/* Bebidas */}
          {showDrinks && (
            <section className="menu-section" id="sec-bebidas">
              <SectionHead title="Bebidas" count={drinks.length} />
              <div className="menu-grid menu-grid--drinks">
                {drinks.map((item, idx) => (
                  <MenuCard key={item.id} item={item} tier={item.tier} onAdd={handleAdd} delay={String((idx % 4) + 1)} />
                ))}
              </div>
            </section>
          )}

          {/* Estado vazio */}
          {!hasContent && <EmptyState />}

        </div>
      </main>

      {/* Footer */}
      <footer className="cardapio-footer">
        <div className="wrap">
          <a href="index.html" className="nav-logo" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <div className="nav-logo-mark" aria-hidden="true">S</div>
            <div className="nav-logo-name">SANKA<b>.</b></div>
          </a>
          <p>© 2026 Sanka Burgers · Rio Claro/SP</p>
          <p className="cardapio-footer-hours">{SANKA_BRAND.openingHours}</p>
          <a
            href={WA}
            className="btn btn-outline"
            style={{ marginTop: '20px', display: 'inline-flex' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Fazer Pedido pelo WhatsApp
          </a>
        </div>
      </footer>

    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <CartProvider catalog={[...SANKA_COMBOS, ...SANKA_BURGERS, ...SANKA_SIDES, ...SANKA_DRINKS]}>
    <CardapioPage />
    <CheckoutModal />
  </CartProvider>
);
