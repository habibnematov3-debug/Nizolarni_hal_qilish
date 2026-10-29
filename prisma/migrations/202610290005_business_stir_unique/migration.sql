CREATE UNIQUE INDEX "organizations_business_stir_key"
  ON "organizations"("code")
  WHERE "type" = 'BUSINESS' AND "code" IS NOT NULL;
