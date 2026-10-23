CREATE TYPE "ContractType" AS ENUM ('MEDIATION', 'ARBITRATION', 'ARBITRATION_HEARING');
CREATE TYPE "ServiceContractStatus" AS ENUM ('DRAFT', 'PENDING_PARTIES', 'RETURNED_FOR_EDIT', 'REJECTED', 'AWAITING_PROVIDER_APPROVAL', 'SIGNED');
CREATE TYPE "ContractPartyRole" AS ENUM ('CLIENT', 'COUNTERPARTY', 'PROVIDER');
CREATE TYPE "ContractPartyStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED', 'RETURNED');
CREATE TYPE "ContractTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "contract_templates" (
  "id" TEXT NOT NULL,
  "type" "ContractType" NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "status" "ContractTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_id" TEXT NOT NULL,
  "updated_by_id" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contract_templates_type_version_key" ON "contract_templates"("type", "version");
CREATE INDEX "contract_templates_type_status_idx" ON "contract_templates"("type", "status");

CREATE TABLE "service_contracts" (
  "id" TEXT NOT NULL,
  "contract_number" TEXT NOT NULL,
  "type" "ContractType" NOT NULL,
  "title" TEXT NOT NULL,
  "case_summary" TEXT NOT NULL,
  "rights_and_responsibilities" TEXT NOT NULL,
  "terms" TEXT NOT NULL,
  "valid_until" TIMESTAMP(3),
  "status" "ServiceContractStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "template_id" TEXT,
  "template_version" INTEGER,
  "template_snapshot" JSONB,
  "rendered_content" TEXT,
  "sent_at" TIMESTAMP(3),
  "signed_at" TIMESTAMP(3),
  "signed_pdf" BYTEA,
  "signed_pdf_sha256" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_contracts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "service_contracts_contract_number_key" ON "service_contracts"("contract_number");
CREATE INDEX "service_contracts_created_by_id_status_idx" ON "service_contracts"("created_by_id", "status");
CREATE INDEX "service_contracts_provider_id_status_idx" ON "service_contracts"("provider_id", "status");
CREATE INDEX "service_contracts_type_status_valid_until_idx" ON "service_contracts"("type", "status", "valid_until");
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "contract_participants" (
  "id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "user_id" TEXT,
  "role" "ContractPartyRole" NOT NULL,
  "full_name" TEXT NOT NULL,
  "pinfl" TEXT,
  "status" "ContractPartyStatus" NOT NULL DEFAULT 'PENDING',
  "pkcs7" TEXT,
  "signature_verified" BOOLEAN NOT NULL DEFAULT false,
  "signer_serial_number" TEXT,
  "signed_at" TIMESTAMP(3),
  "decision_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_participants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contract_participants_contract_id_role_key" ON "contract_participants"("contract_id", "role");
CREATE INDEX "contract_participants_user_id_status_idx" ON "contract_participants"("user_id", "status");
CREATE INDEX "contract_participants_pinfl_idx" ON "contract_participants"("pinfl");
ALTER TABLE "contract_participants" ADD CONSTRAINT "contract_participants_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "service_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_participants" ADD CONSTRAINT "contract_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "mediator_bank_details" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "account_holder" TEXT NOT NULL,
  "account_number" TEXT NOT NULL,
  "bank_name" TEXT NOT NULL,
  "bank_code" TEXT NOT NULL,
  "tax_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mediator_bank_details_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mediator_bank_details_user_id_key" ON "mediator_bank_details"("user_id");
ALTER TABLE "mediator_bank_details" ADD CONSTRAINT "mediator_bank_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "service_invoices" (
  "id" TEXT NOT NULL,
  "service_contract_id" TEXT NOT NULL,
  "billing_transaction_id" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "payer_id" TEXT NOT NULL,
  "issuer_id" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "service_invoices_billing_transaction_id_key" ON "service_invoices"("billing_transaction_id");
CREATE UNIQUE INDEX "service_invoices_invoice_number_key" ON "service_invoices"("invoice_number");
CREATE INDEX "service_invoices_service_contract_id_sent_at_idx" ON "service_invoices"("service_contract_id", "sent_at");
CREATE INDEX "service_invoices_payer_id_sent_at_idx" ON "service_invoices"("payer_id", "sent_at");
CREATE INDEX "service_invoices_issuer_id_sent_at_idx" ON "service_invoices"("issuer_id", "sent_at");
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_service_contract_id_fkey" FOREIGN KEY ("service_contract_id") REFERENCES "service_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_billing_transaction_id_fkey" FOREIGN KEY ("billing_transaction_id") REFERENCES "billing_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
