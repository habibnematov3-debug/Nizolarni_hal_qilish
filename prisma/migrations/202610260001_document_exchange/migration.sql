CREATE TYPE "DocumentExchangeType" AS ENUM ('MEDIATION', 'INTERAGENCY');
CREATE TYPE "DocumentExchangeStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'NEEDS_CORRECTION', 'FORWARDED', 'COMPLETED', 'REJECTED');
CREATE TYPE "DocumentExchangeAction" AS ENUM ('MESSAGE', 'SUBMITTED', 'RECEIVED', 'REQUESTED_CORRECTION', 'FORWARDED_TO_MINISTRY', 'COMPLETED', 'REJECTED');

CREATE TABLE "document_exchange_threads" (
    "id" TEXT NOT NULL,
    "type" "DocumentExchangeType" NOT NULL,
    "status" "DocumentExchangeStatus" NOT NULL DEFAULT 'SUBMITTED',
    "subject" TEXT NOT NULL,
    "region" TEXT,
    "mediation_id" TEXT,
    "related_mediation_id" TEXT,
    "target_organization_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_exchange_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_exchange_participants" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT,
    "organization_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_exchange_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_exchange_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "action" "DocumentExchangeAction" NOT NULL DEFAULT 'MESSAGE',
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_exchange_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_exchange_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_exchange_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_exchange_threads_mediation_id_key" ON "document_exchange_threads"("mediation_id");
CREATE INDEX "document_exchange_threads_type_status_region_idx" ON "document_exchange_threads"("type", "status", "region");
CREATE INDEX "document_exchange_threads_target_organization_id_status_updated_at_idx" ON "document_exchange_threads"("target_organization_id", "status", "updated_at");
CREATE INDEX "document_exchange_threads_related_mediation_id_idx" ON "document_exchange_threads"("related_mediation_id");
CREATE UNIQUE INDEX "document_exchange_participants_thread_id_user_id_key" ON "document_exchange_participants"("thread_id", "user_id");
CREATE UNIQUE INDEX "document_exchange_participants_thread_id_organization_id_key" ON "document_exchange_participants"("thread_id", "organization_id");
CREATE INDEX "document_exchange_participants_user_id_idx" ON "document_exchange_participants"("user_id");
CREATE INDEX "document_exchange_participants_organization_id_idx" ON "document_exchange_participants"("organization_id");
CREATE INDEX "document_exchange_messages_thread_id_created_at_idx" ON "document_exchange_messages"("thread_id", "created_at");
CREATE INDEX "document_exchange_messages_sender_id_created_at_idx" ON "document_exchange_messages"("sender_id", "created_at");
CREATE UNIQUE INDEX "document_exchange_attachments_message_id_file_id_key" ON "document_exchange_attachments"("message_id", "file_id");
CREATE INDEX "document_exchange_attachments_file_id_idx" ON "document_exchange_attachments"("file_id");

ALTER TABLE "document_exchange_threads" ADD CONSTRAINT "document_exchange_threads_mediation_id_fkey" FOREIGN KEY ("mediation_id") REFERENCES "mediation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_exchange_threads" ADD CONSTRAINT "document_exchange_threads_related_mediation_id_fkey" FOREIGN KEY ("related_mediation_id") REFERENCES "mediation_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_exchange_threads" ADD CONSTRAINT "document_exchange_threads_target_organization_id_fkey" FOREIGN KEY ("target_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_exchange_threads" ADD CONSTRAINT "document_exchange_threads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_exchange_participants" ADD CONSTRAINT "document_exchange_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "document_exchange_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_exchange_participants" ADD CONSTRAINT "document_exchange_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_exchange_participants" ADD CONSTRAINT "document_exchange_participants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_exchange_messages" ADD CONSTRAINT "document_exchange_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "document_exchange_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_exchange_messages" ADD CONSTRAINT "document_exchange_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_exchange_attachments" ADD CONSTRAINT "document_exchange_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "document_exchange_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_exchange_attachments" ADD CONSTRAINT "document_exchange_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
