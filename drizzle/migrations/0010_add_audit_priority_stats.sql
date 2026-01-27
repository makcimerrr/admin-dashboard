-- Ajout des champs de priorité et statistiques pour les audits
ALTER TABLE "audits" ADD COLUMN IF NOT EXISTS "priority" varchar(20) DEFAULT 'normal';
ALTER TABLE "audits" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false;
ALTER TABLE "audits" ADD COLUMN IF NOT EXISTS "validated_count" integer DEFAULT 0;
ALTER TABLE "audits" ADD COLUMN IF NOT EXISTS "total_members" integer DEFAULT 0;

-- Index pour filtrer par priorité
CREATE INDEX IF NOT EXISTS "idx_audits_priority" ON "audits" ("priority");

-- Mise à jour des audits existants pour calculer les stats
UPDATE "audits" a
SET
  "validated_count" = (
    SELECT COUNT(*) FROM "audit_results" ar
    WHERE ar.audit_id = a.id AND ar.validated = true
  ),
  "total_members" = (
    SELECT COUNT(*) FROM "audit_results" ar
    WHERE ar.audit_id = a.id
  );

-- Mise à jour de la priorité basée sur les warnings et le taux de validation
UPDATE "audits" a
SET "priority" = CASE
  WHEN jsonb_array_length(COALESCE(a.warnings, '[]'::jsonb)) > 0 THEN 'urgent'
  WHEN a.total_members > 0 AND (a.validated_count::float / a.total_members) < 0.3 THEN 'urgent'
  WHEN a.total_members > 0 AND (a.validated_count::float / a.total_members) < 0.5 THEN 'warning'
  ELSE 'normal'
END;
