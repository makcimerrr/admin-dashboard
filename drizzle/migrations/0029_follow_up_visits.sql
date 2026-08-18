-- Module « Suivi en entreprise » : échéances de suivi (3M/6M/1A/18M/2A),
-- relances tracées et comptes rendus. Remplace le Notion tenu à la main.
--
-- Les jalons sont EN BASE (table follow_up_milestone_types) et non figés dans
-- le code : les besoins pédagogiques évoluent.

-- ─── Jalons configurables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "follow_up_milestone_types" (
    "code" VARCHAR(20) PRIMARY KEY,
    "label" TEXT NOT NULL,
    "offset_months" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

INSERT INTO "follow_up_milestone_types" ("code", "label", "offset_months", "display_order")
VALUES
    ('M3',  '3 mois',  3,  1),
    ('M6',  '6 mois',  6,  2),
    ('M12', '1 an',    12, 3),
    ('M18', '18 mois', 18, 4),
    ('M24', '2 ans',   24, 5)
ON CONFLICT ("code") DO NOTHING;

-- ─── Réglages du module (singleton id = 1) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "follow_up_settings" (
    "id" INTEGER PRIMARY KEY DEFAULT 1,
    "internal_alert_lead_days" INTEGER NOT NULL DEFAULT 30,
    "reminder_lead_days" INTEGER NOT NULL DEFAULT 21,
    "second_reminder_after_days" INTEGER NOT NULL DEFAULT 10,
    "booking_url" TEXT,
    "watched_calendar_id" TEXT,
    "sender_name" TEXT,
    "sender_email" TEXT,
    "reply_to_email" TEXT,
    "email_subject_template" TEXT,
    "email_body_template" TEXT,
    "teams_alerts_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_by" TEXT,
    CONSTRAINT "follow_up_settings_singleton" CHECK ("id" = 1)
);

INSERT INTO "follow_up_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

-- ─── Échéances ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "follow_up_milestones" (
    "id" SERIAL PRIMARY KEY,
    "contract_id" INTEGER NOT NULL REFERENCES "alternant_contracts"("id") ON DELETE CASCADE,
    "student_id" INTEGER NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "type_code" VARCHAR(20) NOT NULL REFERENCES "follow_up_milestone_types"("code") ON DELETE RESTRICT,
    "due_date" TIMESTAMP NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'a_venir',
    "status_changed_at" TIMESTAMP,
    "scheduled_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "calendar_event_id" TEXT,
    "cancel_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_follow_up_milestone_unique"
    ON "follow_up_milestones"("contract_id", "type_code");
CREATE INDEX IF NOT EXISTS "idx_follow_up_milestone_due"
    ON "follow_up_milestones"("due_date");
CREATE INDEX IF NOT EXISTS "idx_follow_up_milestone_status"
    ON "follow_up_milestones"("status");
CREATE INDEX IF NOT EXISTS "idx_follow_up_milestone_student"
    ON "follow_up_milestones"("student_id");

-- ─── Relances envoyées (traçabilité / anti-doublon) ──────────────────────────
-- `kind` ∈ {manual, relance} : il n'existe pas d'envoi automatique, chaque mail
-- part sur confirmation humaine explicite (sent_by = l'utilisateur qui a validé).

CREATE TABLE IF NOT EXISTS "follow_up_reminders" (
    "id" SERIAL PRIMARY KEY,
    "milestone_id" INTEGER NOT NULL REFERENCES "follow_up_milestones"("id") ON DELETE CASCADE,
    "channel" VARCHAR(20) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "recipient" TEXT,
    "subject" TEXT,
    "sent_by" TEXT,
    "sent_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
    "error" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_follow_up_reminder_milestone"
    ON "follow_up_reminders"("milestone_id");

-- ─── Comptes rendus de suivi ─────────────────────────────────────────────────
-- student_id NOT NULL : l'historique survit à la disparition d'un contrat.

CREATE TABLE IF NOT EXISTS "follow_up_reports" (
    "id" SERIAL PRIMARY KEY,
    "milestone_id" INTEGER REFERENCES "follow_up_milestones"("id") ON DELETE SET NULL,
    "student_id" INTEGER NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "contract_id" INTEGER REFERENCES "alternant_contracts"("id") ON DELETE SET NULL,
    "company_name" TEXT,
    "tutor_name" TEXT,
    "performed_at" TIMESTAMP NOT NULL,
    "author" TEXT NOT NULL,
    "mode" VARCHAR(20),
    "content" TEXT NOT NULL,
    "vigilance_points" TEXT,
    "document_id" INTEGER REFERENCES "alternant_documents"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_follow_up_report_student"
    ON "follow_up_reports"("student_id");
CREATE INDEX IF NOT EXISTS "idx_follow_up_report_contract"
    ON "follow_up_reports"("contract_id");
