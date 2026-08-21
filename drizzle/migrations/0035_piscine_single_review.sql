-- Un seul compte rendu par projet, au lieu de trois.
--
-- Les 302 comptes rendus importés de Notion occupent tous l'emplacement 1 (la
-- source n'en porte qu'un par projet) et les emplacements 2 et 3 sont restés
-- vides : la colonne `slot` ne portait donc aucune information. La clé
-- d'unicité devient (candidat, projet).

-- Garde-fou : si un emplacement 2 ou 3 avait été rempli entre-temps, on
-- s'arrête plutôt que de le perdre silencieusement.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM piscine_project_reviews WHERE slot <> 1) THEN
        RAISE EXCEPTION 'Des comptes rendus occupent les emplacements 2 ou 3 : les fusionner avant de migrer.';
    END IF;
END $$;

DROP INDEX IF EXISTS "idx_piscine_review_unique";

ALTER TABLE "piscine_project_reviews" DROP COLUMN IF EXISTS "slot";

CREATE UNIQUE INDEX IF NOT EXISTS "idx_piscine_review_unique"
    ON "piscine_project_reviews"("candidate_id", "project");
