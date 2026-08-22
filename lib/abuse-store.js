'use strict';

const crypto = require('crypto');
const { encryptDocument, StorageError } = require('./order-store.js');
const {
  createDefaultPostgresDatabase,
  databaseUrlFromEnv,
  resultRows,
} = require('./postgres-database.js');

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

class PostgresAbuseStore {
  constructor({ database, secret }) {
    if (!database?.query) throw new StorageError('Cliente Postgres inválido para proteção contra abuso.');
    encryptDocument({ test: true }, secret);
    this.database = database;
    this.secret = secret;
  }

  async _query(text, params, message) {
    try {
      if (typeof this.database.ensureSchema === 'function') await this.database.ensureSchema();
      return resultRows(await this.database.query(text, params));
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(message, error);
    }
  }

  async recordAndCount(record) {
    const payload = encryptDocument({
      schemaVersion: 1,
      policy: record.policy,
      dimension: record.dimension,
      ts: record.ts,
    }, this.secret);
    const rows = await this._query(
      `/* sanka:abuse:record */
       WITH next_count AS (
         INSERT INTO sanka_abuse_counters
           (bucket_ms, policy, dimension, subject_hash, attempt_count, updated_at_ms)
         VALUES ($2::bigint, $3, $4, $5, 1, $6::bigint)
         ON CONFLICT (bucket_ms, policy, dimension, subject_hash)
         DO UPDATE SET
           attempt_count = sanka_abuse_counters.attempt_count + 1,
           updated_at_ms = EXCLUDED.updated_at_ms
         RETURNING attempt_count
       ), logged AS (
         INSERT INTO sanka_abuse_attempts
           (attempt_id, bucket_ms, policy, dimension, subject_hash, occurred_at_ms, payload_encrypted)
         SELECT $1::uuid, $2::bigint, $3, $4, $5, $6::bigint, $7
         FROM next_count
         RETURNING 1
       )
       SELECT next_count.attempt_count AS count
       FROM next_count
       JOIN logged ON true`,
      [
        crypto.randomUUID(),
        record.bucket,
        record.policy,
        record.dimension,
        record.subjectHash,
        record.ts,
        payload,
      ],
      'Não foi possível registrar o controle de abuso no Postgres.',
    );
    const count = Number(rows[0]?.count);
    if (!Number.isInteger(count) || count < 1) {
      throw new StorageError('Contador antiabuso inválido no Postgres.');
    }
    return count;
  }

  async pruneOlderThan(cutoff) {
    await this._query(
      `/* sanka:abuse:prune */
       WITH removed_attempts AS (
         DELETE FROM sanka_abuse_attempts
         WHERE occurred_at_ms < $1::bigint
         RETURNING attempt_id
       )
       DELETE FROM sanka_abuse_counters
       WHERE updated_at_ms < $1::bigint`,
      [cutoff],
      'Não foi possível aplicar a retenção do controle de abuso no Postgres.',
    );
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

function createDefaultAbuseStore(env = process.env, { database } = {}) {
  if (databaseUrlFromEnv(env)) {
    try {
      return new PostgresAbuseStore({
        database: database || createDefaultPostgresDatabase(env),
        secret: env.ORDER_DATA_SECRET,
      });
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('Não foi possível configurar o Postgres para proteção contra abuso.', error);
    }
  }
  if (env.VERCEL || env.VERCEL_ENV) {
    throw new StorageError('DATABASE_URL não configurada para proteção contra abuso.');
  }
  return new MemoryAbuseStore();
}

module.exports = {
  BlobAbuseStore,
  MemoryAbuseStore,
  PostgresAbuseStore,
  createDefaultAbuseStore,
};
