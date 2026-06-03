-- Chantier A : skills & appétence par étudiant (Gitea)

CREATE TABLE IF NOT EXISTS "student_gitea_profiles" (
    "id" SERIAL PRIMARY KEY,
    "login" VARCHAR(100) NOT NULL,
    "total_contributions" INTEGER NOT NULL DEFAULT 0,
    "active_days" INTEGER NOT NULL DEFAULT 0,
    "contributions_30d" INTEGER NOT NULL DEFAULT 0,
    "contributions_90d" INTEGER NOT NULL DEFAULT 0,
    "current_streak_days" INTEGER NOT NULL DEFAULT 0,
    "longest_streak_days" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP,
    "engagement_score" INTEGER NOT NULL DEFAULT 0,
    "affinity_label" VARCHAR(30) NOT NULL DEFAULT 'inactif',
    "repos_count" INTEGER,
    "languages" JSONB,
    "raw" JSONB,
    "fetched_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_gitea_profiles_login"
    ON "student_gitea_profiles"("login");

CREATE TABLE IF NOT EXISTS "student_skills" (
    "id" SERIAL PRIMARY KEY,
    "login" VARCHAR(100) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "affinity" INTEGER NOT NULL DEFAULT 0,
    "evidence" JSONB DEFAULT '[]'::jsonb,
    "source" VARCHAR(20) NOT NULL DEFAULT 'gitea',
    "computed_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_student_skills_login"
    ON "student_skills"("login");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_student_skills_unique"
    ON "student_skills"("login", "category", "name");
