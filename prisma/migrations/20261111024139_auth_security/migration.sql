BEGIN;

ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;

ALTER FUNCTION public.reject_audit_event_changes()
  SET search_path = '';

COMMIT;
