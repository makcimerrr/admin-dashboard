-- Chantier B : objectifs hebdomadaires de code-reviews par promo

CREATE TABLE IF NOT EXISTS "promo_cr_targets" (
    "promo_id" VARCHAR(50) PRIMARY KEY,
    "weekly_target" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);
