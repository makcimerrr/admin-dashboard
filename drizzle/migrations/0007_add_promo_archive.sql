-- Ajout des champs d'archivage pour les promotions
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false;
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "archived_reason" text;

-- Index pour les requêtes filtrées par archivage
CREATE INDEX IF NOT EXISTS "promotions_is_archived_idx" ON "promotions" ("is_archived");
