// lib/clube/config.js — Configuração do sistema de fidelidade Sanka
// Edite aqui para ajustar pontos, tiers e catálogo de recompensas.

export const POINTS_CONFIG = {
  earnPerReal:     1,   // pontos por real gasto
  bonusSignup:    20,   // bônus ao se cadastrar
  bonusFirstOrder: 30,  // bônus no primeiro pedido
  bonusBirthday:  50,   // bônus no mês de aniversário
};

export const TIERS = [
  {
    id: 'cliente',
    label: 'Cliente Sanka',
    emoji: '⭐',
    min: 0,
    max: 99,
    color: '#6B7280',
    perks: ['Roleta diária de pontos', 'Bônus de cadastro (20 pts)'],
  },
  {
    id: 'fome',
    label: 'Fome de Respeito',
    emoji: '🔥',
    min: 100,
    max: 299,
    color: '#F59E0B',
    perks: ['Tudo do anterior', '+10% pontos em pedidos', 'Promoções exclusivas'],
  },
  {
    id: 'prensado',
    label: 'Prensado Raiz',
    emoji: '💥',
    min: 300,
    max: 599,
    color: '#EA580C',
    perks: ['Tudo do anterior', 'Acesso a recompensas VIP', 'Prioridade no atendimento'],
  },
  {
    id: 'lenda',
    label: 'Lenda da Chapa',
    emoji: '🏆',
    min: 600,
    max: Infinity,
    color: '#8B5CF6',
    perks: ['Tudo do anterior', 'Brinde surpresa mensal', 'Status VIP permanente'],
  },
];

export const REWARDS_CATALOG = [
  { id: 'molho',  title: 'Molho Extra',      desc: 'Qualquer molho da casa',            points: 50,  emoji: '🧴', type: 'product',  active: true },
  { id: 'queijo', title: 'Queijo Extra',     desc: 'Fatia de queijo no seu burger',     points: 80,  emoji: '🧀', type: 'product',  active: true },
  { id: 'batata', title: 'Porção de Batata', desc: 'Porção crocante de batata frita',   points: 120, emoji: '🍟', type: 'product',  active: true },
  { id: 'refri',  title: 'Refrigerante',     desc: 'Lata 350ml à sua escolha',          points: 150, emoji: '🥤', type: 'product',  active: true },
  { id: 'desc10', title: 'R$10 de Desconto', desc: 'Desconto direto no próximo pedido', points: 250, emoji: '💸', type: 'discount', active: true },
  { id: 'combo',  title: 'Combo Surpresa',   desc: 'Burger + Batata + Refri da casa',   points: 400, emoji: '🎁', type: 'combo',    active: true },
];

export const SPIN_PRIZES = [
  { points: 5,  label: '+5 pts',  prob: 30, emoji: '⭐', color: '#292524', textColor: '#8A7D6E' },
  { points: 10, label: '+10 pts', prob: 25, emoji: '🌟', color: '#1C1917', textColor: '#8A7D6E' },
  { points: 15, label: '+15 pts', prob: 20, emoji: '🔥', color: '#7C2D12', textColor: '#fff'    },
  { points: 20, label: '+20 pts', prob: 12, emoji: '💥', color: '#92400E', textColor: '#fff'    },
  { points: 30, label: '+30 pts', prob:  8, emoji: '🚀', color: '#B91C1C', textColor: '#fff'    },
  { points: 50, label: '+50 pts', prob:  4, emoji: '💎', color: '#3B0764', textColor: '#fff'    },
  { points: 0,  label: 'AMANHÃ',  prob:  1, emoji: '😅', color: '#374151', textColor: '#6B7280' },
];
