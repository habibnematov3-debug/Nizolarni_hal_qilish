ALTER TABLE "monitoring_obligations"
ADD COLUMN "responsible_party_pinfl" TEXT;

CREATE INDEX "monitoring_obligations_responsible_party_pinfl_status_idx"
ON "monitoring_obligations"("responsible_party_pinfl", "status");
