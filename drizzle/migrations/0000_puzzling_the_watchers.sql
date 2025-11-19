DO $$ BEGIN
 CREATE TYPE "public"."promos" AS ENUM('P1 2022', 'P1 2023', 'P2 2023', 'P1 2024');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"initial" text NOT NULL,
	"role" text NOT NULL,
	"avatar" text,
	"color" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"hours_per_week" text,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hackaton_weeks" (
	"week_key" text PRIMARY KEY NOT NULL,
	"is_hackaton" boolean NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "history" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"action" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"entity_id" text NOT NULL,
	"details" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"start" date NOT NULL,
	"end" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"username" varchar(255),
	"password" varchar(255),
	"role" varchar(50) DEFAULT 'user',
	"planning_permission" varchar(20) DEFAULT 'reader',
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delays_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"promo_id" text NOT NULL,
	"late_count" integer DEFAULT 0,
	"good_late_count" integer DEFAULT 0,
	"advance_late_count" integer DEFAULT 0,
	"speciality_count" integer DEFAULT 0,
	"last_update" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
	"promo_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "promotions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_current_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"golang_project" text,
	"javascript_project" text,
	"rust_project" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"project_name" text NOT NULL,
	"progress_status" text NOT NULL,
	"delay_level" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_specialty_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"golang_completed" boolean NOT NULL,
	"javascript_completed" boolean NOT NULL,
	"rust_completed" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"login" text NOT NULL,
	"available_at" timestamp NOT NULL,
	"promo_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_update" timestamp NOT NULL,
	"event_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"project_time_week" integer NOT NULL,
	"category" text NOT NULL,
	"sort_index" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promo_config" (
	"key" text PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"title" text NOT NULL,
	"start" date NOT NULL,
	"piscine_js_start" date,
	"piscine_js_end" date,
	"piscine_rust_start" date,
	"piscine_rust_end" date,
	"end" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promo_status" (
	"promo_key" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"promotion_name" text NOT NULL,
	"current_project" text,
	"progress" integer DEFAULT 0,
	"agenda" jsonb,
	"start_date" date,
	"end_date" date,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"week_key" text NOT NULL,
	"day" text NOT NULL,
	"time_slots" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delays_status" ADD CONSTRAINT "delays_status_promo_id_promotions_promo_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promotions"("promo_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_current_projects" ADD CONSTRAINT "student_current_projects_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_specialty_progress" ADD CONSTRAINT "student_specialty_progress_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "students" ADD CONSTRAINT "students_promo_name_promotions_name_fk" FOREIGN KEY ("promo_name") REFERENCES "public"."promotions"("name") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedules" ADD CONSTRAINT "schedules_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_email_idx" ON "employees" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_active_idx" ON "employees" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedules_employee_week_day_idx" ON "schedules" USING btree ("employee_id","week_key","day");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedules_week_key_idx" ON "schedules" USING btree ("week_key");