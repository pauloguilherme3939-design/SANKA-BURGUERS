'use strict';

const ROULETTE_TIME_ZONE = 'America/Sao_Paulo';

const ROULETTE_CONFIG = Object.freeze({
  schemaVersion: 1,
  maxSpinsPerPhonePerDay: 1,
  validity: 'same_day',
  timeZone: ROULETTE_TIME_ZONE,
  stackable: false,
  appliesToDeliveryFee: false,
  prizes: Object.freeze([
    Object.freeze({
      id: 'try_again',
      label: 'Tente novamente',
      description: 'Hoje não saiu benefício.',
      type: 'no_prize',
      chancePercent: 55,
    }),
    Object.freeze({
      id: 'discount_5',
      label: '5% de desconto',
      description: '5% nos itens do pedido, limitado a R$ 3,00.',
      type: 'discount',
      chancePercent: 25,
      discountPercent: 5,
      minimumSubtotalCents: 2500,
      maximumDiscountCents: 300,
    }),
    Object.freeze({
      id: 'discount_10',
      label: '10% de desconto',
      description: '10% nos itens do pedido, limitado a R$ 5,00.',
      type: 'discount',
      chancePercent: 10,
      discountPercent: 10,
      minimumSubtotalCents: 3500,
      maximumDiscountCents: 500,
    }),
    Object.freeze({
      id: 'discount_25',
      label: '25% de desconto',
      description: '25% nos itens do pedido, limitado a R$ 7,50.',
      type: 'discount',
      chancePercent: 1,
      discountPercent: 25,
      minimumSubtotalCents: 5000,
      maximumDiscountCents: 750,
    }),
    Object.freeze({
      id: 'fries_250',
      label: 'Batata pequena 250 g',
      description: 'Uma batata pequena de 250 g em pedido a partir de R$ 35,00.',
      type: 'free_item',
      chancePercent: 8,
      minimumSubtotalCents: 3500,
      freeItem: Object.freeze({ id: 'ROULETTE-FRIES-250', name: 'Batata pequena 250 g', quantity: 1 }),
      informedRetailPriceCents: 1490,
      provisionalRawPotatoCostCents: 313,
    }),
    Object.freeze({
      id: 'fries_500',
      label: 'Batata 500 g',
      description: 'Uma porção de batata de 500 g em pedido a partir de R$ 60,00.',
      type: 'free_item',
      chancePercent: 1,
      minimumSubtotalCents: 6000,
      freeItem: Object.freeze({ id: 'SK-P01', name: 'Fritas 500 g', quantity: 1 }),
      informedRetailPriceCents: 3000,
      provisionalRawPotatoCostCents: 625,
    }),
  ]),
});

function validateRouletteConfig(config = ROULETTE_CONFIG) {
  const prizes = Array.isArray(config?.prizes) ? config.prizes : [];
  const totalChancePercent = prizes.reduce((sum, prize) => sum + Number(prize.chancePercent || 0), 0);
  const ids = new Set(prizes.map(prize => prize.id));
  const errors = [];
  if (!prizes.length) errors.push('A roleta precisa ter prêmios.');
  if (Math.abs(totalChancePercent - 100) > 0.000001) errors.push('As probabilidades precisam somar 100%.');
  if (ids.size !== prizes.length) errors.push('Os identificadores dos prêmios precisam ser únicos.');
  for (const prize of prizes) {
    if (!prize.id || !prize.label || !prize.type) errors.push('Prêmio incompleto.');
    if (!Number.isFinite(prize.chancePercent) || prize.chancePercent <= 0) errors.push(`Chance inválida em ${prize.id}.`);
    if (prize.type === 'discount') {
      if (!Number.isFinite(prize.discountPercent) || prize.discountPercent <= 0) errors.push(`Desconto inválido em ${prize.id}.`);
      if (!Number.isInteger(prize.minimumSubtotalCents) || prize.minimumSubtotalCents < 0) errors.push(`Pedido mínimo inválido em ${prize.id}.`);
      if (!Number.isInteger(prize.maximumDiscountCents) || prize.maximumDiscountCents < 1) errors.push(`Teto inválido em ${prize.id}.`);
    }
    if (prize.type === 'free_item' && (!prize.freeItem?.id || !prize.freeItem?.name)) {
      errors.push(`Item gratuito inválido em ${prize.id}.`);
    }
  }
  return { valid: errors.length === 0, totalChancePercent, errors };
}

function selectPrize(prizes, draw) {
  if (!Number.isInteger(draw) || draw < 0 || draw >= 10000) throw new Error('Sorteio deve estar entre 0 e 9999.');
  let cursor = draw;
  for (const prize of prizes) {
    cursor -= Math.round(prize.chancePercent * 100);
    if (cursor < 0) return prize;
  }
  throw new Error('Configuração de probabilidades inválida.');
}

module.exports = {
  ROULETTE_CONFIG,
  ROULETTE_TIME_ZONE,
  selectPrize,
  validateRouletteConfig,
};
