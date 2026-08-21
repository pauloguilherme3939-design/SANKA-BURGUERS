'use strict';

const crypto = require('crypto');
const { decryptDocument, encryptDocument, StorageError } = require('./order-store.js');

class MemoryAbuseStore {
  constructor() {
    this.attempts = [];
  }

  async recordAndCount(record) {
    this.attempts.push({ ...record });
    return this.attempts.filter(item => (
      item.policy === record.policy
      && item.dimension === record.dimension
      && item.subjectHash === record.subjectHash
      && item.ts >= record.windowStart
    )).length;
  }

  async pruneOlderThan(cutoff) {
    this.attempts = this.attempts.filter(item => item.ts >= cutoff);
  }
}

class BlobAbuseStore {
  constructor({ blob, fetchImpl = fetch, token, secret, prefix = 'sanka-security/rate' }) {
    if (!blob?.put || !blob?.list) throw new StorageError('Cliente do Vercel Blob inválido para proteção contra abuso.');
    if (!token) throw new StorageError('BLOB_READ_WRITE_TOKEN não configurado para proteção contra abuso.');
    encryptDocument({ test: true }, secret);
    this.blob = blob;
    this.fetchImpl = fetchImpl;
    this.token = token;
    this.secret = secret;
    this.prefix = prefix;
  }

  _subjectPrefix(record) {
    return `${this.prefix}/${record.bucket}/${record.policy}/${record.dimension}/${record.subjectHash}/`;
  }

  async _listAll(prefix) {
    const found = [];
    let cursor;
    try {
      do {
        const page = await this.blob.list({ prefix, cursor, limit: 1000, token: this.token });
        found.push(...page.blobs);
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return found;
    } catch (error) {
      throw new StorageError('Não foi possível consultar o controle de abuso.', error);
    }
  }

  async recordAndCount(record) {
    const prefix = this._subjectPrefix(record);
    const pathname = `${prefix}${record.ts}-${crypto.randomUUID()}.json`;
    try {
      await this.blob.put(pathname, encryptDocument({
        schemaVersion: 1,
        policy: record.policy,
        dimension: record.dimension,
        ts: record.ts,
      }, this.secret), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        token: this.token,
      });
    } catch (error) {
      throw new StorageError('Não foi possível registrar o controle de abuso.', error);
    }

    const blobs = await this._listAll(prefix);
    let count = 0;
    for (const blob of blobs) {
      try {
        const timestamp = Number(blob.pathname.slice(prefix.length).split('-')[0]);
        if (timestamp >= record.windowStart) count += 1;
      } catch (_) {
        // Documento desconhecido não é considerado no limite.
      }
    }
    return count;
  }

  async pruneOlderThan(cutoff) {
    if (typeof this.blob.del !== 'function') return;
    const blobs = await this._listAll(`${this.prefix}/`);
    const expiredUrls = blobs.filter(item => {
      const relative = item.pathname.slice(`${this.prefix}/`.length);
      const bucket = Number(relative.split('/')[0]);
      return Number.isFinite(bucket) && bucket < cutoff;
    }).map(item => item.url);
    try {
      for (let index = 0; index < expiredUrls.length; index += 100) {
        await this.blob.del(expiredUrls.slice(index, index + 100), { token: this.token });
      }
    } catch (error) {
      throw new StorageError('Não foi possível aplicar a retenção do controle de abuso.', error);
    }
  }
}

function createDefaultAbuseStore(env = process.env) {
  if (env.BLOB_READ_WRITE_TOKEN) {
    return new BlobAbuseStore({
      blob: require('@vercel/blob'),
      token: env.BLOB_READ_WRITE_TOKEN,
      secret: env.ORDER_DATA_SECRET,
    });
  }
  if (env.VERCEL || env.VERCEL_ENV) {
    throw new StorageError('BLOB_READ_WRITE_TOKEN não configurado para proteção contra abuso.');
  }
  return new MemoryAbuseStore();
}

module.exports = {
  BlobAbuseStore,
  MemoryAbuseStore,
  createDefaultAbuseStore,
};
