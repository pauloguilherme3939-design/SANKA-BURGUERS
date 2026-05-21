// lib/config.js — Sanka Burgers · Configurações globais do pedido

export const SANKA_CONFIG = {
  whatsapp: '5516993138450',

  // Taxa de entrega (R$). 0 = grátis acima de freeDeliveryAbove
  deliveryFee: 6.00,

  // Entrega grátis acima de (coloca 0 para nunca)
  freeDeliveryAbove: 80.00,

  // Cupons válidos — hardcoded por enquanto, trocar por endpoint depois
  coupons: {
    'SANKA10':  { type: 'percent', value: 10, label: '10% de desconto'   },
    'BEMVINDO': { type: 'fixed',   value: 5,  label: 'R$ 5,00 off'       },
    'PRIMEIRA': { type: 'fixed',   value: 8,  label: 'R$ 8,00 na 1ª compra' },
  },
};

