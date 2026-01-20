-- Migration: Add dropout/perdition fields to students table
-- This adds the ability to mark students as dropouts while keeping their data for tracking

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "is_dropout" boolean DEFAULT false;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "dropout_at" timestamp;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "dropout_reason" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "dropout_notes" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "previous_promo" text;

-- Create index for faster filtering of active vs dropout students
CREATE INDEX IF NOT EXISTS "students_is_dropout_idx" ON "students" ("is_dropout");
