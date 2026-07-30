-- Tirage au sort mensuel « café » : 9–10 apprenants (toutes promos actives,
-- hors archivés / perdition / alternants). Phase de test : affichage seul.

CREATE TABLE IF NOT EXISTS "coffee_draws" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"quota" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "coffee_draw_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"draw_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"login" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"promo_name" text NOT NULL,
	"status" text DEFAULT 'drawn' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "coffee_draw_participants"
	ADD CONSTRAINT "coffee_draw_participants_draw_id_coffee_draws_id_fk"
	FOREIGN KEY ("draw_id") REFERENCES "public"."coffee_draws"("id")
	ON DELETE cascade ON UPDATE no action;

ALTER TABLE "coffee_draw_participants"
	ADD CONSTRAINT "coffee_draw_participants_student_id_students_id_fk"
	FOREIGN KEY ("student_id") REFERENCES "public"."students"("id")
	ON DELETE no action ON UPDATE no action;
