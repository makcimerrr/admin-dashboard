/**
 * Tags de profil attribuables à un apprenant lors d'une code review, en
 * point FORT ou point FAIBLE (audit_results.strengths / weaknesses).
 * Agrégés sur la vue Placement alternance pour identifier les profils
 * (« un leader », « un profil IA », « bon en communication »…).
 *
 * Liste partagée client/serveur — la modifier ici suffit (les tags sont
 * stockés en texte : en retirer un n'efface pas l'historique).
 */
export const CR_TAGS = [
  'Leader',
  'Communication',
  "Esprit d'équipe",
  'Autonomie',
  'Rigueur',
  'Curiosité',
  'Investissement',
  'Gestion du temps',
  'Algorithmie',
  'Architecture',
  'Frontend',
  'Backend',
  'Debug',
  'IA',
  'Documentation',
] as const;

export type CrTag = (typeof CR_TAGS)[number];
