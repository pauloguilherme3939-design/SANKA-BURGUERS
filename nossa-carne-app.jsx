// nossa-carne-app.jsx — Sanka Burgers · Página diferencial da carne
// Tom: direto, orgulhoso, quase provocador. Sem clichês.

import { FoodPlaceholder } from './placeholders.jsx'

const { useState, useEffect } = React;
const { motion } = Motion; // Motion = Framer Motion CDN global

/* ── Ease e helpers ────────────────────────────────────────── */
const EASE = [0.16, 1, 0.3, 1];

// Componente de reveal reutilizável
function Reveal({ children, y = 64, x = 0, delay = 0, duration = 0.9, amount = 0.15, className, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, ease: EASE, delay }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// Variantes para stagger em listas
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, x: -36 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

/* ── Nav ───────────────────────────────────────────────────── */
function NossaCarneNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`} aria-label="Navegação">
      <div className="wrap nav-inner">
        <a href="index.html" className="nav-logo" aria-label="Voltar para o site">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <span className="nav-logo-name">SANKA<b>.</b></span>
        </a>
        <span className="nav-page-title" aria-hidden="true">Nossa Carne</span>
        <a href="cardapio.html" className="btn btn-primary btn-sm">
          Montar Pedido
        </a>
      </div>
    </nav>
  );
}

/* ── 1. HERO — A manchete ──────────────────────────────────── */
const STATEMENT = [
  { text: 'Em Rio Claro,',          accent: false },
  { text: 'quase ninguém serve',    accent: false },
  { text: 'hambúrguer',             accent: false },
  { text: 'de verdade.',            accent: true  },
];

function HeroStatement() {
  return (
    <section className="nc-hero" aria-labelledby="nc-hero-h1">
      {/* Label topo */}
      <motion.p
        className="nc-hero-label"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
      >
        Nossa Carne <span aria-hidden="true">·</span> Sanka Burgers
      </motion.p>

      {/* Manchete */}
      <h1 id="nc-hero-h1" className="nc-statement" aria-label="Em Rio Claro, quase ninguém serve hambúrguer de verdade.">
        {STATEMENT.map((line, i) => (
          <motion.span
            key={i}
            className={`nc-statement-line${line.accent ? ' nc-fire' : ''}`}
            initial={{ opacity: 0, y: 80, skewY: 3 }}
            animate={{ opacity: 1, y: 0, skewY: 0 }}
            transition={{ duration: 1.0, ease: EASE, delay: 0.5 + i * 0.18 }}
            aria-hidden="true"
          >
            {line.text}
          </motion.span>
        ))}
      </h1>

      {/* Scroll hint */}
      <motion.div
        className="nc-scroll-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        aria-hidden="true"
      >
        <motion.div
          className="nc-scroll-arrow"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </motion.div>
        <span>continua</span>
      </motion.div>
    </section>
  );
}

/* ── 2. O PROBLEMA ─────────────────────────────────────────── */
function OProblema() {
  return (
    <section className="nc-section nc-problem" aria-labelledby="nc-prob-title">
      <div className="wrap">
        <div className="nc-problem-grid">

          {/* Número de impacto */}
          <Reveal className="nc-impact-col" y={40}>
            <p className="nc-impact-num" aria-label="Nove em dez">
              9<span className="nc-impact-em">em 10</span>
            </p>
            <p className="nc-impact-sub">
              hamburguerias na cidade<br />servem hambúrguer industrial
            </p>
          </Reveal>

          {/* Texto */}
          <div className="nc-problem-text-col">
            <Reveal delay={0.1}>
              <h2 id="nc-prob-title" className="nc-section-title">O problema com o industrial</h2>
            </Reveal>

            <Reveal delay={0.2} y={32}>
              <p className="nc-body-text">
                Hambúrguer industrial não vem de açougue. Vem de fábrica.
                É proteína de soja texturizada, gordura vegetal parcialmente hidrogenada,
                estabilizantes, conservantes e corante caramelo para parecer carne.
              </p>
            </Reveal>

            <Reveal delay={0.3} y={32}>
              <p className="nc-body-text">
                Ele é moldado em máquina, congelado em câmara fria e despachado num caminhão
                frigorífico. Pode ter ficado dois anos nesse caminhão antes de chegar na
                sua mesa. Não tem blend. Tem ficha técnica de produto.
              </p>
            </Reveal>

            <Reveal delay={0.4} y={32}>
              <p className="nc-body-text nc-body-text--bold">
                Você não consegue saber de que animal veio, de qual parte,
                se havia outro animal misturado. Você come e não sabe o que come.
              </p>
            </Reveal>

            <Reveal delay={0.5} y={20}>
              <div className="nc-divider-label">Aqui é diferente.</div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ── 3. NOSSO BLEND ────────────────────────────────────────── */
const BLEND_CHECKS = [
  'Sem proteína de soja',
  'Sem gordura vegetal',
  'Sem conservante',
  'Sem congelado',
  'Sem mistura de frango',
  'Sem identidade duvidosa',
];

function NossoBlend() {
  return (
    <section className="nc-section nc-blend" aria-labelledby="nc-blend-title">
      <div className="wrap">
        <div className="nc-blend-grid">

          {/* Foto */}
          <Reveal className="nc-blend-photo" x={-48} y={0} amount={0.1}>
            {/*
              TODO: SANKA — Substituir pelo vídeo/foto real da carne sendo moída.
              Ideal: vídeo curto de 5-8s em loop, MP4, 800×900px, moendo o blend.
              Colocar em /assets/nossa-carne/moagem.mp4
            */}
            <FoodPlaceholder
              tags="beef,raw,butcher,meat,grind"
              label="Nosso Blend"
              sub="ACÉM · PEITO · COSTELA"
              mood={2}
              seed={77}
            />
            <div className="nc-blend-photo-label">
              <span className="nc-tag">Moído aqui · Todo dia</span>
            </div>
          </Reveal>

          {/* Texto */}
          <div className="nc-blend-info">
            <Reveal delay={0.1}>
              <p className="eyebrow">Nosso blend</p>
              <h2 id="nc-blend-title" className="nc-section-title">
                Três cortes.<br />Uma lógica.
              </h2>
            </Reveal>

            {/* Os cortes */}
            <motion.div
              className="nc-cuts"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
              {[
                { cut: 'Acém', role: 'Gordura infiltrada. Suculência.' },
                { cut: 'Peito', role: 'Estrutura e textura da mordida.' },
                { cut: 'Costela', role: 'Profundidade de sabor e cor.' },
              ].map(({ cut, role }) => (
                <motion.div key={cut} className="nc-cut" variants={staggerItem}>
                  <span className="nc-cut-name">{cut}</span>
                  <span className="nc-cut-role">{role}</span>
                </motion.div>
              ))}
            </motion.div>

            <Reveal delay={0.3} y={24}>
              <div className="nc-stat-block">
                <span className="nc-stat-num">200g</span>
                <span className="nc-stat-label">por hambúrguer · sem encolher na chapa</span>
              </div>
            </Reveal>

            <Reveal delay={0.4} y={20}>
              <p className="nc-body-text">
                Compramos o corte inteiro toda manhã. Passamos pela moenda na casa.
                O que não foi usado hoje <strong>não volta amanhã</strong>.
                Se acabou, acabou.
              </p>
            </Reveal>

            {/* Checklist */}
            <motion.ul
              className="nc-checks"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              aria-label="O que não tem no nosso hambúrguer"
            >
              {BLEND_CHECKS.map(check => (
                <motion.li key={check} className="nc-check" variants={staggerItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                  {check}
                </motion.li>
              ))}
            </motion.ul>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ── 4. O PÃO ──────────────────────────────────────────────── */
function OPao() {
  return (
    <section className="nc-section nc-bread" aria-labelledby="nc-bread-title">
      <div className="wrap">

        <div className="nc-bread-inner">
          <Reveal className="nc-bread-photo" x={48} y={0} amount={0.1}>
            {/*
              TODO: SANKA — Substituir pelo nome real da padaria e foto do pão.
              Foto ideal: brioche cortado ao meio, miolo aparente, vapor, fundo escuro.
              Colocar em /assets/nossa-carne/pao.jpg (800×600px)
            */}
            <FoodPlaceholder
              tags="brioche,bread,bun,bakery,golden"
              label="Pão Sankinha"
              sub="TODO: NOME DA PADARIA"
              mood={4}
              seed={33}
            />
          </Reveal>

          <div className="nc-bread-text">
            <Reveal delay={0.1}>
              <p className="eyebrow">O pão</p>
              <h2 id="nc-bread-title" className="nc-section-title">
                Brioche.<br />
                {/* TODO: SANKA — Substituir [PADARIA] pelo nome real da padaria parceira */}
                Da [PADARIA].<br />
                Assado hoje.
              </h2>
            </Reveal>

            <Reveal delay={0.25} y={32}>
              <p className="nc-body-text">
                {/* TODO: SANKA — Descrever o pão real: receita, diferencial, por que escolheram essa padaria */}
                Brioche desenvolvido exclusivamente com a padaria parceira de Rio Claro.
                Assado toda tarde. Chega aqui ainda morno.
              </p>
            </Reveal>

            <Reveal delay={0.35} y={24}>
              <p className="nc-body-text">
                O pão de hambúrguer comum é industrial também — embalado, cheio de conservante,
                borrachoso. O nosso rasga diferente. Absorve o suco da carne sem desmontar.
                Esse detalhe muda o lanche inteiro.
              </p>
            </Reveal>

            <Reveal delay={0.45} y={20}>
              <div className="nc-quote">
                "Pão de pacote não é pão. É embalagem."
              </div>
            </Reveal>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ── 5. QUEIJOS & MOLHOS ───────────────────────────────────── */
const CHEESES = [
  { name: 'Provolone Defumado', desc: 'Importado. Derrete diferente. Sabor que fica.' },
  { name: 'Cheddar Inglês',     desc: 'Cremoso, não o plástico laranja. Cheddar de verdade.' },
  { name: 'Cream Cheese',       desc: 'Integral, leve acídez. Equilibra os sabores fortes.' },
  { name: 'Mozzarela Fatiada',  desc: 'Leite integral, elástica. Não a de pizza congelada.' },
];

const SAUCES = [
  'Maionese da casa (ervas frescas)',
  'Barbecue defumado',
  'Maionese verde (salsinha + alho)',
  'Aioli de alho assado',
  'Mostarda mel & pimenta',
  'Molho especial da Sanka',
  'Maionese de jalapeño',
];

function QueijosEMolhos() {
  return (
    <section className="nc-section nc-qs" aria-labelledby="nc-qs-title">
      <div className="wrap">

        <Reveal>
          <p className="eyebrow">Queijos & molhos</p>
          <h2 id="nc-qs-title" className="nc-section-title">
            Sete molhos.<br />Todos feitos aqui.
          </h2>
        </Reveal>

        <div className="nc-qs-body">

          {/* Queijos */}
          <div className="nc-qs-col">
            <Reveal delay={0.1}>
              <h3 className="nc-qs-subtitle">Queijos de verdade</h3>
            </Reveal>
            <motion.div
              className="nc-cheese-grid"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
              {CHEESES.map(({ name, desc }) => (
                <motion.div key={name} className="nc-cheese-card" variants={staggerItem}>
                  <span className="nc-cheese-name">{name}</span>
                  <span className="nc-cheese-desc">{desc}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Molhos */}
          <div className="nc-qs-col">
            <Reveal delay={0.15}>
              <h3 className="nc-qs-subtitle">Molhos da casa</h3>
              <p className="nc-body-text" style={{ marginBottom: 24 }}>
                Desenvolvidos no balcão. Sem ingrediente artificial.
                Cada molho tem uma lógica — não são intercambiáveis.
              </p>
            </Reveal>
            <motion.ul
              className="nc-sauce-list"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              aria-label="Lista de molhos da casa"
            >
              {SAUCES.map(sauce => (
                <motion.li key={sauce} className="nc-sauce-item" variants={staggerItem}>
                  <span className="nc-sauce-dot" aria-hidden="true" />
                  {sauce}
                </motion.li>
              ))}
            </motion.ul>
          </div>

        </div>

      </div>
    </section>
  );
}

/* ── 6. LINHA DO TEMPO ─────────────────────────────────────── */
const TIMELINE = [
  { time: '08:00',   icon: '🥩', label: 'Açougue parceiro entrega os cortes inteiros' },
  { time: '09:00',   icon: '⚙',  label: 'Moemos tudo. Nada sobra pra amanhã.' },
  { time: '10:30',   icon: '🍞',  label: 'Padaria entrega os pães do dia, ainda mornos' },
  { time: '11:00',   icon: '🔥',  label: 'Loja abre. Chapa acesa.' },
  { time: '+ 35min', icon: '🛵',  label: 'Seu pedido na sua porta' },
];

function LinhaDeTempo() {
  return (
    <section className="nc-section nc-timeline-sec" aria-labelledby="nc-tl-title">
      <div className="wrap">

        <Reveal>
          <p className="eyebrow">Do açougue ao seu pedido</p>
          <h2 id="nc-tl-title" className="nc-section-title">
            Da carne fresca<br />até você.
          </h2>
          <p className="nc-body-text" style={{ maxWidth: 480, marginBottom: 52 }}>
            {/* TODO: SANKA — Confirmar os horários reais antes de publicar */}
            Não tem frigorífico, não tem câmara de congelamento, não tem estoque de dois dias.
            Tudo que vendemos hoje, compramos hoje.
          </p>
        </Reveal>

        <motion.ol
          className="nc-timeline"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          aria-label="Linha do tempo do pedido"
        >
          {TIMELINE.map((step, i) => {
            const isLast = i === TIMELINE.length - 1;
            return (
              <motion.li
                key={step.time}
                className={`nc-tl-step${isLast ? ' nc-tl-step--final' : ''}`}
                variants={{
                  hidden: { opacity: 0, x: -40 },
                  show:   { opacity: 1, x: 0, transition: { duration: 0.65, ease: EASE } },
                }}
              >
                <div className="nc-tl-left">
                  <span className="nc-tl-time">{step.time}</span>
                </div>
                <div className="nc-tl-connector">
                  <div className="nc-tl-dot" aria-hidden="true" />
                  {!isLast && <div className="nc-tl-line" aria-hidden="true" />}
                </div>
                <div className="nc-tl-right">
                  <span className="nc-tl-icon" aria-hidden="true">{step.icon}</span>
                  <span className="nc-tl-label">{step.label}</span>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>

      </div>
    </section>
  );
}

/* ── 7. CTA FINAL ──────────────────────────────────────────── */
function CTAFinal() {
  return (
    <section className="nc-cta" aria-labelledby="nc-cta-title">
      <div className="wrap">
        <Reveal amount={0.2}>
          <p className="nc-cta-overline">Agora você sabe.</p>
          <h2 id="nc-cta-title" className="nc-cta-claim">
            Agora você entende<br />
            por que custa<br />
            <span className="nc-fire">o que custa.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.25} y={32}>
          <p className="nc-cta-sub">
            E por que, depois do primeiro, você não vai querer voltar<br />
            pro hambúrguer de pacote.
          </p>
        </Reveal>

        <Reveal delay={0.4} y={24}>
          <a href="cardapio.html" className="nc-cta-btn">
            Montar meu pedido
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </Reveal>

        <Reveal delay={0.55} y={16}>
          <p className="nc-cta-note">
            Ou liga no WhatsApp e manda o pedido direto.
          </p>
        </Reveal>

      </div>

      {/* Glow decorativo */}
      <div className="nc-cta-glow" aria-hidden="true" />
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────────── */
function NossaCarneFooter() {
  return (
    <footer className="cardapio-footer">
      <div className="wrap">
        <a href="index.html" className="nav-logo" style={{ justifyContent: 'center', marginBottom: 12 }}>
          <div className="nav-logo-mark" aria-hidden="true">S</div>
          <div className="nav-logo-name">SANKA<b>.</b></div>
        </a>
        <p>© 2024 Sanka Burgers · Rio Claro/SP</p>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="cardapio.html" className="btn btn-primary btn-sm">Cardápio</a>
          <a href="index.html#localizacao" className="btn btn-outline btn-sm">Localização</a>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
function NossaCarneApp() {
  return (
    <div className="nc-page">
      <NossaCarneNav />
      <HeroStatement />
      <OProblema />
      <NossoBlend />
      <OPao />
      <QueijosEMolhos />
      <LinhaDeTempo />
      <CTAFinal />
      <NossaCarneFooter />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<NossaCarneApp />);
