-- MANUAL ONLY. Never discard confirmation history or idempotency associations.
DO $sanka_p0_rollback$
BEGIN
  PERFORM set_config('lock_timeout','3s',true);
  LOCK TABLE public.sanka_orders, public.sanka_order_events, public.sanka_schema_migrations IN ACCESS EXCLUSIVE MODE;
  IF NOT EXISTS(SELECT 1 FROM public.sanka_schema_migrations WHERE id='003_order_confirmation_idempotency') THEN
    RAISE EXCEPTION 'Rollback003 requires recorded migration003';
  END IF;
  IF EXISTS(SELECT 1 FROM public.sanka_orders WHERE idempotency_key_hash IS NOT NULL OR request_hash IS NOT NULL) OR
     EXISTS(SELECT 1 FROM public.sanka_order_events WHERE event_kind='delivery_confirmed') THEN
    RAISE EXCEPTION 'Unsafe rollback003: preserve idempotency and commercial history';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.sanka_order_events'::regclass
    AND conname='sanka_order_events_event_kind_check' AND convalidated
    AND pg_get_constraintdef(oid)=$expected$CHECK ((event_kind = ANY (ARRAY['status'::text, 'cancelled'::text, 'archived'::text, 'delivery_confirmed'::text])))$expected$) THEN
    RAISE EXCEPTION 'Unexpected event CHECK: rollback003 requires schema review';
  END IF;
  DROP INDEX public.sanka_order_delivery_confirmation_unique;
  ALTER TABLE public.sanka_order_events DROP CONSTRAINT sanka_order_events_event_kind_check,
    ADD CONSTRAINT sanka_order_events_event_kind_check CHECK(event_kind IN ('status','cancelled','archived'));
  ALTER TABLE public.sanka_orders DROP CONSTRAINT sanka_orders_idempotency_key_unique,
    DROP CONSTRAINT sanka_orders_idempotency_pair_check,
    DROP COLUMN idempotency_key_hash, DROP COLUMN request_hash;
  DELETE FROM public.sanka_schema_migrations WHERE id='003_order_confirmation_idempotency';
END;
$sanka_p0_rollback$;
