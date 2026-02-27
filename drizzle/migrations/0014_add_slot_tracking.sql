ALTER TABLE "group_statuses"
  ADD COLUMN IF NOT EXISTS "slot_date" timestamp,
  ADD COLUMN IF NOT EXISTS "slot_booked_at" timestamp,
  ADD COLUMN IF NOT EXISTS "slot_event_id" varchar(200);
