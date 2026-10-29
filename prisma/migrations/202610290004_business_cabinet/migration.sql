ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'BUSINESS';

ALTER TABLE "organizations"
  ADD COLUMN "bank_account" TEXT;

ALTER TABLE "mediation_cases"
  ADD COLUMN "document_language" TEXT NOT NULL DEFAULT 'UZ',
  ADD COLUMN "requested_mediator_registry_id" TEXT;

ALTER TABLE "mediation_participants"
  ADD COLUMN "organization_id" TEXT,
  ADD COLUMN "organization_name" TEXT,
  ADD COLUMN "organization_tin" TEXT,
  ADD COLUMN "representative_name" TEXT;

CREATE TABLE "business_organization_members" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_organization_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_organization_members_organization_id_user_id_key"
  ON "business_organization_members"("organization_id", "user_id");
CREATE INDEX "business_organization_members_user_id_idx"
  ON "business_organization_members"("user_id");

ALTER TABLE "business_organization_members"
  ADD CONSTRAINT "business_organization_members_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "business_organization_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "BusinessAuthorityDocumentType" AS ENUM ('POWER_OF_ATTORNEY', 'APPOINTMENT_ORDER');

CREATE TABLE "business_authority_documents" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "file_id" TEXT NOT NULL,
  "uploaded_by_id" TEXT NOT NULL,
  "type" "BusinessAuthorityDocumentType" NOT NULL,
  "document_number" TEXT,
  "valid_until" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_authority_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_authority_documents_organization_id_file_id_key"
  ON "business_authority_documents"("organization_id", "file_id");
CREATE INDEX "business_authority_documents_organization_id_created_at_idx"
  ON "business_authority_documents"("organization_id", "created_at");

ALTER TABLE "business_authority_documents"
  ADD CONSTRAINT "business_authority_documents_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "business_authority_documents_file_id_fkey"
  FOREIGN KEY ("file_id") REFERENCES "file_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "business_authority_documents_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mediation_participants"
  ADD CONSTRAINT "mediation_participants_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
