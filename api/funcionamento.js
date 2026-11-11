'use strict';
const { BUSINESS_HOURS, publicOpeningState } = require('../lib/business-hours.js');

// Leitura pura: não importa storage, aplicação, credenciais ou inicializador de schema.
function createOpeningHoursHandler({ config = BUSINESS_HOURS, now = () => new Date() } = {}) {
  return function openingHoursHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).json({ error: 'Método não permitido.' });
    const instant = now();
    if (req.method === 'HEAD') return res.status(200).end();
    return res.json({ ...publicOpeningState(instant, config), timeZone: 'America/Sao_Paulo', checkedAt: instant.toISOString() });
  };
}

module.exports = createOpeningHoursHandler();
module.exports.createOpeningHoursHandler = createOpeningHoursHandler;
