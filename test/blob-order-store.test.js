'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createOrderService } = require('../lib/orders.js');
const { BlobOrderStore } = require('../lib/order-store.js');

function fakeBlobClient() {
  const files = new Map();
  return {
    files,
    async put(pathname, body) {
      const url = `https://blob.test/${encodeURIComponent(pathname)}`;
      files.set(pathname, { pathname, url, body });
      return { pathname, url };
    },
    async list({ prefix }) {
      const blobs = Array.from(files.values())
        .filter(file => file.pathname.startsWith(prefix))
        .map(({ pathname, url }) => ({ pathname, url }));
      return { blobs, hasMore: false };
    },
    async fetch(url) {
      const file = Array.from(files.values()).find(candidate => candidate.url === url);
      return file
        ? { ok: true, status: 200, async text() { return file.body; } }
        : { ok: false, status: 404, async text() { return ''; } };
    },
  };
}

test('Vercel Blob guarda dados cifrados e recompõe pedido e eventos', async () => {
  const fake = fakeBlobClient();
  const store = new BlobOrderStore({
    blob: fake,
    fetchImpl: fake.fetch,
    token: 'token-de-teste',
    secret: 'segredo-de-teste-com-mais-de-32-caracteres',
  });
  const id = 'SK-20260813-BBBBBBBBBBBBBBBB';
  let tick = 0;
  const service = createOrderService({
    store,
    now: () => new Date(Date.parse('2026-08-13T15:00:00.000Z') + tick++ * 1000),
    idFactory: () => id,
  });

  await service.create({
    customer: { name: 'Pessoa Privada', phone: '19999990000' },
    items: [{ id: 'SK-P01', qty: 1 }],
    fulfillment: { type: 'pickup' },
    payment: { method: 'pix' },
  });
  await service.updateStatus(id, 'preparando');

  const rawDocuments = Array.from(fake.files.values()).map(file => file.body).join('\n');
  assert.equal(rawDocuments.includes('Pessoa Privada'), false);
  assert.equal(rawDocuments.includes('19999990000'), false);
  assert.match(rawDocuments, /aes-256-gcm/);

  const restartedStore = new BlobOrderStore({
    blob: fake,
    fetchImpl: fake.fetch,
    token: 'token-de-teste',
    secret: 'segredo-de-teste-com-mais-de-32-caracteres',
  });
  const restarted = createOrderService({ store: restartedStore });
  const listed = await restarted.list('2026-08-13');
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, 'preparando');
  assert.equal(listed[0].customer.name, 'Pessoa Privada');
});
