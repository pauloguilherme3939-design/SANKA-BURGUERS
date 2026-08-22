'use strict';

module.exports = {
  id: '001_neon_core',
  statements: [
    `CREATE TABLE IF NOT EXISTS sanka_orders (
      id text PRIMARY KEY,
      order_day date NOT NULL,
      created_at timestamptz NOT NULL,
      payload_encrypted text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS sanka_orders_day_created_idx
      ON sanka_orders (order_day, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS sanka_order_events (
      event_id uuid PRIMARY KEY,
      order_id text NOT NULL REFERENCES sanka_orders(id) ON DELETE RESTRICT,
      event_kind text NOT NULL CHECK (event_kind IN ('status', 'cancelled')),
      created_at timestamptz NOT NULL,
      payload_encrypted text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS sanka_order_events_order_created_idx
      ON sanka_order_events (order_id, created_at, event_id)`,
    `CREATE TABLE IF NOT EXISTS sanka_abuse_counters (
      bucket_ms bigint NOT NULL,
      policy text NOT NULL,
      dimension text NOT NULL,
      subject_hash char(64) NOT NULL,
      attempt_count integer NOT NULL CHECK (attempt_count > 0),
      updated_at_ms bigint NOT NULL,
      PRIMARY KEY (bucket_ms, policy, dimension, subject_hash)
    )`,
    `CREATE TABLE IF NOT EXISTS sanka_abuse_attempts (
      attempt_id uuid PRIMARY KEY,
      bucket_ms bigint NOT NULL,
      policy text NOT NULL,
      dimension text NOT NULL,
      subject_hash char(64) NOT NULL,
      occurred_at_ms bigint NOT NULL,
      payload_encrypted text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS sanka_abuse_attempts_lookup_idx
      ON sanka_abuse_attempts (bucket_ms, policy, dimension, subject_hash, occurred_at_ms)`,
    `CREATE OR REPLACE FUNCTION sanka_reject_immutable_mutation()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $sanka$
      BEGIN
        RAISE EXCEPTION 'Sanka immutable history cannot be updated or deleted';
      END;
      $sanka$`,
    `DO $sanka$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'sanka_orders_immutable'
            AND tgrelid = 'sanka_orders'::regclass
        ) THEN
          CREATE TRIGGER sanka_orders_immutable
          BEFORE UPDATE OR DELETE ON sanka_orders
          FOR EACH ROW EXECUTE FUNCTION sanka_reject_immutable_mutation();
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'sanka_order_events_immutable'
            AND tgrelid = 'sanka_order_events'::regclass
        ) THEN
          CREATE TRIGGER sanka_order_events_immutable
          BEFORE UPDATE OR DELETE ON sanka_order_events
          FOR EACH ROW EXECUTE FUNCTION sanka_reject_immutable_mutation();
        END IF;
      END;
      $sanka$`,
  ],
};
