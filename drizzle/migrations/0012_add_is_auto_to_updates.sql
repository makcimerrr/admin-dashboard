ALTER TABLE "updates" ADD COLUMN IF NOT EXISTS "is_auto" boolean NOT NULL DEFAULT false;

