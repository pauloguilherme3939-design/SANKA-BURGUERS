'use strict';

const { createOrderService, OrderError } = require('../lib/orders.js');
const { createDefaultOrderStore, StorageError } = require('../lib/order-store.js');
const { createDefaultRouletteStore } = require('../lib/roulette-store.js');
const { createRouletteService } = require('../lib/roulette.js');
const { tryNormalizeBrazilianPhone } = require('../lib/br-phone.js');
const {
  getDefaultAbuseProtection,
  RateLimitError,
  safeAdminPasswordMatches,
} = require('../lib/abuse.js');

let defaultService;
let defaultBenefitCancellation;

function getDefaultService() {
  if (!defaultService) defaultService = createOrderService({ store: createDefaultOrderStore() });
  return defaultService;
}

function getDefaultBenefitCancellation() {
  if (!defaultBenefitCancellation) {
    const rouletteService = createRouletteService({
      store: createDefaultRouletteStore(),
      orderStore: createDefaultOrderStore(),
      secret: process.env.ORDER_DATA_SECRET,
      enabled: false,
    });
    defaultBenefitCancellation = (orderId) => rouletteService.cancelByOrderId(orderId, 'pedido_cancelado');
  }
  return defaultBenefitCancellation;
}

function createOrderHandler({ service, adminPassword, abuseProtection, cancelBenefits } = {}) {
  return async function orderHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Allow', 'GET, POST, PATCH, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
      const orderService = service || getDefaultService();
      const protection = abuseProtection || (!service ? getDefaultAbuseProtection() : null);

      if (req.method === 'GET' && req.query?.list !== undefined) {
        const password = adminPassword ?? process.env.ADMIN_PASSWORD;
        if (!password) return res.status(503).json({ error: 'ADMIN_PASSWORD não configurado.' });
        if (!safeAdminPasswordMatches(req.headers.authorization, password)) {
          if (protection) await protection.enforce('admin_failure', req, res);
          return res.status(401).json({ error: 'Não autorizado.' });
        }
        if (protection) await protection.enforce('admin_action', req, res);
        const orders = await orderService.list(req.query.day);
        return res.json(orders);
      }

      if (req.method === 'GET') {
        const order = await orderService.getPublic(req.query?.id);
        return res.json(order);
      }

      if (req.method === 'POST') {
        if (protection) {
          await protection.enforce('order_create', req, res, {
            phone: tryNormalizeBrazilianPhone(req.body?.customer?.phone),
          });
        }
        const order = await orderService.create(req.body);
        return res.status(201).json({ id: order.id, order });
      }

      if (req.method === 'PATCH') {
        const password = adminPassword ?? process.env.ADMIN_PASSWORD;
        if (!password) return res.status(503).json({ error: 'ADMIN_PASSWORD não configurado.' });
        if (!safeAdminPasswordMatches(req.headers.authorization, password)) {
          if (protection) await protection.enforce('admin_failure', req, res);
          return res.status(401).json({ error: 'Não autorizado.' });
        }
        if (protection) await protection.enforce('admin_action', req, res);
        let order;
        if (req.body?.action === 'cancel') {
          order = await orderService.cancel(req.query?.id, {
            reasonCode: 'administrative',
            reason: req.body?.reason,
          });
          const invalidate = cancelBenefits || (!service ? getDefaultBenefitCancellation() : null);
          if (invalidate) await invalidate(order.id);
        } else {
          order = await orderService.updateStatus(req.query?.id, req.body?.status);
        }
        return res.json(order);
      }

      return res.status(405).json({ error: 'Método não permitido.' });
    } catch (error) {
      if (error instanceof OrderError) {
        return res.status(error.status).json({ error: error.message, code: error.code, fields: error.fields });
      }
      if (error instanceof RateLimitError) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
        return res.status(429).json({ error: error.message, code: error.code });
      }
      if (error instanceof StorageError) {
        console.error('[pedido] Falha de persistência.');
        return res.status(503).json({ error: 'Não foi possível persistir o pedido. Tente novamente.' });
      }
      console.error('[pedido] Erro inesperado.');
      return res.status(500).json({ error: 'Erro interno ao processar o pedido.' });
    }
  };
}

module.exports = createOrderHandler();
module.exports.createOrderHandler = createOrderHandler;
