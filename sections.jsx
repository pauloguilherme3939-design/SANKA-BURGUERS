// sections.jsx — Sanka Burgers
// Home focada em conversão · Mobile-first

import { FoodPlaceholder } from './placeholders.jsx'
import { SANKA_BURGERS } from './data.jsx'
import { SANKA_CONFIG } from './lib/config.js'

const { useState, useEffect } = React;

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
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
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
      <line x1="2" y1="7" x2="12" y2="7"/>
      <polyline points="8 3 12 7 8 11"/>
    </svg>
  );
}

/* ── Helper: monta link wa.me a partir de SANKA_CONFIG ─────────
   Chamado em render time — SANKA_CONFIG já está disponível.      */
function waLink(msg) {
  var num = SANKA_CONFIG.whatsapp;
  return msg
    ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg)
    : 'https://wa.me/' + num;
}

/* ─── Dados estáticos das seções ─────────────────────────────── */

// Os 3 hambúrgueres em destaque (codes do data.jsx)
const FEATURED_CODES = ['SB-003', 'SB-004', 'SB-015'];
//   SB-003 = X Americano     (R$24,90) — FAVORITO
//   SB-004 = X Provolone ao Mel (R$28,90) — ASSINATURA
//   SB-015 = X Panceta       (R$34,90) — ASSINATURA
const FEATURED_CENTER = 'SB-004';
const FEATURED_BADGE = {
  'SB-003': { text: 'Clássico',   variant: 'badge-hot' },
  'SB-004': { text: 'Mais Pedido', variant: 'badge-hot' },
  'SB-015': { text: 'Assinatura', variant: 'badge-gold' },
};

// TODO: SANKA — Substituir pelos depoimentos reais do iFood/Google
const REVIEWS = [
  {
    text: "Melhor hambúrguer que já comi em Rio Claro. O X Panceta é absurdo de bom.",
    name: "Mariana S.",
    meta: "iFood · Cliente recorrente",
    stars: 5,
  },
  {
    text: "Pedi uma vez e virei viciado. A carne é completamente diferente do fast-food.",
    name: "Diego R.",
    meta: "Google · 5 estrelas",
    stars: 5,
  },
  {
    text: "X Provolone ao Mel mudou minha percepção de hambúrguer. Entrega rápida também.",
    name: "Camila A.",
    meta: "iFood · Primeira vez",
    stars: 5,
  },
];

const HOW_STEPS = [
  {
    num: "01",
    title: "Escolha seu lanche",
    desc: "17 opções no cardápio — dos clássicos aos autorais. Tem sempre algo novo pra experimentar.",
  },
  {
    num: "02",
    title: "Peça pelo WhatsApp",
    desc: "Sem aplicativo, sem cadastro. Só manda a mensagem. Confirmamos o pedido em segundos.",
  },
  {
    num: "03",
    title: "Receba em 35 min",
    desc: "Saiu da chapa, foi pro entregador. Raio de 6 km coberto em até 35 minutos — garantido.",
  },
];

/* ─────────────────────────────────────────────────────────────
   1. NAVEGAÇÃO
──────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const WA_LINK = waLink('Olá! Quero fazer um pedido. 🍔');

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`} aria-label="Navegação principal">
      <div className="wrap nav-inner">
        {/* Logo */}
        <a href="#" className="nav-logo" aria-label="Sanka Burgers — início">
          <div className="nav-logo-mark" aria-hidden="true">S</div>
          <div className="nav-logo-name">SANKA<b>.</b></div>
        </a>

        {/* Links (apenas desktop) */}
        <div className="nav-links" role="list">
          <a href="#cardapio" role="listitem">Cardápio</a>
          <a href="nossa-carne.html" role="listitem">Nossa Carne</a>
          <a href="#como-funciona" role="listitem">Como Pedir</a>
          <a href="#localizacao" role="listitem">Localização</a>
        </div>

        {/* CTA */}
        <a href={WA_LINK} className="btn btn-primary btn-sm" rel="noopener noreferrer" target="_blank">
          <IcoWA />
          <span className="nav-cta-label">Pedir Agora</span>
        </a>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────
   2. HERO
──────────────────────────────────────────────────────────────── */
function Hero() {
  const WA_LINK = waLink('Olá! Quero fazer um pedido. 🍔');

  return (
    <header className="hero" id="hero">
      {/* ── Imagem de fundo ── */}
      <div className="hero-bg" aria-hidden="true">
        {/*
          TODO: SANKA — FOTO DO HERÓI
          Substituir este FoodPlaceholder pela foto real do hambúrguer assinatura.
          Especificações: JPEG/WebP · mínimo 1920×1080px · hambúrguer centralizado,
          fundo escuro ou bokeh, boa iluminação de chapa. Colocar em /assets/hero.jpg
          e trocar por: <img src="/assets/hero.jpg" alt="" loading="eager" />
        */}
        <FoodPlaceholder
          label="Hero"
          sub="X PANCETA"
          tags="cheeseburger,gourmet,burger,food,dark"
          mood={2}
          seed={42}
        />
      </div>

      {/* Gradiente de leitura */}
      <div className="hero-overlay" aria-hidden="true" />

      {/* ── Conteúdo ── */}
      <div className="wrap hero-content">

        {/* Eyebrow — status + prova social */}
        <div className="hero-eyebrow">
          <span className="dot" aria-hidden="true" />
          {/* TODO: SANKA — Verificar se está aberto agora e horário de funcionamento */}
          Aberto agora&nbsp;·&nbsp;
          {/* TODO: SANKA — Confirmar avaliação real no iFood antes de publicar */}
          ★ 4.9 no iFood&nbsp;·&nbsp;Rio Claro/SP
        </div>

        {/* H1 — curto e violento */}
        <h1>
          HAMBÚRGUER<br />
          <span className="accent">DE VERDADE</span><br />
          EM RIO CLARO.
        </h1>

        {/* Subtítulo — 1 linha explicando o diferencial */}
        <p className="hero-sub">
          Blend artesanal de acém, peito e fraldinha, moído na hora.
          Nunca pré-formado, nunca congelado.
        </p>

        {/* CTAs */}
        <div className="hero-ctas">
          {/* CTA primário — direto pro pedido */}
          <a
            href={WA_LINK}
            className="btn btn-primary btn-lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IcoWA />
            PEDIR AGORA
          </a>
          {/* CTA secundário — explorar cardápio */}
          <a href="#cardapio" className="btn btn-outline btn-lg">
            VER CARDÁPIO
            <IcoArrow />
          </a>
        </div>

        {/* Prova social — 3 números rápidos */}
        <div className="hero-proof" aria-label="Estatísticas">
          <div className="hero-proof-item">
            {/* TODO: SANKA — Confirmar nota real no iFood/Google */}
            <span className="val">★ 4.9</span>
            <span className="lbl">iFood · Google</span>
          </div>
          <div className="hero-proof-item">
            {/* TODO: SANKA — Confirmar volume de pedidos com o proprietário */}
            <span className="val">+4.000</span>
            <span className="lbl">Pedidos / mês</span>
          </div>
          <div className="hero-proof-item">
            <span className="val">35 min</span>
            <span className="lbl">Entrega média</span>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   3. PROVA DE ARTESANAL
──────────────────────────────────────────────────────────────── */
function Proof() {
  return (
    <section className="proof" aria-labelledby="proof-title">
      {/* Título de seção acessível mas não visível — prova fala por si */}
      <h2 id="proof-title" className="sr-only">Por que a Sanka é diferente</h2>

      <div className="proof-grid">
        {/* Item 1 */}
        <div className="proof-item" data-reveal>
          <div className="proof-icon" aria-hidden="true">🥩</div>
          <h3>Carne moída no dia</h3>
          <p>
            Blend exclusivo de acém, peito e fraldinha. Compramos o corte inteiro
            e moemos na casa — todo dia, antes de abrir.
          </p>
        </div>

        {/* Item 2 */}
        <div className="proof-item" data-reveal data-delay="2">
          <div className="proof-icon" aria-hidden="true">🍞</div>
          {/* TODO: SANKA — Substituir "Padaria Parceira" pelo nome real da padaria fornecedora */}
          <h3>Pão da padaria local</h3>
          <p>
            Pão Sankinha exclusivo, produzido pela padaria parceira de Rio Claro
            e entregue fresco toda tarde.
          </p>
        </div>

        {/* Item 3 — ênfase visual: "Nunca." */}
        <div className="proof-item proof-never" data-reveal data-delay="4">
          <div className="proof-icon" aria-hidden="true">✕</div>
          <h3>Sem hambúrguer industrial.</h3>
          <p className="proof-never-sub" aria-hidden="true">Nunca.</p>
          <p>
            Nenhum dos nossos lanches leva hambúrguer de pacote.
            Essa é a única regra que não muda.
          </p>
        </div>
      </div>

      {/* Link para a página de diferencial da carne */}
      <div style={{ textAlign: 'center', marginTop: 52 }} data-reveal>
        <a href="nossa-carne.html" className="btn btn-outline btn-sm" style={{ gap: 8 }}>
          Por que nossa carne é diferente
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   4. CARDÁPIO EM DESTAQUE
──────────────────────────────────────────────────────────────── */
function FeaturedMenu() {
  // Busca os 3 hambúrgueres por código (data.jsx expõe SANKA_BURGERS globalmente)
  const items = FEATURED_CODES.map(code => SANKA_BURGERS.find(b => b.code === code)).filter(Boolean);

  return (
    <section className="section" id="cardapio" aria-labelledby="featured-title">
      <div className="wrap">

        <div className="featured-head">
          <div>
            <div className="eyebrow">Cardápio em destaque</div>
            <h2 id="featured-title" className="section-title">
              Os que mais<br /><em>viciam.</em>
            </h2>
          </div>
          {/* TODO: SANKA — Quando criar página /cardapio, trocar href para aquela URL */}
          <a href="#como-funciona" className="btn btn-outline" style={{ alignSelf: 'flex-end' }}>
            Como pedir <IcoArrow />
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
                {/* Imagem */}
                <div className="fcard-media">
                  {/*
                    TODO: SANKA — Substituir FoodPlaceholder pela foto real do {burger.name}
                    Especificações: JPEG 800×600px, fundo escuro, hambúrguer em primer plano
                    Colocar em /assets/burgers/{burger.code.toLowerCase()}.jpg
                  */}
                  <FoodPlaceholder
                    label={burger.name}
                    tags={burger.tags}
                    mood={idx + 1}
                    seed={100 + idx}
                    src={burger.src}
                  />

                  {/* Badges sobre a imagem */}
                  <div className="fcard-badges" aria-hidden="true">
                    {badgeInfo && (
                      <span className={`badge ${badgeInfo.variant}`}>
                        {badgeInfo.text}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: 'var(--f-m)',
                        fontSize: 10,
                        color: 'var(--ink-mute)',
                        background: 'rgba(10,10,10,0.7)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        backdropFilter: 'blur(8px)',
                        letterSpacing: '0.14em',
                      }}
                    >
                      {burger.code}
                    </span>
                  </div>
                </div>

                {/* Corpo do card */}
                <div className="fcard-body">
                  <h3>{burger.name}</h3>
                  <p>{burger.desc}</p>

                  <div className="fcard-foot">
                    <div className="fcard-price" aria-label={`R$ ${burger.price.toFixed(2).replace('.', ',')}`}>
                      <span className="cur">R$</span>
                      {burger.price.toFixed(2).replace('.', ',')}
                    </div>
                    <a
                      href="cardapio.html"
                      className="add-btn"
                      aria-label={`Ver ${burger.name} no cardápio`}
                    >
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

/* ─────────────────────────────────────────────────────────────
   5. COMO FUNCIONA
──────────────────────────────────────────────────────────────── */
function HowItWorks() {
  const WA_LINK = waLink('Olá! Quero fazer um pedido. 🍔');

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
            <div
              key={step.num}
              className="how-step"
              role="listitem"
              data-reveal
              data-delay={String(i + 1)}
            >
              <div className="how-num" aria-hidden="true">{step.num}</div>
              <div className="how-body">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="how-cta" data-reveal>
          <a
            href={WA_LINK}
            className="btn btn-primary btn-lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IcoWA />
            FAZER MEU PEDIDO AGORA
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   6. DEPOIMENTOS
──────────────────────────────────────────────────────────────── */
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
            {/* TODO: SANKA — Atualizar contagem real de avaliações no iFood/Google */}
            Mais de 4.000 pedidos/mês. Avaliação 4.9 no iFood e Google.
          </p>
        </div>

        <div className="reviews-grid">
          {REVIEWS.map((r, i) => (
            <article
              key={i}
              className="review-card"
              data-reveal
              data-delay={String(i + 1)}
            >
              {/*
                TODO: SANKA — Substituir estes depoimentos por reviews reais.
                Copie diretamente do iFood ou Google Meu Negócio.
                Mantenha nome, foto de perfil e link para a avaliação original.
              */}
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

/* ─────────────────────────────────────────────────────────────
   7. LOCALIZAÇÃO & HORÁRIO
──────────────────────────────────────────────────────────────── */
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

          {/* Mapa */}
          <div className="location-map" data-reveal>
            {/*
              TODO: SANKA — Incorporar o mapa do Google Maps com o endereço real.
              PASSO A PASSO:
                1. Abra maps.google.com.br
                2. Busque o endereço exato da Sanka Burgers
                3. Clique em "Compartilhar" → "Incorporar um mapa"
                4. Copie a URL do atributo src do <iframe> e cole abaixo
              Depois remova o .location-map-placeholder e descomente o iframe.
            */}
            {/*
            <iframe
              src="COLE_A_URL_DO_GOOGLE_MAPS_AQUI"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização Sanka Burgers em Rio Claro/SP"
            />
            */}
            <div className="location-map-placeholder">
              <IcoPin />
              <strong>TODO: Mapa Google Maps</strong>
              <span>Inserir embed com endereço real</span>
              <span style={{ marginTop: 8, color: 'var(--fire-l)', fontSize: 10 }}>
                Rio Claro / SP
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="location-info" data-reveal data-delay="2">

            {/* Endereço */}
            <div className="info-block">
              <div className="info-label"><IcoPin /> Endereço</div>
              <div className="info-value">
                {/* TODO: SANKA — Colocar endereço real completo (rua, número, bairro) */}
                Rua [TODO], nº [TODO]<br />
                [Bairro] · Rio Claro/SP
              </div>
            </div>

            {/* Horários */}
            <div className="info-block">
              <div className="info-label"><IcoClock /> Horário</div>
              <div className="hours-grid" role="table" aria-label="Horários de funcionamento">
                {/*
                  TODO: SANKA — Confirmar dias e horários reais de funcionamento
                  e atualizar a tabela abaixo
                */}
                <span className="hours-day">Ter — Dom</span>
                <span className="hours-time">18:00 — 23:30</span>
                <span className="hours-day">Segunda</span>
                <span className="hours-time hours-closed">Fechado</span>
              </div>
            </div>

            {/* Telefone / WhatsApp */}
            <div className="info-block">
              <div className="info-label"><IcoPhone /> WhatsApp</div>
              <div className="info-value">
                {/* TODO: SANKA — Inserir número real no href e no texto */}
                <a href="https://wa.me/5519XXXXXXXXX" target="_blank" rel="noopener noreferrer">
                  (19) 9 XXXX-XXXX
                </a>
              </div>
              <p className="info-sub">Atendemos também pelo iFood e pedido presencial.</p>
            </div>

            {/* CTA de entrega */}
            <a
              href={waLink('Olá! Quero pedir delivery. 🍔')}
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
              style={{ alignSelf: 'flex-start' }}
            >
              <IcoWA />
              PEDIR DELIVERY
            </a>

          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   8. FOOTER
──────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">

          {/* Marca */}
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

          {/* Links rápidos */}
          <div className="footer-col">
            <h5>Navegação</h5>
            <a href="#cardapio">Cardápio</a>
            <a href="nossa-carne.html">Nossa Carne</a>
            <a href="#como-funciona">Como Pedir</a>
            <a href="#localizacao">Localização</a>
          </div>

          {/* Redes & Contato */}
          <div className="footer-col">
            <h5>Redes & Contato</h5>
            {/* TODO: SANKA — Preencher links reais das redes sociais */}
            <a href="#" target="_blank" rel="noopener noreferrer">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IcoIG /> @sankaburgers
              </span>
            </a>
            {/* TODO: SANKA — Inserir número real do WhatsApp */}
            <a href="https://wa.me/5519XXXXXXXXX" target="_blank" rel="noopener noreferrer">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IcoWA /> WhatsApp
              </span>
            </a>
            {/* TODO: SANKA — Inserir link real do iFood */}
            <a href="#" target="_blank" rel="noopener noreferrer">iFood</a>
          </div>

        </div>

        <div className="footer-bottom">
          <p>
            {/* TODO: SANKA — Inserir CNPJ real */}
            © {new Date().getFullYear()} Sanka Burgers · CNPJ 00.000.000/0001-00
          </p>
          <p>
            Rio Claro / SP · Feito com fogo e blend exclusivo
          </p>
        </div>
      </div>
    </footer>
  );
}

export { Nav, Hero, Proof, FeaturedMenu, HowItWorks, Reviews, Location, Footer };
export { IcoWA, IcoPin, IcoClock, IcoPhone, IcoIG, IcoArrow };
