// lib/brand.js — Configuração central da marca Sanka Burgers
// Altere aqui para propagar para todo o site.

export const SANKA_BRAND = {
  // ── Identidade ──────────────────────────────────────────────
  name:        'Sanka Burgers',
  tagline:     'Bateu fome? Sanka resolve.',
  positioning: 'Lanchão Prensado Estilo São Carlos',

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
