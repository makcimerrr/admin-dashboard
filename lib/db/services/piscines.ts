import 'server-only';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../config';
import {
  piscineCandidates,
  piscineResults,
  piscineSessions,
  type AdmissionStatus,
  type PiscineResultKind,
  type PiscineSession,
} from '../schema/piscines';
import {
  fetchPiscineSessions,
  fetchSessionAdmissions,
  fetchSessionChildEvents,
  fetchSessionParticipants,
  fetchSessionProgress,
  type PiscineProgressRaw,
} from '@/lib/services/zone01-piscine';

/**
 * Piscines de sélection — synchronisation depuis Zone01 et lecture pour l'UI.
 *
 * Sens unique : Zone01 est la source de vérité, le hub n'écrit jamais chez eux.
 * La synchro est IDEMPOTENTE — la rejouer ne crée pas de doublon et ne perd
 * rien.
 */

// ─── Helpers de classement ───────────────────────────────────────────────────

/** Libellé lisible d'une session : « Juillet 2026 », « Rattrapage mars 2026 ». */
function sessionLabel(path: string, startAt: Date | null): string {
  const isRetry = path.includes('retry');
  if (!startAt) return isRetry ? 'Rattrapage' : path;
  const mois = startAt.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const capitalise = mois.charAt(0).toUpperCase() + mois.slice(1);
  return isRetry ? `Rattrapage ${mois}` : capitalise;
}

/**
 * Nature d'une épreuve, déduite de son nom.
 *
 * Zone01 ne distingue pas les examens des exercices dans `object.type` (tout est
 * `exercise`) : c'est le nom qui porte l'information, et c'est cette distinction
 * qui rend la moyenne d'examens comparable entre candidats.
 */
function resultKind(name: string): PiscineResultKind {
  const n = name.toLowerCase();
  if (n.includes('exam')) return 'exam';
  if (['quad', 'sudoku', 'quadchecker'].some((p) => n.includes(p))) return 'project';
  return 'exercise';
}

// ─── Synchronisation ─────────────────────────────────────────────────────────

export interface PiscineSyncResult {
  sessions: number;
  candidates: number;
  results: number;
  errors: string[];
}

/**
 * Synchronise toutes les sessions de piscine-go (et leurs rattrapages).
 *
 * `onlyOngoing` limite aux sessions en cours ou récemment terminées : le cron
 * quotidien n'a aucune raison de retélécharger des sessions closes depuis un an.
 */
export async function syncPiscines(
  { onlyOngoing = false }: { onlyOngoing?: boolean } = {},
): Promise<PiscineSyncResult> {
  const result: PiscineSyncResult = { sessions: 0, candidates: 0, results: 0, errors: [] };

  const raw = await fetchPiscineSessions();
  const now = Date.now();

  for (const s of raw) {
    const startAt = s.startAt ? new Date(s.startAt) : null;
    const endAt = s.endAt ? new Date(s.endAt) : null;

    // Une session close depuis plus de 30 jours n'évolue plus.
    if (onlyOngoing && endAt && now - endAt.getTime() > 30 * 86_400_000) continue;

    await db
      .insert(piscineSessions)
      .values({
        eventId: s.id,
        path: s.path ?? '',
        label: sessionLabel(s.path ?? '', startAt),
        startAt,
        endAt,
        isRetry: (s.path ?? '').includes('retry'),
      })
      .onConflictDoUpdate({
        target: piscineSessions.eventId,
        set: {
          path: s.path ?? '',
          label: sessionLabel(s.path ?? '', startAt),
          startAt,
          endAt,
          isRetry: (s.path ?? '').includes('retry'),
        },
      });

    try {
      const counts = await syncSession(s.id);
      result.sessions++;
      result.candidates += counts.candidates;
      result.results += counts.results;
    } catch (e) {
      // Une session en échec ne doit pas emporter les autres.
      result.errors.push(`session #${s.id} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}

/** Synchronise UNE session : roster, progressions, examens, admissions. */
export async function syncSession(
  sessionId: number,
): Promise<{ candidates: number; results: number }> {
  const [participants, children, admissions] = await Promise.all([
    fetchSessionParticipants(sessionId),
    fetchSessionChildEvents(sessionId),
    fetchSessionAdmissions(sessionId),
  ]);

  // Progressions de la session ET de ses sous-événements, en une seule requête.
  const progress = await fetchSessionProgress([sessionId, ...children.map((c) => c.id)]);

  const admissionByLogin = new Map(admissions.map((a) => [a.userLogin, a.grade]));

  // Dernier enregistrement par (candidat, épreuve) : Zone01 en produit un par
  // tentative, garder le plus récent est la seule lecture juste.
  const latest = new Map<string, PiscineProgressRaw>();
  for (const p of progress) {
    if (!p.objectName) continue;
    const key = `${p.userLogin}|${p.objectName}`;
    const prev = latest.get(key);
    if (!prev || (p.updatedAt ?? '') >= (prev.updatedAt ?? '')) latest.set(key, p);
  }

  const byLogin = new Map<string, PiscineProgressRaw[]>();
  for (const p of latest.values()) {
    const list = byLogin.get(p.userLogin) ?? [];
    list.push(p);
    byLogin.set(p.userLogin, list);
  }

  // Le roster fait foi, mais on n'oublie pas quelqu'un qui aurait une
  // progression sans figurer dans `event_user`.
  const logins = new Set([...participants.map((p) => p.userLogin), ...byLogin.keys()]);
  const participantByLogin = new Map(participants.map((p) => [p.userLogin, p]));

  let resultsWritten = 0;

  for (const login of logins) {
    const info = participantByLogin.get(login);
    const own = byLogin.get(login) ?? [];

    const exams = own.filter((p) => resultKind(p.objectName!) === 'exam' && p.grade !== null);
    const examAverage =
      exams.length > 0 ? exams.reduce((sum, e) => sum + (e.grade ?? 0), 0) / exams.length : null;

    const lastActivity = own.reduce<string | null>(
      (max, p) => (p.updatedAt && (!max || p.updatedAt > max) ? p.updatedAt : max),
      null,
    );

    const admissionGrade = admissionByLogin.get(login);
    const admission: AdmissionStatus =
      admissionGrade === undefined ? 'en_cours' : admissionGrade === 1 ? 'admis' : 'refuse';

    const [candidate] = await db
      .insert(piscineCandidates)
      .values({
        sessionEventId: sessionId,
        login,
        firstName: info?.firstName ?? null,
        lastName: info?.lastName ?? null,
        email: info?.email ?? null,
        level: info?.level ?? null,
        admission,
        exercisesDone: own.filter((p) => p.isDone).length,
        exercisesTried: own.length,
        examAverage,
        lastActivityAt: lastActivity ? new Date(lastActivity) : null,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [piscineCandidates.sessionEventId, piscineCandidates.login],
        set: {
          firstName: info?.firstName ?? null,
          lastName: info?.lastName ?? null,
          email: info?.email ?? null,
          level: info?.level ?? null,
          admission,
          exercisesDone: own.filter((p) => p.isDone).length,
          exercisesTried: own.length,
          examAverage,
          lastActivityAt: lastActivity ? new Date(lastActivity) : null,
          syncedAt: new Date(),
        },
      })
      .returning({ id: piscineCandidates.id });

    if (own.length > 0) {
      await db
        .insert(piscineResults)
        .values(
          own.map((p) => ({
            candidateId: candidate.id,
            name: p.objectName!,
            kind: resultKind(p.objectName!),
            grade: p.grade,
            isDone: p.isDone,
            eventId: p.eventId,
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : null,
          })),
        )
        .onConflictDoUpdate({
          target: [piscineResults.candidateId, piscineResults.name],
          set: {
            grade: sql`excluded.grade`,
            isDone: sql`excluded.is_done`,
            eventId: sql`excluded.event_id`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
      resultsWritten += own.length;
    }
  }

  const admitted = [...logins].filter((l) => admissionByLogin.get(l) === 1).length;
  await db
    .update(piscineSessions)
    .set({ candidatesCount: logins.size, admittedCount: admitted, syncedAt: new Date() })
    .where(eq(piscineSessions.eventId, sessionId));

  return { candidates: logins.size, results: resultsWritten };
}

// ─── Lecture ─────────────────────────────────────────────────────────────────

export async function listPiscineSessions(): Promise<PiscineSession[]> {
  return db.select().from(piscineSessions).orderBy(desc(piscineSessions.startAt));
}

export interface CandidateRow {
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
  /** Motif d'alerte, ou null si rien à signaler. */
  risk: string | null;
}

/**
 * Repérage des candidats en difficulté.
 *
 * Un candidat inscrit qui n'a rien produit est le cas le plus critique — et
 * c'est précisément celui qu'un classement par note ne fait jamais remonter,
 * puisqu'il n'a pas de note.
 */
function riskOf(c: {
  level: number | null;
  exercisesDone: number;
  examAverage: number | null;
  admission: AdmissionStatus;
  lastActivityAt: Date | null;
}): string | null {
  if (c.admission !== 'en_cours') return null;
  if (c.exercisesDone === 0) return "Aucun exercice validé";
  if ((c.level ?? 0) === 0) return 'Niveau 0';
  if (c.examAverage !== null && c.examAverage < 0.3) return 'Moyenne d’examens faible';
  if (c.lastActivityAt && Date.now() - c.lastActivityAt.getTime() > 3 * 86_400_000) {
    return 'Inactif depuis 3 jours';
  }
  return null;
}

export async function getSessionCandidates(sessionId: number): Promise<CandidateRow[]> {
  const rows = await db
    .select()
    .from(piscineCandidates)
    .where(eq(piscineCandidates.sessionEventId, sessionId))
    .orderBy(desc(piscineCandidates.examAverage), desc(piscineCandidates.exercisesDone));

  return rows.map((c) => ({
    id: c.id,
    login: c.login,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    level: c.level,
    admission: c.admission as AdmissionStatus,
    exercisesDone: c.exercisesDone,
    exercisesTried: c.exercisesTried,
    examAverage: c.examAverage,
    lastActivityAt: c.lastActivityAt?.toISOString() ?? null,
    risk: riskOf({
      level: c.level,
      exercisesDone: c.exercisesDone,
      examAverage: c.examAverage,
      admission: c.admission as AdmissionStatus,
      lastActivityAt: c.lastActivityAt,
    }),
  }));
}

export interface SessionStats {
  candidates: number;
  admitted: number;
  refused: number;
  pending: number;
  atRisk: number;
  averageExam: number | null;
}

export async function getSessionStats(sessionId: number): Promise<SessionStats> {
  const candidates = await getSessionCandidates(sessionId);
  const withExam = candidates.filter((c) => c.examAverage !== null);

  return {
    candidates: candidates.length,
    admitted: candidates.filter((c) => c.admission === 'admis').length,
    refused: candidates.filter((c) => c.admission === 'refuse').length,
    pending: candidates.filter((c) => c.admission === 'en_cours').length,
    atRisk: candidates.filter((c) => c.risk !== null).length,
    averageExam:
      withExam.length > 0
        ? withExam.reduce((s, c) => s + (c.examAverage ?? 0), 0) / withExam.length
        : null,
  };
}

export interface CandidateDetail extends CandidateRow {
  results: {
    name: string;
    kind: PiscineResultKind;
    grade: number | null;
    isDone: boolean;
    updatedAt: string | null;
  }[];
}

export async function getCandidateDetail(candidateId: number): Promise<CandidateDetail | null> {
  const [row] = await db
    .select()
    .from(piscineCandidates)
    .where(eq(piscineCandidates.id, candidateId))
    .limit(1);
  if (!row) return null;

  const results = await db
    .select()
    .from(piscineResults)
    .where(eq(piscineResults.candidateId, candidateId))
    .orderBy(asc(piscineResults.updatedAt));

  return {
    id: row.id,
    login: row.login,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    level: row.level,
    admission: row.admission as AdmissionStatus,
    exercisesDone: row.exercisesDone,
    exercisesTried: row.exercisesTried,
    examAverage: row.examAverage,
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    risk: riskOf({
      level: row.level,
      exercisesDone: row.exercisesDone,
      examAverage: row.examAverage,
      admission: row.admission as AdmissionStatus,
      lastActivityAt: row.lastActivityAt,
    }),
    results: results.map((r) => ({
      name: r.name,
      kind: r.kind as PiscineResultKind,
      grade: r.grade,
      isDone: r.isDone,
      updatedAt: r.updatedAt?.toISOString() ?? null,
    })),
  };
}
