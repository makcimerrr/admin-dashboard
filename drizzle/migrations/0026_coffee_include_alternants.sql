-- Café du mois : réglage « inclure les alternants » choisi au lancement du
-- tirage (le re-tirage individuel réutilise le même réglage).

ALTER TABLE "coffee_draws"
	ADD COLUMN IF NOT EXISTS "include_alternants" boolean DEFAULT true NOT NULL;
