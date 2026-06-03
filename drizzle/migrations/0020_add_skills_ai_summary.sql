-- Chantier A / Palier 2 : narratif IA (opt-in) sur le profil Gitea

ALTER TABLE "student_gitea_profiles"
    ADD COLUMN IF NOT EXISTS "ai_summary" TEXT,
    ADD COLUMN IF NOT EXISTS "ai_summary_at" TIMESTAMP;
