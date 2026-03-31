CREATE TABLE IF NOT EXISTS "alternant_attendance_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"contract_id" integer,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"days_present" integer DEFAULT 0,
	"days_absent" integer DEFAULT 0,
	"days_justified" integer DEFAULT 0,
	"comments" text,
	"validated_by" text,
	"validated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alternant_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"contract_type" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"company_name" text NOT NULL,
	"company_address" text,
	"company_siret" text,
	"tutor_name" text,
	"tutor_email" text,
	"tutor_phone" text,
	"salary" text,
	"work_schedule" text,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alternant_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"contract_id" integer,
	"document_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_name" text,
	"file_url" text,
	"file_size" integer,
	"mime_type" text,
	"uploaded_at" timestamp DEFAULT now(),
	"valid_until" timestamp,
	"is_archived" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"student_login" varchar(100) NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	"absent" boolean DEFAULT false NOT NULL,
	"feedback" text,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"promo_id" varchar(50) NOT NULL,
	"track" varchar(20) NOT NULL,
	"project_name" varchar(100) NOT NULL,
	"group_id" varchar(100) NOT NULL,
	"summary" text,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"priority" varchar(20) DEFAULT 'normal',
	"is_archived" boolean DEFAULT false,
	"validated_count" integer DEFAULT 0,
	"total_members" integer DEFAULT 0,
	"auditor_id" integer,
	"auditor_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discord_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"login" varchar(100) NOT NULL,
	"discord_id" varchar(30) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discord_users_login_unique" UNIQUE("login")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" varchar(100) NOT NULL,
	"promo_id" varchar(50) NOT NULL,
	"project_name" varchar(100) NOT NULL,
	"status" varchar(30) NOT NULL,
	"captain_login" varchar(100),
	"notified_audit_at" timestamp,
	"slot_date" timestamp,
	"slot_booked_at" timestamp,
	"slot_event_id" varchar(200),
	"slot_attendee_email" varchar(200),
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviewers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"planning_url" varchar(500) NOT NULL,
	"tracks" jsonb DEFAULT '["Golang","Javascript","Rust","Java"]'::jsonb NOT NULL,
	"calendar_id" varchar(300),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "is_archived" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "archived_reason" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "is_dropout" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "dropout_at" timestamp;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "dropout_reason" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "dropout_notes" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "previous_promo" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "is_alternant" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "alternant_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "alternant_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "company_contact" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "company_email" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "company_phone" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "alternant_notes" text;--> statement-breakpoint
ALTER TABLE "updates" ADD COLUMN "is_auto" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alternant_attendance_reports" ADD CONSTRAINT "alternant_attendance_reports_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alternant_attendance_reports" ADD CONSTRAINT "alternant_attendance_reports_contract_id_alternant_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."alternant_contracts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alternant_contracts" ADD CONSTRAINT "alternant_contracts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alternant_documents" ADD CONSTRAINT "alternant_documents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alternant_documents" ADD CONSTRAINT "alternant_documents_contract_id_alternant_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."alternant_contracts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audits" ADD CONSTRAINT "audits_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_results_audit" ON "audit_results" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_results_student" ON "audit_results" USING btree ("student_login");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_audit_result_unique" ON "audit_results" USING btree ("audit_id","student_login");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audits_promo_track" ON "audits" USING btree ("promo_id","track");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audits_group" ON "audits" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audits_created" ON "audits" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_audit_unique" ON "audits" USING btree ("promo_id","project_name","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_group_status_unique" ON "group_statuses" USING btree ("group_id","promo_id","project_name");