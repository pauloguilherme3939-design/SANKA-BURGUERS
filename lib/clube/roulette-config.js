// lib/clube/roulette-config.js — Configuração padrão da Roleta Sanka
// Edite as chances, prêmios e regras aqui.
// Overrides do admin são gravados em localStorage (sanka_roulette_config)
// e têm prioridade sobre estes defaults.

export const DEFAULT_ROULETTE_CONFIG = {

  /* ── Controle de modo ───────────────────────────────────────── */
  rouletteEnabled: false,           // master switch
  rouletteMode: 'preview',         // 'preview' | 'active' | 'disabled'

  /* ── Elegibilidade ──────────────────────────────────────────── */
  requiresClubSignup: true,        // exige cadastro no Clube
  requiresConfirmedOrder: false,   // exige pedido confirmado (reservado p/ backend)

  /* ── Limites e cooldown ─────────────────────────────────────── */
  maxSpinsPerUserPerDay:  1,
  maxSpinsPerUserPerWeek: 1,
  cooldownHours:          24,

  /* ── Validade dos prêmios ───────────────────────────────────── */
  prizeValidityDays: 7,

  /* ── Catálogo de prêmios ────────────────────────────────────── */
  // REGRA: chance deve somar 100 entre os itens active:true
  prizes: [
    {
      id:        'no_prize',
      label:     'Não foi dessa vez',
      desc:      'Hoje a chapa não liberou prêmio, mas você continua acumulando pontos no Clube Sanka.',
      type:      'no_prize',
      chance:    40,
      emoji:     '😅',
      color:     '#292524',
      textColor: '#6B7280',
      active:    true,
      value:     null,
    },
    {
      id:        'points_10',
      label:     '+10 pts no Clube',
      desc:      '10 pontos creditados no seu saldo do Clube Sanka.',
      type:      'points',
      chance:    25,
      emoji:     '⭐',
      color:     '#7C2D12',
      textColor: '#fff',
      active:    true,
      value:     10,
    },
    {
      id:        'molho_extra',
      label:     'Molho extra',
      desc:      'Escolha qualquer molho da casa no seu pedido.',
      type:      'coupon',
      chance:    15,
      emoji:     '🧴',
      color:     '#1E3A5F',
      textColor: '#fff',
      active:    true,
      value:     null,
    },
    {
      id:        'queijo_extra',
      label:     'Queijo extra',
      desc:      'Queijo extra no seu burger sem custo adicional.',
      type:      'coupon',
      chance:    10,
      emoji:     '🧀',
      color:     '#92400E',
      textColor: '#fff',
      active:    true,
      value:     null,
    },
    {
      id:        'batata_peq',
      label:     'Batata pequena',
      desc:      'Uma porção pequena de batata frita.',
      type:      'coupon',
      chance:    6,
      emoji:     '🍟',
      color:     '#A16207',
      textColor: '#fff',
      active:    true,
      value:     null,
    },
    {
      id:        'desconto_10',
      label:     'Cupom 10% OFF',
      desc:      '10% de desconto no próximo pedido.',
      type:      'discount',
      chance:    3,
      emoji:     '💸',
      color:     '#3B0764',
      textColor: '#fff',
      active:    true,
      value:     10,
    },
    {
      id:        'combo_surpresa',
      label:     'Combo surpresa',
      desc:      'Combo especial da Sanka. Disponível apenas quando campanha estiver ativa.',
      type:      'special',
      chance:    1,
      emoji:     '🎁',
      color:     '#1C3144',
      textColor: '#fff',
      active:    true,
      value:     null,
    },
  ],
};

// Valida soma das chances — use no admin para alertar
export function validateChances(prizes) {
  const active = prizes.filter(p => p.active !== false);
  const sum    = active.reduce((s, p) => s + (Number(p.chance) || 0), 0);
  return { sum, valid: Math.abs(sum - 100) < 0.01 };
}
