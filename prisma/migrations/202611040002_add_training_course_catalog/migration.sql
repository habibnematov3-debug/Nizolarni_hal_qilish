CREATE TABLE "training_courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COURSE',
    "duration_hours" INTEGER NOT NULL,
    "date_label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "join_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "training_courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_enrollments" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attended_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "marked_by_id" TEXT,
    CONSTRAINT "training_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "training_enrollments_course_id_user_id_key" ON "training_enrollments"("course_id", "user_id");
CREATE INDEX "training_courses_is_published_created_at_idx" ON "training_courses"("is_published", "created_at");
CREATE INDEX "training_enrollments_user_id_enrolled_at_idx" ON "training_enrollments"("user_id", "enrolled_at");

ALTER TABLE "training_courses" ADD CONSTRAINT "training_courses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
