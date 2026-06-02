// lib/config.js — Sanka Burgers · Configurações globais do pedido

export const SANKA_CONFIG = {
  whatsapp: '5516993138450',

  // Taxa de entrega (R$). 0 = grátis acima de freeDeliveryAbove
  deliveryFee: 6.00,

  // Entrega grátis acima de (coloca 0 para nunca)
  freeDeliveryAbove: 80.00,

  // Cupons válidos — hardcoded por enquanto, trocar por endpoint depois
  coupons: {
    // Cupons manuais
    'BEMVINDO': { type: 'fixed',   value: 5,  label: 'R$ 5,00 off'           },
    'PRIMEIRA': { type: 'fixed',   value: 8,  label: 'R$ 8,00 na 1ª compra'  },
    // Cupons da roleta do Clube Sanka
    'SANKA10':  { type: 'percent', value: 10, label: '10% de desconto'        },
    'SANKA15':  { type: 'percent', value: 15, label: '15% de desconto'        },
    'SANKA20':  { type: 'percent', value: 20, label: '20% de desconto'        },
    'SANKA25':  { type: 'percent', value: 25, label: '25% de desconto'        },
    'BEBIDA':   { type: 'free',    value: 0,  label: 'Bebida grátis'          },
    'BATATA':   { type: 'free',    value: 0,  label: 'Porção de batata grátis'},
    'FRETE0':   { type: 'delivery',value: 0,  label: 'Frete grátis'           },
  },
};

