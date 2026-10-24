ALTER TABLE "mediation_cases"
  ADD COLUMN IF NOT EXISTS "dispute_category" TEXT NOT NULL DEFAULT 'CIVIL',
  ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT '';

ALTER TABLE "mediation_participants"
  ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE "mk_applications"
  ADD COLUMN IF NOT EXISTS "profession_proof_file_id" TEXT;
