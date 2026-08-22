'use strict';

const migrations = [
  require('../migrations/001-neon-core.js'),
];

const DEFAULT_QUERY_TIMEOUT_MS = 8000;

const MIGRATION_TABLE_SQL = `CREATE TABLE IF NOT EXISTS sanka_schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

function resultRows(result) {
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.rows) ? result.rows : [];
}

function databaseUrlFromEnv(env = process.env) {
  return String(env.DATABASE_URL || env.POSTGRES_URL || '').trim();
}

class NeonPostgresDatabase {
  constructor({
    connectionString,
    neonFactory,
    queryTimeoutMs = DEFAULT_QUERY_TIMEOUT_MS,
  } = {}) {
    if (!connectionString) throw new Error('DATABASE_URL não configurada.');
    if (!Number.isInteger(queryTimeoutMs) || queryTimeoutMs < 1000 || queryTimeoutMs > 30000) {
      throw new Error('Timeout do Postgres inválido.');
    }
    const createNeon = neonFactory || require('@neondatabase/serverless').neon;
    const sql = createNeon(connectionString);
    if (!sql?.query) throw new Error('Driver do Neon inválido.');
    this.execute = async (text, params = []) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), queryTimeoutMs);
      timeout.unref?.();
      try {
        return await sql.query(text, params, {
          fetchOptions: { signal: controller.signal },
        });
      } finally {
        clearTimeout(timeout);
      }
    };
    this.schemaPromise = null;
  }

  query(text, params = []) {
    return this.execute(text, params);
  }

  ensureSchema() {
    if (!this.schemaPromise) {
      this.schemaPromise = this._applyMigrations().catch(error => {
        this.schemaPromise = null;
        throw error;
      });
    }
    return this.schemaPromise;
  }

  async _applyMigrations() {
    await this.query(MIGRATION_TABLE_SQL);
    for (const migration of migrations) {
      const applied = resultRows(await this.query(
        'SELECT id FROM sanka_schema_migrations WHERE id = $1',
        [migration.id],
      ));
      if (applied.length) continue;
      for (const statement of migration.statements) await this.query(statement);
      await this.query(
        'INSERT INTO sanka_schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
        [migration.id],
      );
    }
  }
}

let defaultDatabase;
let defaultDatabaseUrl;

function createDefaultPostgresDatabase(env = process.env) {
  const connectionString = databaseUrlFromEnv(env);
  if (env !== process.env) return new NeonPostgresDatabase({ connectionString });

  if (!defaultDatabase || defaultDatabaseUrl !== connectionString) {
    defaultDatabase = new NeonPostgresDatabase({ connectionString });
    defaultDatabaseUrl = connectionString;
  }
  return defaultDatabase;
}

module.exports = {
  DEFAULT_QUERY_TIMEOUT_MS,
  MIGRATION_TABLE_SQL,
  NeonPostgresDatabase,
  createDefaultPostgresDatabase,
  databaseUrlFromEnv,
  migrations,
  resultRows,
};
