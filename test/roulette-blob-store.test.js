'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { BlobRouletteStore } = require('../lib/roulette-store.js');

function mockBlob() {
  const files = new Map();
  return {
    files,
    client: {
      async put(pathname, body) {
        if (files.has(pathname)) throw new Error('already exists');
        const url = `https://blob.test/${encodeURIComponent(pathname)}`;
        files.set(pathname, { pathname, body, url });
        return { pathname, url };
      },
      async list({ prefix }) {
        return {
          blobs: [...files.values()].filter(file => file.pathname.startsWith(prefix)).map(({ pathname, url }) => ({ pathname, url })),
          hasMore: false,
        };
      },
    },
    async fetchImpl(url) {
      const file = [...files.values()].find(candidate => candidate.url === url);
      return file
        ? { ok: true, status: 200, async text() { return file.body; } }
        : { ok: false, status: 404, async text() { return ''; } };
    },
  };
}

test('Vercel Blob persiste giro cifrado, sem telefone ou código em texto público', async () => {
  const blob = mockBlob();
  const store = new BlobRouletteStore({
    blob: blob.client,
    fetchImpl: blob.fetchImpl,
    token: 'token-test',
    secret: 'roulette-blob-secret-with-more-than-thirty-two-characters',
  });
  const record = {
    schemaVersion: 1,
    id: 'spin-test',
    day: '2026-08-21',
    phoneHash: 'a'.repeat(64),
    prizeId: 'discount_5',
    prizeSnapshot: { id: 'discount_5', label: '5% de desconto', type: 'discount' },
    codeHash: 'b'.repeat(64),
    status: 'issued',
    createdAt: '2026-08-21T15:00:00.000Z',
    validOn: '2026-08-21',
  };
  await store.create(record);
  const publicBody = [...blob.files.values()][0].body;
  assert.doesNotMatch(publicBody, /discount_5|5% de desconto|a{20}|b{20}/);
  const loaded = await store.getByPhone(record.day, record.phoneHash);
  assert.equal(loaded.prizeId, 'discount_5');
  assert.equal(loaded.status, 'issued');
});

test('Vercel Blob rejeita segundo giro e segundo consumo nos mesmos caminhos imutáveis', async () => {
  const blob = mockBlob();
  const store = new BlobRouletteStore({
    blob: blob.client,
    fetchImpl: blob.fetchImpl,
    token: 'token-test',
    secret: 'roulette-blob-secret-with-more-than-thirty-two-characters',
  });
  const record = {
    schemaVersion: 1,
    id: 'spin-test',
    day: '2026-08-21',
    phoneHash: 'a'.repeat(64),
    prizeId: 'discount_5',
    prizeSnapshot: { id: 'discount_5', label: '5% de desconto', type: 'discount' },
    codeHash: 'b'.repeat(64),
    status: 'issued',
    createdAt: '2026-08-21T15:00:00.000Z',
    validOn: '2026-08-21',
  };
  const event = {
    kind: 'used',
    ts: '2026-08-21T16:00:00.000Z',
    orderId: 'SK-TEST',
    benefit: { type: 'discount', amountCents: 125 },
  };

  await store.create(record);
  await assert.rejects(store.create(record), { name: 'DuplicateSpinError' });
  await store.claimUse(record, event);
  await assert.rejects(store.claimUse(record, event), { name: 'DuplicateUseError' });
});
