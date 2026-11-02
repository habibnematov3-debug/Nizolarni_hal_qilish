ALTER TYPE "MkApplicationStatus" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUESTED';
ALTER TYPE "MkApplicationStatus" ADD VALUE IF NOT EXISTS 'FORWARDED';
ALTER TYPE "MkApplicationStatus" ADD VALUE IF NOT EXISTS 'EXEMPT_PENDING_REGISTRATION';

ALTER TABLE "mk_applications"
  ADD COLUMN "region" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "specialization" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "work_experience" JSONB,
  ADD COLUMN "ethics_accepted_at" TIMESTAMP(3),
  ADD COLUMN "rejection_code" TEXT,
  ADD COLUMN "correction_note" TEXT,
  ADD COLUMN "correction_deadline" TIMESTAMP(3),
  ADD COLUMN "regional_review_deadline" TIMESTAMP(3),
  ADD COLUMN "forwarded_at" TIMESTAMP(3),
  ADD COLUMN "exam_failed_at" TIMESTAMP(3),
  ADD COLUMN "registry_deadline" TIMESTAMP(3);

CREATE INDEX "mk_applications_region_status_idx" ON "mk_applications"("region", "status");
