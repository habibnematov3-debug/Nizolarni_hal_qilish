CREATE TABLE "registry_ratings" (
  "id" TEXT NOT NULL,
  "registry_entry_id" TEXT NOT NULL,
  "period_year" INTEGER NOT NULL,
  "metrics" JSONB NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "methodology_version" TEXT NOT NULL,
  "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "registry_ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registry_ratings_registry_entry_id_period_year_key"
ON "registry_ratings"("registry_entry_id", "period_year");
CREATE INDEX "registry_ratings_period_year_score_idx"
ON "registry_ratings"("period_year", "score");

ALTER TABLE "registry_ratings"
ADD CONSTRAINT "registry_ratings_registry_entry_id_fkey"
FOREIGN KEY ("registry_entry_id") REFERENCES "registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
