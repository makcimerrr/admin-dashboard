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
  /** Note de chaque examen, indexée par son nom (« Exam 01 » → 0.27). */
  examGrades: Record<string, number | null>;
  /** Motif d'alerte, ou null si rien à signaler. */
  risk: string | null;
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

/** Nom affichable d'un candidat : l'identité si connue, sinon le login. */
export function candidateName(c: {
  firstName: string | null;
  lastName: string | null;
  login: string;
}): string {
  const full = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return full || c.login;
}
