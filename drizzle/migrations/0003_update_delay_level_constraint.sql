-- Migration pour mettre à jour la contrainte delay_level
-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE "student_projects" DROP CONSTRAINT IF EXISTS "student_projects_delay_level_check";

-- Ajouter la nouvelle contrainte avec les valeurs Validé et Non Validé
ALTER TABLE "student_projects"
ADD CONSTRAINT "student_projects_delay_level_check"
CHECK (delay_level IN ('bien', 'en retard', 'en avance', 'spécialité', 'Validé', 'Non Validé'));
