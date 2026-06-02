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

  // ── Horário ───────────────────────────────────────────────────
  openingHours: 'Ter — Dom, das 18h às 23h30',
  closedDay:    'Segunda-feira',

  // ── Contato ───────────────────────────────────────────────────
  whatsapp:     '5516993138450',
  instagramUrl: '',       // TODO: URL do Instagram
  ifoodUrl:     '',       // TODO: URL do iFood
  googleMapsUrl:'',       // TODO: URL Google Maps

  // ── Campanha de lançamento ────────────────────────────────────
  launchCoupon:         'SANKA10',
  launchCouponLabel:    '10% OFF na primeira compra',
  launchCouponWAMsg:    'Olá! Quero garantir meu cupom SANKA10 para o meu primeiro pedido na Sanka Burgers.',

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
  isIfoodActive:         false,  // exibe botão/link do iFood
  isGoogleRatingActive:  false,  // exibe ★ 4.9 e depoimentos reais
  isInstagramActive:     false,  // exibe link do Instagram
  isClubActive:          true,   // exibe CTA do Clube Sanka
  isDeliveryActive:      true,   // exibe fluxo de delivery
  isLaunched:            false,  // esconde prova social de volume (4 mil pedidos) até inaugurar
};
