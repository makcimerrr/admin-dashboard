/**
 * Tags de profil attribuables à un apprenant lors d'une code review, en
 * point FORT ou point FAIBLE (audit_results.strengths / weaknesses).
 * Agrégés sur la vue Placement alternance pour identifier les profils
 * (« un leader », « un profil IA », « bon en communication »…).
 *
 * Liste partagée client/serveur, groupée pour l'affichage — la modifier ici
 * suffit (les tags sont stockés en texte : en retirer un n'efface pas
 * l'historique des audits déjà saisis).
 */
export const CR_TAG_GROUPS = [
  {
    label: 'Savoir-être',
    tags: [
      'Leader',
      'Communication',
      "Esprit d'équipe",
      'Autonomie',
      'Rigueur',
      'Curiosité',
      'Investissement',
      'Gestion du temps',
      'Ponctualité',
      'Adaptabilité',
      'Créativité',
      'Prise d\'initiative',
      'Pédagogue',
      'Écoute',
      'Gestion du stress',
      'Esprit critique',
      'Persévérance',
    ],
  },
  {
    label: 'Technique',
    tags: [
      'Algorithmie',
      'Architecture',
      'Code propre',
      'Debug',
      'Tests',
      'Git',
      'Documentation',
      'Performance',
      'Sécurité',
      'UX/UI',
      'Veille technique',
      'Résolution de problèmes',
    ],
  },
  {
    label: 'Domaines',
    tags: [
      'Frontend',
      'Backend',
      'Fullstack',
      'IA',
      'Data',
      'DevOps',
      'Mobile',
      'Cybersécurité',
      'Réseau',
      'Bases de données',
      'Systèmes / Low-level',
      'API',
      'Scripting / Automatisation',
      'Gestion de projet',
    ],
  },
] as const;

/** Liste plate (ordre des groupes) — filtres, validations, agrégations. */
export const CR_TAGS = CR_TAG_GROUPS.flatMap((g) => [...g.tags]);

export type CrTag = (typeof CR_TAG_GROUPS)[number]['tags'][number];
