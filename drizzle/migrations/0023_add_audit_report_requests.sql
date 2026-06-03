-- Chantier D : suivi des demandes de compte-rendu d'audit (Discord)

CREATE TABLE IF NOT EXISTS "audit_report_requests" (
    "id" SERIAL PRIMARY KEY,
    "auditor_login" VARCHAR(100) NOT NULL,
    "group_id" VARCHAR(100) NOT NULL,
    "project_name" VARCHAR(100),
    "requested_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_audit_report_req_unique"
    ON "audit_report_requests"("auditor_login", "group_id");
