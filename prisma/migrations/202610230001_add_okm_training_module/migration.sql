CREATE TYPE "TrainingCertificateType" AS ENUM ('SPECIAL_COURSE', 'QUALIFICATION_UPGRADE');

CREATE TYPE "TrainingApplicationStatus" AS ENUM ('SUBMITTED', 'CONTRACT_CREATED');

ALTER TABLE "training_certificates"
ADD COLUMN "user_id" TEXT,
ADD COLUMN "certificate_type" "TrainingCertificateType" NOT NULL DEFAULT 'SPECIAL_COURSE',
ADD COLUMN "next_qualification_date" TIMESTAMP(3);

CREATE INDEX "training_certificates_user_id_idx" ON "training_certificates"("user_id");
CREATE INDEX "training_certificates_certificate_type_issued_date_idx" ON "training_certificates"("certificate_type", "issued_date");
CREATE INDEX "training_certificates_next_qualification_date_idx" ON "training_certificates"("next_qualification_date");

ALTER TABLE "training_certificates"
ADD CONSTRAINT "training_certificates_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "training_applications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "training_center_code" TEXT NOT NULL,
  "course_name" TEXT NOT NULL,
  "note" TEXT,
  "status" "TrainingApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "training_applications_user_id_created_at_idx" ON "training_applications"("user_id", "created_at");
CREATE INDEX "training_applications_status_idx" ON "training_applications"("status");

ALTER TABLE "training_applications"
ADD CONSTRAINT "training_applications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "training_contracts" (
  "id" TEXT NOT NULL,
  "application_id" TEXT NOT NULL,
  "contract_number" TEXT NOT NULL,
  "training_center_code" TEXT NOT NULL,
  "training_center_name" TEXT NOT NULL,
  "mediator_name" TEXT NOT NULL,
  "mediator_pinfl" TEXT NOT NULL,
  "course_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'GENERATED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_contracts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "training_contracts_application_id_key" ON "training_contracts"("application_id");
CREATE UNIQUE INDEX "training_contracts_contract_number_key" ON "training_contracts"("contract_number");
CREATE INDEX "training_contracts_created_at_idx" ON "training_contracts"("created_at");

ALTER TABLE "training_contracts"
ADD CONSTRAINT "training_contracts_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "training_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
