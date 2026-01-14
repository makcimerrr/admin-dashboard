// Système d'analyse d'intentions pour le chatbot

export type Intent =
  | 'search_student'
  | 'get_stats'
  | 'get_student_details'
  | 'list_late_students'
  | 'list_validated_students'
  | 'track_progress'
  | 'greeting'
  | 'help'
  | 'unknown';

export interface AnalyzedMessage {
  intent: Intent;
  entities: {
    studentName?: string;
    studentId?: number;
    track?: 'golang' | 'javascript' | 'rust' | 'java';
    promo?: string;
  };
  confidence: number;
}

const patterns = {
  search_student: [
    /cherch(?:e|er|ez)\s+(?:l['''])?(?:étudiant|élève)\s+(.+)/i,
    /(?:qui|quel)\s+(?:est|sont)\s+(.+)/i,
    /trouv(?:e|er|ez)\s+(.+)/i,
    /recherch(?:e|er|ez)\s+(.+)/i,
  ],
  get_stats: [
    /combien\s+(?:d['''])?(?:étudiants?|élèves?)/i,
    /statistiques?\s+(?:globales?)?/i,
    /(?:nombre|total)\s+(?:d['''])?(?:étudiants?|élèves?)/i,
    /taux\s+de\s+(?:réussite|succès)/i,
  ],
  list_late_students: [
    /(?:étudiants?|élèves?)\s+en\s+retard/i,
    /(?:qui|quels)\s+(?:sont|est)\s+en\s+retard/i,
    /retard(?:s)?/i,
  ],
  list_validated_students: [
    /(?:étudiants?|élèves?)\s+validé(?:s)?/i,
    /(?:qui|quels)\s+(?:ont|a)\s+validé/i,
  ],
  track_progress: [
    /progression\s+(?:de|du|des?)\s+(.+)/i,
    /(?:quel|quelle)\s+(?:est\s+)?(?:la\s+)?progression/i,
    /avancement\s+(?:de|du|des?)\s+(.+)/i,
    /tronc(?:s)?\s+(golang|javascript|rust|java)/i,
  ],
  greeting: [
    /^(?:bonjour|salut|hello|hi|hey)/i,
  ],
  help: [
    /aide/i,
    /comment/i,
    /peux[-\s]tu/i,
    /que\s+peux[-\s]tu/i,
  ],
};

export function analyzeMessage(message: string): AnalyzedMessage {
  const result: AnalyzedMessage = {
    intent: 'unknown',
    entities: {},
    confidence: 0,
  };

  // Nettoyer le message
  const cleanMessage = message.trim().toLowerCase();

  // Tester chaque pattern
  for (const [intent, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const match = cleanMessage.match(regex);
      if (match) {
        result.intent = intent as Intent;
        result.confidence = 0.8;

        // Extraire les entités
        if (match[1]) {
          const entity = match[1].trim();

          // Vérifier si c'est un ID
          const idMatch = entity.match(/\d+/);
          if (idMatch) {
            result.entities.studentId = parseInt(idMatch[0]);
          } else if (intent === 'search_student' || intent === 'track_progress') {
            result.entities.studentName = entity;
          }

          // Extraire le tronc
          const trackMatch = entity.match(/(golang|javascript|rust|java)/i);
          if (trackMatch) {
            result.entities.track = trackMatch[1].toLowerCase() as any;
          }
        }

        return result;
      }
    }
  }

  return result;
}

export function extractStudentName(message: string): string | null {
  // Patterns pour extraire un nom d'étudiant
  const patterns = [
    /(?:étudiant|élève)\s+([a-zàâäéèêëïîôùûüÿç\s-]+)/i,
    /(?:login|utilisateur)\s+([a-z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export function extractStudentId(message: string): number | null {
  const match = message.match(/(?:id|#)\s*(\d+)/i);
  return match ? parseInt(match[1]) : null;
}
