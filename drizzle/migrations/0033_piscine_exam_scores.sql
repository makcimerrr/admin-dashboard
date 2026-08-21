-- Notes d'examen exprimées en exercices réussis sur un barème, plutôt qu'en
-- `grade` Zone01 : ces grades se sont révélés inexploitables (valeurs > 1,
-- sans rapport lisible avec la performance réelle).
--
--   Exam 01 → /5   Exam 02 → /7   Exam 03 → /9   Final Exam → /10

ALTER TABLE "piscine_results"
    ADD COLUMN IF NOT EXISTS "score" INTEGER,
    ADD COLUMN IF NOT EXISTS "max_score" INTEGER;

ALTER TABLE "piscine_candidates"
    ADD COLUMN IF NOT EXISTS "exam_passed" INTEGER,
    ADD COLUMN IF NOT EXISTS "exam_total" INTEGER;

COMMENT ON COLUMN "piscine_candidates"."exam_average" IS
    'Moyenne ABSOLUE : exam_passed / exam_total sur l''ensemble des examens, et non la moyenne des ratios par examen.';
