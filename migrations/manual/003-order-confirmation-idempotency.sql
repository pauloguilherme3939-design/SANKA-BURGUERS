-- MANUAL ONLY. Not registered in automatic application initialization.
-- One atomic statement; target and authorization must be checked separately.
DO $sanka_p0$
BEGIN
  PERFORM set_config('lock_timeout','3s',true);
  LOCK TABLE public.sanka_orders, public.sanka_order_events, public.sanka_schema_migrations IN ACCESS EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.sanka_schema_migrations WHERE id='001_neon_core') OR
     NOT EXISTS (SELECT 1 FROM public.sanka_schema_migrations WHERE id='002_order_archive_event_kind') THEN
    RAISE EXCEPTION 'Migration003 requires recorded migrations001 and002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sanka_schema_migrations WHERE id='003_order_confirmation_idempotency') THEN
    RAISE EXCEPTION 'Migration003 already recorded: inspect rather than reapply';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.sanka_order_events'::regclass
    AND conname='sanka_order_events_event_kind_check' AND convalidated
    AND pg_get_constraintdef(oid)=$expected$CHECK ((event_kind = ANY (ARRAY['status'::text, 'cancelled'::text, 'archived'::text])))$expected$) THEN
    RAISE EXCEPTION 'Unexpected event CHECK before migration003';
  END IF;
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid='public.sanka_order_events'::regclass AND contype='c')<>1 THEN
    RAISE EXCEPTION 'Unexpected additional event CHECK before migration003';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sanka_orders'
    AND column_name IN ('idempotency_key_hash','request_hash')) THEN
    RAISE EXCEPTION 'Unexpected idempotency columns before migration003';
  END IF;
  ALTER TABLE public.sanka_orders ADD COLUMN idempotency_key_hash text,
    ADD COLUMN request_hash text,
    ADD CONSTRAINT sanka_orders_idempotency_key_unique UNIQUE(idempotency_key_hash),
    ADD CONSTRAINT sanka_orders_idempotency_pair_check CHECK (
      (idempotency_key_hash IS NULL AND request_hash IS NULL) OR
      (idempotency_key_hash IS NOT NULL AND request_hash IS NOT NULL
       AND idempotency_key_hash ~ '^[0-9a-f]{64}$' AND request_hash ~ '^[0-9a-f]{64}$'));
  ALTER TABLE public.sanka_order_events DROP CONSTRAINT sanka_order_events_event_kind_check,
    ADD CONSTRAINT sanka_order_events_event_kind_check CHECK(event_kind IN ('status','cancelled','archived','delivery_confirmed'));
  CREATE UNIQUE INDEX sanka_order_delivery_confirmation_unique ON public.sanka_order_events(order_id)
    WHERE event_kind='delivery_confirmed';
  INSERT INTO public.sanka_schema_migrations(id) VALUES('003_order_confirmation_idempotency');
END;
$sanka_p0$;
