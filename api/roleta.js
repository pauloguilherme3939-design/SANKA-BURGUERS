'use strict';

const { createDefaultOrderStore, StorageError } = require('../lib/order-store.js');
const { createDefaultRouletteStore } = require('../lib/roulette-store.js');
const {
  createRouletteService,
  RouletteError,
  rouletteEnabledFromEnv,
} = require('../lib/roulette.js');
const { tryNormalizeBrazilianPhone } = require('../lib/br-phone.js');
const {
  getDefaultAbuseProtection,
  RateLimitError,
  safeAdminPasswordMatches,
} = require('../lib/abuse.js');

let defaultService;

function getDefaultService() {
  if (!defaultService) {
    defaultService = createRouletteService({
      store: createDefaultRouletteStore(),
      orderStore: createDefaultOrderStore(),
      secret: process.env.ORDER_DATA_SECRET,
      enabled: rouletteEnabledFromEnv(),
    });
  }
  return defaultService;
}

function createRouletteHandler({ service, adminPassword, abuseProtection } = {}) {
  return async function rouletteHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Allow', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
      const rouletteService = service || getDefaultService();
      const protection = abuseProtection || (!service ? getDefaultAbuseProtection() : null);
      const action = String(req.query?.action || 'config').toLowerCase();

      if (req.method === 'GET' && action === 'config') {
        return res.json(rouletteService.getPublicConfig());
      }
      if (req.method === 'POST' && action === 'spin') {
        if (protection && rouletteService.getPublicConfig().enabled) {
          await protection.enforce('roulette_spin', req, res, {
            phone: tryNormalizeBrazilianPhone(req.body?.phone),
          });
        }
        const result = await rouletteService.spin(req.body || {});
        return res.status(201).json(result);
      }
      if (req.method === 'POST' && action === 'consume') {
        if (protection && rouletteService.getPublicConfig().enabled) {
          await protection.enforce('roulette_consume', req, res);
        }
        const result = await rouletteService.consume(req.body || {});
        return res.json(result);
      }
      if (req.method === 'POST' && action === 'cancel') {
        const password = adminPassword ?? process.env.ADMIN_PASSWORD;
        if (!password) return res.status(503).json({ error: 'ADMIN_PASSWORD não configurado.' });
        if (!safeAdminPasswordMatches(req.headers.authorization, password)) {
          if (protection) await protection.enforce('admin_failure', req, res);
          return res.status(401).json({ error: 'Não autorizado.' });
        }
        if (protection) await protection.enforce('admin_action', req, res);
        const result = await rouletteService.cancel(req.body || {});
        return res.json(result);
      }
      return res.status(405).json({ error: 'Método ou ação não permitidos.' });
    } catch (error) {
      if (error instanceof RouletteError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      if (error instanceof RateLimitError) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
        return res.status(429).json({ error: error.message, code: error.code });
      }
      if (error instanceof StorageError) {
        console.error('[roleta] Falha de persistência.');
        return res.status(503).json({ error: 'Não foi possível persistir a operação da Roleta.' });
      }
      console.error('[roleta] Erro inesperado.');
      return res.status(500).json({ error: 'Erro interno ao processar a Roleta.' });
    }
  };
}

module.exports = createRouletteHandler();
module.exports.createRouletteHandler = createRouletteHandler;
