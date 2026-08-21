-- Saisie humaine sur un candidat de piscine : commentaire libre, et jusqu'à
-- 3 comptes rendus par projet (quad, sudoku, quadchecker).
--
-- Ces données ne viennent PAS de Zone01 et ne doivent jamais être écrasées par
-- la synchro : elles vivent dans leurs propres tables, pas dans
-- `piscine_candidates` ni `piscine_results` que le miroir réécrit.

CREATE TABLE IF NOT EXISTS "piscine_candidate_comments" (
    "candidate_id" INTEGER PRIMARY KEY REFERENCES "piscine_candidates"("id") ON DELETE CASCADE,
    "comment" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "piscine_project_reviews" (
    "id" SERIAL PRIMARY KEY,
    "candidate_id" INTEGER NOT NULL REFERENCES "piscine_candidates"("id") ON DELETE CASCADE,
    -- quad | sudoku | quadchecker
    "project" TEXT NOT NULL,
    -- 1, 2 ou 3 : les trois comptes rendus attendus par projet
    "slot" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_piscine_review_unique"
    ON "piscine_project_reviews"("candidate_id", "project", "slot");
CREATE INDEX IF NOT EXISTS "idx_piscine_review_candidate"
    ON "piscine_project_reviews"("candidate_id");
