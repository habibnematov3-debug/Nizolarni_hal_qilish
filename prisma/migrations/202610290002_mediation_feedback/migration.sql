CREATE TABLE "mediation_feedback" (
    "id" TEXT NOT NULL,
    "mediation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "specialist_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mediation_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mediation_feedback_mediation_id_user_id_key"
ON "mediation_feedback"("mediation_id", "user_id");

CREATE INDEX "mediation_feedback_specialist_id_created_at_idx"
ON "mediation_feedback"("specialist_id", "created_at");

ALTER TABLE "mediation_feedback"
ADD CONSTRAINT "mediation_feedback_mediation_id_fkey"
FOREIGN KEY ("mediation_id") REFERENCES "mediation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mediation_feedback"
ADD CONSTRAINT "mediation_feedback_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mediation_feedback"
ADD CONSTRAINT "mediation_feedback_specialist_id_fkey"
FOREIGN KEY ("specialist_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
