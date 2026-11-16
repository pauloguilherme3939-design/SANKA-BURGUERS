-- MANUAL ONLY: not registered in lib/postgres-database.js.
-- Apply only to the explicitly authorized environment after the preflight.
-- One atomic statement: a failure also rolls back the constraint replacement.
-- Execute with a server-side statement_timeout and a controlled maintenance window.
DO $sanka_archive$
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
    RAISE EXCEPTION 'Sanka archive migration requires the recorded 001_neon_core migration';
  END IF;

  LOCK TABLE public.sanka_order_events IN ACCESS EXCLUSIVE MODE;
  IF (SELECT count(*) FROM pg_catalog.pg_constraint
      WHERE conrelid = 'public.sanka_order_events'::regclass AND contype = 'c') <> 1 THEN
    RAISE EXCEPTION 'Unexpected additional Sanka CHECK constraints: review the schema before applying';
  END IF;
  SELECT pg_get_constraintdef(oid) INTO current_definition
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.sanka_order_events'::regclass
      AND conname = 'sanka_order_events_event_kind_check'
      AND contype = 'c' AND convalidated;

  IF current_definition IS NULL OR current_definition NOT IN (legacy_definition, target_definition) THEN
    RAISE EXCEPTION 'Unexpected Sanka event_kind constraint: review the schema before applying';
  END IF;
  IF current_definition = legacy_definition AND EXISTS (
    SELECT 1 FROM public.sanka_schema_migrations WHERE id = '002_order_archive_event_kind'
  ) THEN
    RAISE EXCEPTION 'Sanka migration ledger and event_kind constraint disagree';
  END IF;
  IF current_definition = target_definition AND NOT EXISTS (
    SELECT 1 FROM public.sanka_schema_migrations WHERE id = '002_order_archive_event_kind'
  ) THEN
    RAISE EXCEPTION 'Expanded Sanka constraint without recorded 002: review before adopting or rolling back';
  END IF;

  IF current_definition = legacy_definition THEN
    ALTER TABLE public.sanka_order_events
      DROP CONSTRAINT sanka_order_events_event_kind_check,
      ADD CONSTRAINT sanka_order_events_event_kind_check
        CHECK (event_kind IN ('status', 'cancelled', 'archived'));
  END IF;

  INSERT INTO public.sanka_schema_migrations (id)
    VALUES ('002_order_archive_event_kind') ON CONFLICT (id) DO NOTHING;
END;
$sanka_archive$;
