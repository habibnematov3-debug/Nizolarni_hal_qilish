ALTER TABLE "mediation_participants"
  ADD COLUMN IF NOT EXISTS "data_processing_consent_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "data_processing_consent_version" TEXT;
