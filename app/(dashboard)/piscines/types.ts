// Types partagés du module « Piscines de sélection ».

export interface PiscineSession {
  eventId: number;
  path: string;
  label: string;
  startAt: string | null;
  endAt: string | null;
  isRetry: boolean;
  candidatesCount: number;
  admittedCount: number;
  syncedAt: string | null;
}

export type AdmissionStatus = 'admis' | 'refuse' | 'en_cours';

export const ADMISSION_LABELS: Record<AdmissionStatus, string> = {
  admis: 'Admis',
  refuse: 'Refusé',
  en_cours: 'En cours',
};

/** Tons de `PILL` (lib/status-pills) par décision. */
export const ADMISSION_TONE: Record<AdmissionStatus, 'emerald' | 'rose' | 'blue'> = {
  admis: 'emerald',
  refuse: 'rose',
  en_cours: 'blue',
};

export interface PiscineCandidate {
  id: number;
  login: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  level: number | null;
  admission: AdmissionStatus;
  exercisesDone: number;
  exercisesTried: number;
  examAverage: number | null;
  lastActivityAt: string | null;
  /** Note de chaque examen : exercices réussis / barème (« Exam 01 » → 2/5). */
  examScores: Record<string, { passed: number; max: number }>;
  /** Cumul sur l'ensemble des examens passés. */
  examPassed: number | null;
  examTotal: number | null;
  /** Motif d'alerte, ou null si rien à signaler. */
  risk: string | null;
}

export interface CandidateMatch {
  id: number;
  login: string;
  firstName: string | null;
  lastName: string | null;
  sessionEventId: number;
  sessionLabel: string;
  admission: AdmissionStatus;
}

export interface PiscineStats {
  candidates: number;
  admitted: number;
  refused: number;
  pending: number;
  atRisk: number;
  averageExam: number | null;
}

export type PiscineResultKind = 'exercise' | 'exam' | 'project';

export const RESULT_KIND_LABELS: Record<PiscineResultKind, string> = {
  exercise: 'Exercice',
  exam: 'Examen',
  project: 'Projet',
};

export interface CandidateDetail extends PiscineCandidate {
  results: {
    name: string;
    kind: PiscineResultKind;
    grade: number | null;
    /** Examens : exercices réussis et barème. */
    score: number | null;
    maxScore: number | null;
    isDone: boolean;
    updatedAt: string | null;
  }[];
}

/** Enveloppe standard des routes /api (lib/api/response.ts). */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

/**
 * Normalise pour la recherche : minuscules, sans accents, ponctuation réduite
 * à des espaces. « Dubois » et « DUBOIS » se rejoignent, « Le Guen » aussi.
 */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Vrai si TOUS les mots de la requête apparaissent dans le texte, quel que soit
 * leur ordre.
 *
 * « Maxime Dubois » et « Dubois Maxime » doivent tous deux trouver la personne :
 * une simple sous-chaîne ne marche que dans le sens où le nom est stocké.
 */
export function matchesAllWords(haystack: string, query: string): boolean {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const target = normalizeSearch(haystack);
  return words.every((w) => target.includes(w));
}

/** Nom affichable d'un candidat : l'identité si connue, sinon le login. */
export function candidateName(c: {
  firstName: string | null;
  lastName: string | null;
  login: string;
}): string {
  const full = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return full || c.login;
}
