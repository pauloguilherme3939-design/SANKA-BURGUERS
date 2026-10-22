// lib/brand.js — Configuração central da marca Sanka Burgers
// Altere aqui para propagar para todo o site.

export const SANKA_BRAND = {
  // ── Identidade ──────────────────────────────────────────────
  name:        'Sanka Burgers',
  tagline:     'Bateu fome? Sanka resolve.',
  positioning: 'Lanchão prensado estilo São Carlos',
  // Frase de posicionamento — igual em todo lugar (hero, footer, metas)
  positioningLine: 'O lanche prensado que é tradição em São Carlos. Agora em Rio Claro, só no delivery.',

  // ── O que é o lanche de São Carlos ─────────────────────────
  // Só fatos verificáveis sobre a tradição + o que está confirmado sobre a Sanka.
  styleFaqAnswer: 'É o lanche prensado que é tradição em São Carlos/SP: pão grande, prensado na chapa quente até dourar por fora, recheio generoso e maionese caseira. Lanche de verdade, grande e com preço justo. A Sanka trouxe esse estilo para Rio Claro.',
  styleFacts: [
    { icon: '🔥', title: 'Prensado na chapa', desc: 'O lanche vai pra chapa quente e é prensado até dourar por fora. Na Sanka, o pão é selado na chapa.' },
    { icon: '🍔', title: 'Grande de verdade', desc: 'Pão grande e recheio generoso, com preço justo. O oposto do lanchinho pequeno de vitrine.' },
    { icon: '🥄', title: 'Maionese caseira',  desc: 'A maionese da casa faz parte da tradição das lanchonetes de São Carlos. Na Sanka, ela é caseira.' },
  ],

  // ── Domínio ──────────────────────────────────────────────────
  // Fonte única do domínio. O build (lib/site-domain.mjs) propaga para canonical,
  // og:url, og:image, sitemap.xml, robots.txt e JSON-LD de todos os HTMLs.
  // Só publicar depois que o domínio estiver ativo e apontado para a Vercel.
  siteUrl:     'https://sankaburgers.com.br',

  // ── Localização ──────────────────────────────────────────────
  city:        'Rio Claro',
  state:       'SP',
  serviceArea: 'Rio Claro/SP',
  address:     '',        // TODO: Rua completa, número, bairro
  zipCode:     '',        // TODO: CEP

  // ── Horário oficial — fuso de Rio Claro/SP ───────────────────
  timeZone: 'America/Sao_Paulo',
  openingHours: 'Quarta e quinta, 18h30 às 23h30; sexta e sábado, 18h30 às 00h00; domingo, 18h30 às 23h30. Segunda e terça, fechado.',
  openingHoursSchedule: [
    { day: 'Segunda', hours: 'Fechado', closed: true },
    { day: 'Terça',   hours: 'Fechado', closed: true },
    { day: 'Quarta',  hours: '18h30 às 23h30' },
    { day: 'Quinta',  hours: '18h30 às 23h30' },
    { day: 'Sexta',   hours: '18h30 às 00h00' },
    { day: 'Sábado',  hours: '18h30 às 00h00' },
    { day: 'Domingo', hours: '18h30 às 23h30' },
  ],

  // ── Contato ───────────────────────────────────────────────────
  whatsapp:     '5516993138450',
  instagramUrl: '',       // TODO: URL do Instagram
  ifoodUrl:     '',       // TODO: URL do iFood
  googleMapsUrl:'',       // TODO: URL Google Maps
  // Link de avaliação do Google Meu Negócio (o Paulo preenche quando estiver ativo).
  // Vazio = o botão "Pedir avaliação" não aparece no admin de pedidos.
  googleReviewUrl: '',

  // DECISÃO DO PAULO: ex. "40–60 min". null = não mostra nada.
  // Exibido como "Tempo médio de entrega: {texto}" — nunca como garantia.
  deliveryTimeText: null,

  // ── Campanha de lançamento ────────────────────────────────────
  launchCoupon:         '',
  launchCouponLabel:    '',
  launchCouponWAMsg:    '',

  // ── Analytics ─────────────────────────────────────────────────
  // Preencher após configurar GA4 e Meta Pixel — NÃO colocar IDs falsos
  analyticsConfig: {
    gaMeasurementId: '',   // TODO: ex: 'G-XXXXXXXXXX'
    metaPixelId:     '',   // TODO: ex: '123456789012345'
  },

  // ── A/B Hero ──────────────────────────────────────────────────
  // 'A' | 'B' | 'C' — altera o título e subtítulo do hero
  heroVariant: 'A',

  // ── Feature flags ─────────────────────────────────────────────
  // Ligue cada flag quando o recurso estiver ativo de verdade:
  isIfoodAnnounced:      true,   // canal confirmado; link oficial ainda pendente
  isIfoodActive:         false,  // exibe botão/link do iFood
  isGoogleRatingActive:  false,  // exibe ★ 4.9 e depoimentos reais
  isInstagramActive:     false,  // exibe link do Instagram
  isClubActive:          false,  // ativar após persistência segura e regras confirmadas
  isLaunchCouponActive:  false,  // ativar somente com cupom confirmado
  isFlashOfferActive:    false,  // ativar somente com oferta confirmada
  isReviewsActive:       false,  // ativar somente com depoimentos reais autorizados
  isCustomBurgerActive:  false,  // adicionais e preços ainda não confirmados
  isMeatStoryActive:     false,  // ativar somente após confirmar origem, moagem e blend
  isLocalSeoPagesActive: false,  // páginas antigas têm conteúdo comercial ainda não homologado
  isDeliveryActive:      true,   // exibe fluxo de delivery
  isLaunched:            false,  // esconde prova social de volume (4 mil pedidos) até inaugurar
};
