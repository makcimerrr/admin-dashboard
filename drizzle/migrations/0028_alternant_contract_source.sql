-- Contrats alternance : origine de la ligne — 'manual' (saisie hub) ou
-- 'emargement' (synchronisé depuis émargement). La synchro ne remplace que les
-- lignes 'emargement', jamais les contrats saisis à la main.

ALTER TABLE "alternant_contracts"
	ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual' NOT NULL;
