CREATE TABLE IF NOT EXISTS "discord_users" (
  "id" serial PRIMARY KEY,
  "login" varchar(100) NOT NULL UNIQUE,
  "discord_id" varchar(30) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "group_statuses" (
  "id" serial PRIMARY KEY,
  "group_id" varchar(100) NOT NULL,
  "promo_id" varchar(50) NOT NULL,
  "project_name" varchar(100) NOT NULL,
  "status" varchar(30) NOT NULL,
  "captain_login" varchar(100),
  "notified_audit_at" timestamp,
  "last_seen_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_group_status_unique"
  ON "group_statuses" ("group_id", "promo_id", "project_name");
