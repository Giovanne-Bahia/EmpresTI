-- CreateEnum
CREATE TYPE "equipment_category" AS ENUM ('notebook', 'monitor', 'cabo', 'camera');

-- CreateEnum
CREATE TYPE "equipment_condition" AS ENUM ('disponivel', 'manutencao');

-- CreateTable
CREATE TABLE "equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "patrimonio" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" "equipment_category" NOT NULL,
    "condition" "equipment_condition" NOT NULL DEFAULT 'disponivel',
    "search_text" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "image_provider" TEXT NOT NULL DEFAULT 'Pixabay',
    "image_photo_id" TEXT NOT NULL,
    "image_source_url" TEXT NOT NULL,
    "image_author" TEXT NOT NULL,
    "image_author_url" TEXT NOT NULL,
    "image_license_url" TEXT NOT NULL,
    "image_sha256" CHAR(64) NOT NULL,
    "image_width" INTEGER NOT NULL DEFAULT 800,
    "image_height" INTEGER NOT NULL DEFAULT 600,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_patrimonio_key" ON "equipment"("patrimonio");

-- CreateIndex
CREATE INDEX "equipment_tenant_patrimonio_idx" ON "equipment"("tenant_id", "patrimonio");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tenant_id_id_key" ON "equipment"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tenant_photo_key" ON "equipment"("tenant_id", "image_photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tenant_image_hash_key" ON "equipment"("tenant_id", "image_sha256");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE equipment
  ADD CONSTRAINT equipment_name_check CHECK (length(trim(name))>0),
  ADD CONSTRAINT equipment_patrimonio_check CHECK (length(trim(patrimonio))>0),
  ADD CONSTRAINT equipment_provider_check CHECK (image_provider='Pixabay'),
  ADD CONSTRAINT equipment_image_size_check CHECK (image_width=800 AND image_height=600),
  ADD CONSTRAINT equipment_image_hash_check CHECK (image_sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_direct_access ON equipment AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
