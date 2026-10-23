ALTER TABLE "billing_transactions"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

WITH ranked_keys AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "idempotency_key" ORDER BY "created_at", "id") AS duplicate_rank
  FROM "billing_transactions"
  WHERE "idempotency_key" IS NOT NULL
)
UPDATE "billing_transactions" AS billing_row
SET "idempotency_key" = NULL
FROM ranked_keys
WHERE billing_row."id" = ranked_keys."id"
  AND ranked_keys.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "billing_transactions_idempotency_key_key"
  ON "billing_transactions"("idempotency_key");
