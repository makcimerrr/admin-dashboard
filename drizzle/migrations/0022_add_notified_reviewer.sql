-- Chantier C : mémoriser le coach (reviewer) contacté lors de la notification

ALTER TABLE "group_statuses"
    ADD COLUMN IF NOT EXISTS "notified_reviewer_name" VARCHAR(255);
