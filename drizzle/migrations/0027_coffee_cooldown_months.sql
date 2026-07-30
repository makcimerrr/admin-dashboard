-- Café du mois : anti-répétition — nombre de mois de « cooldown » pendant
-- lesquels un apprenant déjà tiré est évité (défaut 3).

ALTER TABLE "coffee_draws"
	ADD COLUMN IF NOT EXISTS "cooldown_months" integer DEFAULT 3 NOT NULL;
