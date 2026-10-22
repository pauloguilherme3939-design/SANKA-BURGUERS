// lib/config.js — Sanka Burgers · Configurações globais do pedido

import orderRules from './order-rules.json'
import { SANKA_BRAND } from './brand.js'

export const SANKA_CONFIG = {
  whatsapp: SANKA_BRAND.whatsapp,   // fonte única: lib/brand.js
  ...orderRules,
};
