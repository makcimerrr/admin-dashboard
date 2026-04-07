CREATE TABLE IF NOT EXISTS "specialty_tracking" (
    "id" SERIAL PRIMARY KEY,
    "login" VARCHAR(100) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "specialty" VARCHAR(50) NOT NULL,
    "promo_id" VARCHAR(50) NOT NULL,
    "projects" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "current_project" VARCHAR(100),
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_specialty_tracking_unique"
    ON "specialty_tracking"("login", "specialty", "promo_id");
