-- MANUAL ONLY. Never delete or rewrite order/history rows to force rollback.
-- After any archived event exists, retain the expanded constraint instead.
DO $sanka_archive_rollback$
DECLARE
  current_definition text;
  legacy_definition constant text :=
    'CHECK ((event_kind = ANY (ARRAY[''status''::text, ''cancelled''::text])))';
  target_definition constant text :=
    'CHECK ((event_kind = ANY (ARRAY[''status''::text, ''cancelled''::text, ''archived''::text])))';
BEGIN
  PERFORM set_config('lock_timeout', '3s', true);
  IF NOT EXISTS (
    SELECT 1 FROM public.sanka_schema_migrations WHERE id = '001_neon_core'
  ) THEN
    RAISE EXCEPTION 'Sanka archive rollback requires the recorded 001_neon_core migration';
  END IF;
  LOCK TABLE public.sanka_order_events IN ACCESS EXCLUSIVE MODE;
  IF (SELECT count(*) FROM pg_catalog.pg_constraint
      WHERE conrelid = 'public.sanka_order_events'::regclass AND contype = 'c') <> 1 THEN
    RAISE EXCEPTION 'Unexpected additional Sanka CHECK constraints: rollback requires schema review';
  END IF;
  SELECT pg_get_constraintdef(oid) INTO current_definition
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.sanka_order_events'::regclass
      AND conname = 'sanka_order_events_event_kind_check'
      AND contype = 'c' AND convalidated;

  IF current_definition IS NULL OR current_definition NOT IN (legacy_definition, target_definition) THEN
    RAISE EXCEPTION 'Unexpected Sanka event_kind constraint: rollback requires schema review';
  END IF;
  IF current_definition = legacy_definition THEN
    IF EXISTS (SELECT 1 FROM public.sanka_schema_migrations WHERE id = '002_order_archive_event_kind') THEN
      RAISE EXCEPTION 'Sanka migration ledger and event_kind constraint disagree';
    END IF;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sanka_schema_migrations WHERE id = '002_order_archive_event_kind') THEN
    RAISE EXCEPTION 'Sanka archive rollback requires the recorded 002 migration';
  END IF;

  IF EXISTS (SELECT 1 FROM public.sanka_order_events WHERE event_kind = 'archived') THEN
    RAISE EXCEPTION 'Unsafe rollback: archived events exist; retain the expanded constraint and preserve history';
  END IF;

  ALTER TABLE public.sanka_order_events
    DROP CONSTRAINT sanka_order_events_event_kind_check,
    ADD CONSTRAINT sanka_order_events_event_kind_check
      CHECK (event_kind IN ('status', 'cancelled'));
  DELETE FROM public.sanka_schema_migrations WHERE id = '002_order_archive_event_kind';
END;
$sanka_archive_rollback$;
