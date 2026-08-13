// lib/config.js — Sanka Burgers · Configurações globais do pedido

import orderRules from './order-rules.json'

export const SANKA_CONFIG = {
  whatsapp: '5516993138450',
  ...orderRules,
};
