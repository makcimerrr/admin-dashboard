-- Ajout des champs pour les étudiants alternants
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "is_alternant" boolean DEFAULT false;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "alternant_start_date" timestamp;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "alternant_end_date" timestamp;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "company_contact" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "company_email" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "company_phone" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "alternant_notes" text;

-- Index pour les requêtes filtrées par alternant
CREATE INDEX IF NOT EXISTS "students_is_alternant_idx" ON "students" ("is_alternant");
CREATE INDEX IF NOT EXISTS "students_company_name_idx" ON "students" ("company_name");
