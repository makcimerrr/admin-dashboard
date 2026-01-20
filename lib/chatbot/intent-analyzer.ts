// Système d'analyse d'intentions amélioré pour le chatbot Nova
// Supporte la recherche par prénom, nom de famille, login, et combinaisons

export type Intent =
  | 'search_student'
  | 'get_stats'
  | 'get_student_details'
  | 'list_late_students'
  | 'list_validated_students'
  | 'list_ahead_students'
  | 'list_by_promo'
  | 'list_by_specialty'
  | 'track_progress'
  | 'greeting'
  | 'help'
  | 'unknown';

export interface AnalyzedMessage {
  intent: Intent;
  entities: {
    studentName?: string;
    firstName?: string;
    lastName?: string;
    studentId?: number;
    track?: 'golang' | 'javascript' | 'rust' | 'java';
    promo?: string;
    searchTerms?: string[];
  };
  confidence: number;
}

// Liste des prénoms français courants pour aider à la détection
const commonFirstNames = new Set([
  'maxime', 'alexandre', 'antoine', 'benjamin', 'charles', 'david', 'emma', 'gabriel',
  'hugo', 'julie', 'kevin', 'lucas', 'marie', 'nicolas', 'olivier', 'paul', 'quentin',
  'romain', 'sarah', 'thomas', 'vincent', 'yann', 'zoé', 'adrien', 'bastien', 'clément',
  'damien', 'ethan', 'florian', 'guillaume', 'julien', 'léa', 'manon', 'nathan', 'pierre',
  'raphael', 'simon', 'théo', 'valentin', 'xavier', 'william', 'arthur', 'louis', 'camille',
  'mathieu', 'jordan', 'dylan', 'enzo', 'mathis', 'noah', 'liam', 'alice', 'chloé', 'clara',
  'inès', 'jade', 'lola', 'louise', 'luna', 'nina', 'rose', 'victoria', 'anna', 'eva',
  'jean', 'jacques', 'michel', 'philippe', 'françois', 'alain', 'bernard', 'patrick',
  'christophe', 'frédéric', 'stéphane', 'laurent', 'eric', 'thierry', 'bruno', 'didier',
]);

// Mots-clés qui indiquent que ce n'est PAS une recherche de nom
const excludeKeywords = new Set([
  'combien', 'statistiques', 'stats', 'total', 'nombre', 'taux', 'pourcentage',
  'aide', 'help', 'comment', 'quoi', 'bonjour', 'salut', 'hello', 'merci',
  'tous', 'toutes', 'liste', 'lister', 'affiche', 'montre', 'voir',
]);

const patterns = {
  search_student: [
    // Recherche explicite
    /cherch(?:e|er|ez|ons)?\s+(?:l[''']?)?(?:étudiant|élève|personne)?\s*(.+)/i,
    /trouv(?:e|er|ez|ons)?\s+(?:l[''']?)?(?:étudiant|élève|personne)?\s*(.+)/i,
    /recherch(?:e|er|ez|ons)?\s+(.+)/i,
    // Demandes directes
    /(?:info(?:rmation)?s?|détails?|profil)\s+(?:sur|de|du|pour)\s+(.+)/i,
    /(?:qui\s+est|c[''']?est\s+qui)\s+(.+)/i,
    /(?:montre|affiche|donne)(?:-moi)?\s+(?:l[''']?)?(?:étudiant|élève|profil)?\s*(.+)/i,
    // Recherche par login avec @
    /@([a-z0-9_-]+)/i,
    // Avec préfixe login:
    /login[:\s]+([a-z0-9_-]+)/i,
  ],
  get_student_details: [
    /détails?\s+(?:de\s+)?(?:l[''']?)?(?:étudiant|élève)?\s*(?:#|id\s*)?(\d+)/i,
    /(?:étudiant|élève)\s*(?:#|id\s*)?(\d+)/i,
    /(?:#|id\s*)(\d+)/i,
    /voir\s+(?:l[''']?)?(?:étudiant|élève)\s*(?:#|id\s*)?(\d+)/i,
  ],
  get_stats: [
    /combien\s+(?:d[''']?|y\s+a(?:-t-il)?(?:\s+d[''']?)?)?\s*(?:étudiants?|élèves?|personnes?)/i,
    /(?:statistiques?|stats?)\s*(?:globales?)?/i,
    /(?:nombre|total)\s+(?:d[''']?)?(?:étudiants?|élèves?)/i,
    /taux\s+de\s+(?:réussite|succès|validation)/i,
    /(?:donne|montre|affiche)(?:-moi)?\s+les\s+(?:statistiques?|stats?)/i,
    /résumé|vue\s+d[''']?ensemble|dashboard/i,
  ],
  list_late_students: [
    /(?:étudiants?|élèves?|qui)\s+(?:sont?\s+)?en\s+retard/i,
    /(?:qui|quels?|quelles?)\s+(?:sont|est)\s+en\s+retard/i,
    /(?:liste|montre|affiche)(?:-moi)?\s+(?:les\s+)?(?:étudiants?\s+)?(?:en\s+)?retard/i,
    /(?:ceux|personnes?)\s+en\s+retard/i,
    /retard(?:ataires?)?/i,
  ],
  list_validated_students: [
    /(?:étudiants?|élèves?|qui)\s+(?:ont?\s+)?validé(?:s)?/i,
    /(?:qui|quels?|quelles?)\s+(?:ont|a)\s+validé/i,
    /(?:liste|montre|affiche)(?:-moi)?\s+(?:les\s+)?(?:étudiants?\s+)?validés?/i,
    /(?:ceux|personnes?)\s+(?:qui\s+ont\s+)?validé/i,
    /diplômés?|certifiés?/i,
  ],
  list_ahead_students: [
    /(?:étudiants?|élèves?|qui)\s+(?:sont?\s+)?en\s+avance/i,
    /(?:qui|quels?|quelles?)\s+(?:sont|est)\s+en\s+avance/i,
    /(?:liste|montre|affiche)(?:-moi)?\s+(?:les\s+)?(?:étudiants?\s+)?(?:en\s+)?avance/i,
    /(?:ceux|personnes?)\s+en\s+avance/i,
    /meilleurs?\s+(?:étudiants?|élèves?)/i,
    /bien\s+(?:en\s+)?progression/i,
  ],
  list_by_promo: [
    /(?:étudiants?|élèves?)\s+(?:de\s+)?(?:la\s+)?(?:promo(?:tion)?|cohorte)\s+(.+)/i,
    /promo(?:tion)?\s+(.+)/i,
    /(?:liste|montre|affiche)(?:-moi)?\s+(?:la\s+)?promo(?:tion)?\s+(.+)/i,
    /cohorte\s+(.+)/i,
  ],
  list_by_specialty: [
    /(?:étudiants?|élèves?)\s+(?:en|sur|qui\s+font)\s+(golang|javascript|js|rust|java)/i,
    /(?:qui|quels?|quelles?)\s+(?:font|sont\s+sur)\s+(golang|javascript|js|rust|java)/i,
    /spécialité\s+(golang|javascript|js|rust|java)/i,
    /tronc\s+(golang|javascript|js|rust|java)/i,
  ],
  track_progress: [
    /progression\s+(?:de|du|des?)\s+(.+)/i,
    /(?:quel(?:le)?|comment)\s+(?:est\s+)?(?:la\s+)?progression\s+(?:de\s+)?(.+)?/i,
    /avancement\s+(?:de|du|des?)\s+(.+)/i,
    /(?:où|ou)\s+en\s+est\s+(.+)/i,
    /(?:comment\s+)?(?:va|avance)\s+(.+)/i,
  ],
  greeting: [
    /^(?:bonjour|salut|hello|hi|hey|coucou|bonsoir)(?:\s|!|$)/i,
  ],
  help: [
    /^aide$/i,
    /(?:besoin\s+d[''']?)?aide/i,
    /(?:que\s+)?(?:peux|peut)[-\s]tu\s+(?:faire|m[''']?aider)/i,
    /comment\s+(?:ça\s+)?(?:marche|fonctionne)/i,
    /(?:quelles?\s+sont\s+)?(?:tes|les)\s+(?:fonctionnalités|capacités|commandes)/i,
  ],
};

// Normalise le texte (retire les accents, met en minuscules)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Détecte si un texte ressemble à un nom de personne
function looksLikeName(text: string): boolean {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter(w => w.length > 1);

  // Si c'est juste 1 ou 2 mots et pas de mots-clés exclus
  if (words.length >= 1 && words.length <= 3) {
    // Vérifie qu'aucun mot n'est un mot-clé exclu
    const hasExcludedKeyword = words.some(w => excludeKeywords.has(w));
    if (hasExcludedKeyword) return false;

    // Si un des mots est un prénom connu, c'est probablement un nom
    const hasKnownFirstName = words.some(w => commonFirstNames.has(w));
    if (hasKnownFirstName) return true;

    // Si c'est 2 mots avec des majuscules dans l'original, probablement un nom
    if (words.length === 2) {
      const originalWords = text.trim().split(/\s+/);
      const bothCapitalized = originalWords.every(w => w[0] === w[0].toUpperCase());
      if (bothCapitalized) return true;
    }

    // Si c'est un seul mot qui ressemble à un prénom/nom (lettres uniquement, pas trop court)
    if (words.length === 1 && /^[a-zàâäéèêëïîôùûüÿç-]+$/i.test(words[0]) && words[0].length >= 3) {
      return true;
    }
  }

  return false;
}

// Extrait les termes de recherche d'un nom potentiel
function extractSearchTerms(text: string): string[] {
  const cleaned = text
    .replace(/[?!.,;:'"]/g, '')
    .trim();

  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
  return words;
}

export function analyzeMessage(message: string): AnalyzedMessage {
  const result: AnalyzedMessage = {
    intent: 'unknown',
    entities: {},
    confidence: 0,
  };

  const cleanMessage = message.trim();
  const lowerMessage = cleanMessage.toLowerCase();

  // 1. D'abord tester les patterns explicites (haute priorité)
  for (const [intent, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const match = lowerMessage.match(regex);
      if (match) {
        result.intent = intent as Intent;
        result.confidence = 0.9;

        // Extraire les entités selon l'intent
        if (match[1]) {
          const entity = match[1].trim();

          // Cas spécial : recherche par ID
          if (intent === 'get_student_details') {
            const idMatch = entity.match(/\d+/);
            if (idMatch) {
              result.entities.studentId = parseInt(idMatch[0]);
            }
          }
          // Recherche d'étudiant
          else if (intent === 'search_student' || intent === 'track_progress') {
            const idMatch = entity.match(/(?:#|id\s*)?(\d+)$/i);
            if (idMatch) {
              result.entities.studentId = parseInt(idMatch[1]);
            } else {
              result.entities.studentName = entity;
              result.entities.searchTerms = extractSearchTerms(entity);
            }
          }
          // Promo
          else if (intent === 'list_by_promo') {
            result.entities.promo = entity;
          }
          // Spécialité
          else if (intent === 'list_by_specialty') {
            const track = entity.toLowerCase().replace('js', 'javascript') as any;
            result.entities.track = track;
          }
        }

        // Extraire le tronc si mentionné
        const trackMatch = lowerMessage.match(/(golang|javascript|js|rust|java)/i);
        if (trackMatch) {
          result.entities.track = trackMatch[1].toLowerCase().replace('js', 'javascript') as any;
        }

        // Extraire l'ID si présent dans le message complet
        const idMatch = lowerMessage.match(/(?:#|id\s*)(\d+)/i);
        if (idMatch && !result.entities.studentId) {
          result.entities.studentId = parseInt(idMatch[1]);
          if (intent === 'search_student') {
            result.intent = 'get_student_details';
          }
        }

        return result;
      }
    }
  }

  // 2. Si aucun pattern n'a matché, vérifier si c'est un nom direct
  if (looksLikeName(cleanMessage)) {
    result.intent = 'search_student';
    result.confidence = 0.7;
    result.entities.studentName = cleanMessage;
    result.entities.searchTerms = extractSearchTerms(cleanMessage);
    return result;
  }

  // 3. Vérifier si le message contient un ID
  const idMatch = lowerMessage.match(/(?:#|id\s*)(\d+)/i);
  if (idMatch) {
    result.intent = 'get_student_details';
    result.confidence = 0.8;
    result.entities.studentId = parseInt(idMatch[1]);
    return result;
  }

  return result;
}

export function extractStudentName(message: string): string | null {
  const patterns = [
    /(?:étudiant|élève)\s+([a-zàâäéèêëïîôùûüÿç\s-]+)/i,
    /(?:login|utilisateur|user)\s+([a-z0-9_-]+)/i,
    /@([a-z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Si le message entier ressemble à un nom
  if (looksLikeName(message)) {
    return message.trim();
  }

  return null;
}

export function extractStudentId(message: string): number | null {
  const match = message.match(/(?:id|#)\s*(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

// Fonction utilitaire pour normaliser un texte de recherche
export function normalizeSearchQuery(query: string): string {
  return normalizeText(query);
}

// Fonction pour obtenir des variantes de recherche
export function getSearchVariants(name: string): string[] {
  const normalized = normalizeText(name);
  const words = normalized.split(/\s+/).filter(w => w.length >= 2);

  const variants: string[] = [normalized];

  // Ajouter chaque mot individuellement
  words.forEach(word => {
    if (!variants.includes(word)) {
      variants.push(word);
    }
  });

  // Si 2 mots, ajouter aussi l'ordre inversé
  if (words.length === 2) {
    const reversed = `${words[1]} ${words[0]}`;
    if (!variants.includes(reversed)) {
      variants.push(reversed);
    }
  }

  return variants;
}
