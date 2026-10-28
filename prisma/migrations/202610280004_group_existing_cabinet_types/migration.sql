UPDATE "users"
SET "cabinet_type" = 'SPECIALIST'
WHERE "cabinet_type" IN ('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR');

UPDATE "users"
SET "cabinet_type" = 'PUBLIC_AUTHORITY'
WHERE "cabinet_type" IN ('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF');

UPDATE "users"
SET "cabinet_type" = 'ADMIN'
WHERE "cabinet_type" = 'OPERATOR';
