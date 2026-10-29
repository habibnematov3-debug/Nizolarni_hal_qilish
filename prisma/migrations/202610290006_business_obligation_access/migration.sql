ALTER TABLE "monitoring_obligations"
  ADD COLUMN "responsible_party_organization_tin" TEXT;

CREATE INDEX "monitoring_obligations_responsible_party_organization_tin_status_idx"
  ON "monitoring_obligations"("responsible_party_organization_tin", "status");
