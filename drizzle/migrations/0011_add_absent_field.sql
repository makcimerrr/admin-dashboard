-- Migration: Ajout du champ "absent" pour marquer les étudiants absents lors d'un audit
ALTER TABLE "audit_results" ADD COLUMN IF NOT EXISTS "absent" boolean DEFAULT false NOT NULL;
