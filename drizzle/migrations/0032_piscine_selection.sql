-- Piscines de sélection (piscine-go) : suivi des CANDIDATS.
--
-- Miroir local du GraphQL Zone01, alimenté par cron. Ces personnes ne sont PAS
-- des apprenants : aucune clé étrangère vers `students`, le rapprochement se
-- fait sur le login si le candidat intègre plus tard.

CREATE TABLE IF NOT EXISTS "piscine_sessions" (
    "event_id" INTEGER PRIMARY KEY,
    "path" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "start_at" TIMESTAMP,
    "end_at" TIMESTAMP,
    "is_retry" BOOLEAN NOT NULL DEFAULT FALSE,
    "candidates_count" INTEGER NOT NULL DEFAULT 0,
    "admitted_count" INTEGER NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_piscine_session_start" ON "piscine_sessions"("start_at");

CREATE TABLE IF NOT EXISTS "piscine_candidates" (
    "id" SERIAL PRIMARY KEY,
    "session_event_id" INTEGER NOT NULL REFERENCES "piscine_sessions"("event_id") ON DELETE CASCADE,
    "login" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "level" INTEGER,
    "admission" VARCHAR(20) NOT NULL DEFAULT 'en_cours',
    "exercises_done" INTEGER NOT NULL DEFAULT 0,
    "exercises_tried" INTEGER NOT NULL DEFAULT 0,
    "exam_average" REAL,
    "last_activity_at" TIMESTAMP,
    "synced_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_piscine_candidate_unique"
    ON "piscine_candidates"("session_event_id", "login");
CREATE INDEX IF NOT EXISTS "idx_piscine_candidate_login" ON "piscine_candidates"("login");
CREATE INDEX IF NOT EXISTS "idx_piscine_candidate_admission" ON "piscine_candidates"("admission");

-- Une épreuve par candidat : Zone01 produit plusieurs `progress` pour un
-- exercice repassé, seul le plus récent est conservé.
CREATE TABLE IF NOT EXISTS "piscine_results" (
    "id" SERIAL PRIMARY KEY,
    "candidate_id" INTEGER NOT NULL REFERENCES "piscine_candidates"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "grade" REAL,
    "is_done" BOOLEAN NOT NULL DEFAULT FALSE,
    "event_id" INTEGER,
    "updated_at" TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_piscine_result_unique"
    ON "piscine_results"("candidate_id", "name");
CREATE INDEX IF NOT EXISTS "idx_piscine_result_candidate" ON "piscine_results"("candidate_id");
