ALTER TABLE "court_claims"
  ADD COLUMN "claimant_tin" TEXT,
  ADD COLUMN "respondent_tin" TEXT;

CREATE INDEX "court_claims_claimant_tin_idx" ON "court_claims"("claimant_tin");
CREATE INDEX "court_claims_respondent_tin_idx" ON "court_claims"("respondent_tin");
