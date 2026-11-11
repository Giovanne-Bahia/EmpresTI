BEGIN;

-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('colaborador', 'admin');

-- CreateTable
CREATE TABLE "tenants" (
    "tenant_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "membership_role" NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("tenant_id","user_id")
);

-- CreateTable
CREATE TABLE "login_rate_limits" (
    "tenant_id" UUID NOT NULL,
    "dimension" TEXT NOT NULL,
    "key_hash" BYTEA NOT NULL,
    "window_started_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL,

    CONSTRAINT "login_rate_limits_pkey" PRIMARY KEY ("tenant_id","dimension","key_hash")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "audit_events_tenant_time_idx" ON "audit_events"("tenant_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "login_rate_limits" ADD CONSTRAINT "login_rate_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE public.login_rate_limits
  ADD CONSTRAINT login_rate_limits_dimension_check CHECK (dimension IN ('email', 'ip')),
  ADD CONSTRAINT login_rate_limits_key_hash_check CHECK (octet_length(key_hash) = 32),
  ADD CONSTRAINT login_rate_limits_attempts_check CHECK (attempts > 0);

-- Prisma usa a role proprietária. Os clientes da API ficam bloqueados por RLS.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY
    ARRAY['tenants', 'memberships', 'login_rate_limits', 'audit_events']
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name
    );
    EXECUTE format(
      'CREATE POLICY deny_direct_access ON public.%I AS RESTRICTIVE
       FOR ALL TO PUBLIC USING (false) WITH CHECK (false)', table_name
    );
  END LOOP;
END;
$$;

CREATE FUNCTION public.reject_audit_event_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.audit_events
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_audit_event_changes();

COMMIT;
