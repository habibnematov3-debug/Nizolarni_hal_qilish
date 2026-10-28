ALTER TABLE "users" ALTER COLUMN "cabinet_type" SET DEFAULT 'PARTY';

UPDATE "users"
SET "cabinet_type" = 'PARTY'
WHERE "cabinet_type" = 'APPLICANT';
