'use strict';

const { createOrderService, OrderError } = require('../lib/orders.js');
const { createDefaultOrderStore, StorageError } = require('../lib/order-store.js');

let defaultService;

function getDefaultService() {
  if (!defaultService) defaultService = createOrderService({ store: createDefaultOrderStore() });
  return defaultService;
}

function createOrderHandler({ service, adminPassword } = {}) {
  return async function orderHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Allow', 'GET, POST, PATCH, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
      const orderService = service || getDefaultService();

      if (req.method === 'GET' && req.query?.list !== undefined) {
        const password = adminPassword ?? process.env.ADMIN_PASSWORD;
        if (!password) return res.status(503).json({ error: 'ADMIN_PASSWORD não configurado.' });
        if ((req.headers.authorization || '') !== `Bearer ${password}`) {
          return res.status(401).json({ error: 'Não autorizado.' });
        }
        const orders = await orderService.list(req.query.day);
        return res.json(orders);
      }

      if (req.method === 'GET') {
        const order = await orderService.getPublic(req.query?.id);
        return res.json(order);
      }

      if (req.method === 'POST') {
        const order = await orderService.create(req.body);
        return res.status(201).json({ id: order.id, order });
      }

      if (req.method === 'PATCH') {
        const password = adminPassword ?? process.env.ADMIN_PASSWORD;
        if (!password) return res.status(503).json({ error: 'ADMIN_PASSWORD não configurado.' });
        if ((req.headers.authorization || '') !== `Bearer ${password}`) {
          return res.status(401).json({ error: 'Não autorizado.' });
        }
        const order = await orderService.updateStatus(req.query?.id, req.body?.status);
        return res.json(order);
      }

      return res.status(405).json({ error: 'Método não permitido.' });
    } catch (error) {
      if (error instanceof OrderError) {
        return res.status(error.status).json({ error: error.message, code: error.code, fields: error.fields });
      }
      if (error instanceof StorageError) {
        console.error(`[pedido] Falha de persistência: ${error.message}`);
        return res.status(503).json({ error: 'Não foi possível persistir o pedido. Tente novamente.' });
      }
      console.error(`[pedido] Erro inesperado: ${error?.message || 'erro desconhecido'}`);
      return res.status(500).json({ error: 'Erro interno ao processar o pedido.' });
    }
  };
}

module.exports = createOrderHandler();
module.exports.createOrderHandler = createOrderHandler;
