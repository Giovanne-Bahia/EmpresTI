-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "borrowed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "returned_at" TIMESTAMPTZ(6),

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_rate_limits" (
    "tenant_id" UUID NOT NULL,
    "dimension" TEXT NOT NULL,
    "key_hash" BYTEA NOT NULL,
    "window_started_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL,

    CONSTRAINT "loan_rate_limits_pkey" PRIMARY KEY ("tenant_id","dimension","key_hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "loans_request_key" ON "loans"("tenant_id", "user_id", "request_id");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenant_id_equipment_id_fkey" FOREIGN KEY ("tenant_id", "equipment_id") REFERENCES "equipment"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "memberships"("tenant_id", "user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "loan_rate_limits" ADD CONSTRAINT "loan_rate_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE loans
  ADD CONSTRAINT loans_term_check CHECK (due_at=borrowed_at+interval '336 hours'),
  ADD CONSTRAINT loans_returned_at_check CHECK (returned_at IS NULL OR returned_at>=borrowed_at);
CREATE UNIQUE INDEX loans_one_open_per_equipment_idx ON loans(tenant_id,equipment_id) WHERE returned_at IS NULL;
CREATE INDEX loans_open_user_idx ON loans(tenant_id,user_id,id) WHERE returned_at IS NULL;
CREATE INDEX loans_open_due_idx ON loans(tenant_id,user_id,due_at) WHERE returned_at IS NULL;
ALTER TABLE loan_rate_limits
  ADD CONSTRAINT loan_rate_limits_dimension_check CHECK(dimension IN ('user','ip')),
  ADD CONSTRAINT loan_rate_limits_hash_check CHECK(octet_length(key_hash)=32),
  ADD CONSTRAINT loan_rate_limits_attempts_check CHECK(attempts>0);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_direct_access ON loans AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
CREATE POLICY deny_direct_access ON loan_rate_limits AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
