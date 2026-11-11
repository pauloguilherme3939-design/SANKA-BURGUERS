'use strict';

// Grade aprovada pelo proprietário; ativação somente nesta candidata isolada.
const BUSINESS_HOURS = require('./business-hours.json');
const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function minute(value) {
  if (typeof value !== 'string' || !CLOCK.test(value)) throw new Error('Horário inválido.');
  const [hour, minutes] = value.split(':').map(Number);
  return hour * 60 + minutes;
}

function validateHours(config) {
  if (!config || typeof config.approved !== 'boolean' || typeof config.enforce !== 'boolean' ||
      config.timeZone !== 'America/Sao_Paulo' || !config.week || Object.keys(config.week).length !== 7) {
    throw new Error('Configuração de funcionamento inválida.');
  }
  // Atualmente um intervalo por dia, inclusive intervalos que terminam no dia seguinte.
  for (let day = 0; day < 7; day++) {
    const slots = config.week[day];
    if (!Array.isArray(slots) || slots.length > 1) throw new Error('Grade diária inválida.');
    for (const slot of slots) {
      if (!slot || minute(slot.opens) === minute(slot.closes)) throw new Error('Intervalo inválido.');
    }
  }
  // Recusar sobreposição entre um intervalo noturno e a abertura do dia seguinte.
  for (let day = 0; day < 7; day++) {
    const slot = config.week[day][0], next = config.week[(day + 1) % 7][0];
    if (slot && next && minute(slot.closes) < minute(slot.opens) && minute(next.opens) < minute(slot.closes)) {
      throw new Error('Intervalos sobrepostos.');
    }
  }
  return config;
}

function isOpenAt(instant, config = BUSINESS_HOURS) {
  validateHours(config);
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) throw new Error('Instante inválido.');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const day = ENGLISH_DAYS.indexOf(parts.weekday), current = Number(parts.hour) * 60 + Number(parts.minute);
  const today = config.week[day][0], yesterday = config.week[(day + 6) % 7][0];
  // Abertura inclusiva; fechamento exclusivo. 00:00 encerra o dia anterior.
  if (today) {
    const start = minute(today.opens), end = minute(today.closes);
    if (end > start ? current >= start && current < end : current >= start) return true;
  }
  return Boolean(yesterday && minute(yesterday.closes) < minute(yesterday.opens) && current < minute(yesterday.closes));
}

function orderingState(instant, config = BUSINESS_HOURS) {
  // Desativada mantém o comportamento homologado; não implica aprovação dos horários.
  if (config?.enforce === false) return { allowed: true, reason: 'not_enforced' };
  try {
    validateHours(config);
    if (!config.approved) return { allowed: false, reason: 'not_approved' };
    return { allowed: isOpenAt(instant, config), reason: 'schedule' };
  } catch {
    return { allowed: false, reason: 'invalid_configuration' };
  }
}

// Estado público fornecido pelo relógio do servidor, sem divulgar a grade pendente.
function publicOpeningState(instant, config = BUSINESS_HOURS) {
  const result = orderingState(instant, config);
  if (result.reason === 'not_enforced') return { state: 'pending', message: 'Horários em confirmação. Aguarde a confirmação da Sanka.', enforced: false };
  if (result.reason !== 'schedule') return { state: 'unavailable', message: 'Não foi possível confirmar o funcionamento. Tente novamente.', enforced: true };
  return result.allowed
    ? { state: 'open', message: 'Loja aberta para novos pedidos.', enforced: true }
    : { state: 'closed', message: 'Loja fechada para novos pedidos. Você pode consultar o cardápio.', enforced: true };
}

function displayTime(value) { return value.replace(':', 'h'); }
function displayHours(config = BUSINESS_HOURS) {
  validateHours(config);
  return [1, 2, 3, 4, 5, 6, 0].map(day => {
    const slot = config.week[day][0];
    return { day: DAYS[day], hours: slot ? `${displayTime(slot.opens)} às ${displayTime(slot.closes)}` : 'Fechado', ...(!slot ? { closed: true } : {}) };
  });
}

function groupedDays(config) {
  const groups = [];
  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    const slot = config.week[day][0];
    const last = groups[groups.length - 1];
    if (last && JSON.stringify(last.slot) === JSON.stringify(slot)) last.days.push(day);
    else groups.push({ days: [day], slot });
  }
  return groups;
}

function hoursSummary(config = BUSINESS_HOURS) {
  validateHours(config);
  const groups = groupedDays(config);
  const names = days => days.map((day, index) => index ? DAYS[day].toLowerCase() : DAYS[day]).join(' e ');
  const opened = groups.filter(group => group.slot).map(({ days, slot }, index) => `${index ? names(days).toLowerCase() : names(days)}, ${displayTime(slot.opens)} às ${displayTime(slot.closes)}`).join('; ');
  const closed = groups.filter(group => !group.slot).map(({ days }) => `${names(days)}, fechado`).join('; ');
  return [opened, closed].filter(Boolean).join('. ') + '.';
}

function structuredHours(config = BUSINESS_HOURS) {
  validateHours(config);
  return groupedDays(config).filter(group => group.slot).map(({ days, slot }) => ({
    '@type': 'OpeningHoursSpecification', dayOfWeek: days.length === 1 ? ENGLISH_DAYS[days[0]] : days.map(day => ENGLISH_DAYS[day]),
    opens: slot.opens, closes: slot.closes,
  }));
}

module.exports = { BUSINESS_HOURS, validateHours, isOpenAt, orderingState, publicOpeningState, displayHours, hoursSummary, structuredHours };
