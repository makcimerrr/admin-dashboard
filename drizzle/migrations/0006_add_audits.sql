-- Migration: Add audits tables for Code Reviews feature
-- Description: Tables for tracking pedagogical audits/code reviews
-- The audit data is stored locally, while student/project/group data comes from Zone01 API

-- Table des audits (Code Reviews)
CREATE TABLE IF NOT EXISTS "audits" (
    "id" SERIAL PRIMARY KEY,
    "promo_id" VARCHAR(50) NOT NULL,
    "track" VARCHAR(20) NOT NULL,
    "project_name" VARCHAR(100) NOT NULL,
    "group_id" VARCHAR(100) NOT NULL,
    "summary" TEXT,
    "warnings" JSONB DEFAULT '[]',
    "auditor_id" INTEGER REFERENCES "users"("id"),
    "auditor_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table des résultats individuels par étudiant
CREATE TABLE IF NOT EXISTS "audit_results" (
    "id" SERIAL PRIMARY KEY,
    "audit_id" INTEGER NOT NULL REFERENCES "audits"("id") ON DELETE CASCADE,
    "student_login" VARCHAR(100) NOT NULL,
    "validated" BOOLEAN DEFAULT FALSE NOT NULL,
    "feedback" TEXT,
    "warnings" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS "idx_audits_promo_track" ON "audits"("promo_id", "track");
CREATE INDEX IF NOT EXISTS "idx_audits_group" ON "audits"("group_id");
CREATE INDEX IF NOT EXISTS "idx_audits_created" ON "audits"("created_at");

-- Contrainte d'unicité : un seul audit par groupe/projet/promo
CREATE UNIQUE INDEX IF NOT EXISTS "idx_audit_unique" ON "audits"("promo_id", "project_name", "group_id");

-- Index pour les résultats
CREATE INDEX IF NOT EXISTS "idx_audit_results_audit" ON "audit_results"("audit_id");
CREATE INDEX IF NOT EXISTS "idx_audit_results_student" ON "audit_results"("student_login");

-- Un étudiant ne peut avoir qu'un seul résultat par audit
CREATE UNIQUE INDEX IF NOT EXISTS "idx_audit_result_unique" ON "audit_results"("audit_id", "student_login");
