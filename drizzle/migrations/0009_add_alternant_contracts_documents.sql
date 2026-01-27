-- Table des contrats d'alternance
CREATE TABLE IF NOT EXISTS "alternant_contracts" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "contract_type" text NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "company_name" text NOT NULL,
  "company_address" text,
  "company_siret" text,
  "tutor_name" text,
  "tutor_email" text,
  "tutor_phone" text,
  "salary" text,
  "work_schedule" text,
  "notes" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Table des documents liés aux alternants
CREATE TABLE IF NOT EXISTS "alternant_documents" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "contract_id" integer REFERENCES "alternant_contracts"("id") ON DELETE SET NULL,
  "document_type" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "file_name" text,
  "file_url" text,
  "file_size" integer,
  "mime_type" text,
  "uploaded_at" timestamp DEFAULT now(),
  "valid_until" timestamp,
  "is_archived" boolean DEFAULT false
);

-- Table pour les comptes rendus d'assiduité
CREATE TABLE IF NOT EXISTS "alternant_attendance_reports" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "contract_id" integer REFERENCES "alternant_contracts"("id") ON DELETE SET NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "days_present" integer DEFAULT 0,
  "days_absent" integer DEFAULT 0,
  "days_justified" integer DEFAULT 0,
  "comments" text,
  "validated_by" text,
  "validated_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS "alternant_contracts_student_id_idx" ON "alternant_contracts" ("student_id");
CREATE INDEX IF NOT EXISTS "alternant_contracts_is_active_idx" ON "alternant_contracts" ("is_active");
CREATE INDEX IF NOT EXISTS "alternant_documents_student_id_idx" ON "alternant_documents" ("student_id");
CREATE INDEX IF NOT EXISTS "alternant_documents_contract_id_idx" ON "alternant_documents" ("contract_id");
CREATE INDEX IF NOT EXISTS "alternant_attendance_reports_student_id_idx" ON "alternant_attendance_reports" ("student_id");
