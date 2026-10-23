CREATE TYPE "RegistryType" AS ENUM ('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR');
CREATE TYPE "RegistryEntryStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TABLE "registry_entries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "registry_number" TEXT,
  "pinfl" TEXT,
  "type" "RegistryType" NOT NULL,
  "full_name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "region" TEXT NOT NULL,
  "gender" TEXT,
  "birth_date" DATE,
  "photo_url" TEXT,
  "education" TEXT,
  "specialization" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "certificate_number" TEXT,
  "certificate_issued_at" TIMESTAMP(3),
  "certificate_expires_at" TIMESTAMP(3),
  "status" "RegistryEntryStatus" NOT NULL DEFAULT 'ACTIVE',
  "public_profile" BOOLEAN NOT NULL DEFAULT true,
  "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" TEXT,
  "updated_by_id" TEXT,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "registry_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registry_entries_registry_number_key" ON "registry_entries"("registry_number");
CREATE UNIQUE INDEX "registry_entries_pinfl_type_key" ON "registry_entries"("pinfl", "type");
CREATE UNIQUE INDEX "registry_entries_user_id_type_key" ON "registry_entries"("user_id", "type");
CREATE INDEX "registry_entries_type_status_region_idx" ON "registry_entries"("type", "status", "region");
CREATE INDEX "registry_entries_full_name_idx" ON "registry_entries"("full_name");
CREATE INDEX "registry_entries_gender_birth_date_idx" ON "registry_entries"("gender", "birth_date");
CREATE INDEX "registry_entries_created_at_idx" ON "registry_entries"("created_at");

ALTER TABLE "registry_entries"
ADD CONSTRAINT "registry_entries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "registry_status_history" (
  "id" TEXT NOT NULL,
  "registry_entry_id" TEXT NOT NULL,
  "previous_status" "RegistryEntryStatus",
  "status" "RegistryEntryStatus" NOT NULL,
  "reason" TEXT,
  "changed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registry_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registry_status_history_registry_entry_id_created_at_idx"
ON "registry_status_history"("registry_entry_id", "created_at");

ALTER TABLE "registry_status_history"
ADD CONSTRAINT "registry_status_history_registry_entry_id_fkey"
FOREIGN KEY ("registry_entry_id") REFERENCES "registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "registry_imports" (
  "id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "imported" INTEGER NOT NULL DEFAULT 0,
  "duplicates" INTEGER NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registry_imports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registry_imports_created_by_id_created_at_idx"
ON "registry_imports"("created_by_id", "created_at");

CREATE TABLE "registry_mygov_syncs" (
  "id" TEXT NOT NULL,
  "registry_entry_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_error" TEXT,
  "synced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "registry_mygov_syncs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registry_mygov_syncs_status_next_attempt_at_idx"
ON "registry_mygov_syncs"("status", "next_attempt_at");
CREATE INDEX "registry_mygov_syncs_registry_entry_id_created_at_idx"
ON "registry_mygov_syncs"("registry_entry_id", "created_at");

ALTER TABLE "registry_mygov_syncs"
ADD CONSTRAINT "registry_mygov_syncs_registry_entry_id_fkey"
FOREIGN KEY ("registry_entry_id") REFERENCES "registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry existing linked people into the dedicated registry without exposing their private user fields publicly.
INSERT INTO "registry_entries" (
  "id", "user_id", "pinfl", "type", "full_name", "phone", "address", "region",
  "gender", "birth_date", "specialization", "status", "public_profile", "registered_at",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text,
  u."id",
  u."pinfl",
  CASE u."registry_status"::text
    WHEN 'ARBITRATION_JUDGE' THEN 'ARBITRATION_JUDGE'::"RegistryType"
    WHEN 'ARBITRATOR' THEN 'ARBITRATOR'::"RegistryType"
    ELSE 'MEDIATOR'::"RegistryType"
  END,
  u."full_name",
  u."phone",
  u."address",
  COALESCE(NULLIF(d."region", ''), NULLIF(u."address", ''), 'Nomaʼlum'),
  u."gender",
  CASE WHEN u."birth_date" ~ '^\d{4}-\d{2}-\d{2}$' THEN u."birth_date"::date ELSE NULL END,
  COALESCE(d."specialization", ARRAY[]::TEXT[]),
  CASE COALESCE(d."registry_status"::text, 'ACTIVE')
    WHEN 'SUSPENDED' THEN 'SUSPENDED'::"RegistryEntryStatus"
    WHEN 'REVOKED' THEN 'REVOKED'::"RegistryEntryStatus"
    ELSE 'ACTIVE'::"RegistryEntryStatus"
  END,
  COALESCE(d."is_public", true),
  u."created_at",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users" u
LEFT JOIN "mediator_dossiers" d ON d."mediator_id" = u."id"
WHERE u."registry_status"::text IN ('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
ON CONFLICT DO NOTHING;
