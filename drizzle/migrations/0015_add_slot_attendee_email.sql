ALTER TABLE "group_statuses"
  ADD COLUMN IF NOT EXISTS "slot_attendee_email" varchar(200);
