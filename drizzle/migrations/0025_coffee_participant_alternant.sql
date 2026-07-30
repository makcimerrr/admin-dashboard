-- Café du mois : inclure les alternants dans le vivier + tag « Alternant »
-- affiché en face du nom. Snapshot du statut alternant au moment du tirage.

ALTER TABLE "coffee_draw_participants"
	ADD COLUMN IF NOT EXISTS "is_alternant" boolean DEFAULT false NOT NULL;
