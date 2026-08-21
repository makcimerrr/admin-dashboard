import 'server-only';
import { and, asc, desc, eq, notInArray, sql } from 'drizzle-orm';
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
 * Nature d'une épreuve, déduite du CHEMIN de son événement.
 *
 * Les examens sont des sous-événements dédiés — `/rouen/piscine-go/exam-01`,
 * `…/exam-02`, `…/final-exam` — et c'est le chemin qui fait foi. Zone01 met
 * `object.type = 'exercise'` sur tout, se fier au nom ne tiendrait qu'aussi
 * longtemps que personne ne nomme un exercice « examen ».
 */
function kindOfEvent(eventPath: string | null): PiscineResultKind {
  const p = (eventPath ?? '').toLowerCase();
  if (/\/(final-)?exam(-\d+)?$/.test(p)) return 'exam';
  if (/\/(quad|sudoku|quadchecker)$/.test(p)) return 'project';
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
      const counts = await syncSession(s.id, { objectName: s.objectName });
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
  sessionRoot?: { objectName: string | null },
): Promise<{ candidates: number; results: number }> {
  const [participants, children, admissions] = await Promise.all([
    fetchSessionParticipants(sessionId),
    fetchSessionChildEvents(sessionId),
    fetchSessionAdmissions(sessionId),
  ]);

  // Progressions de la session ET de ses sous-événements, en une seule requête.
  const progress = await fetchSessionProgress([sessionId, ...children.map((c) => c.id)]);

  // Chemin ET nom d'objet de chaque événement : le chemin donne la nature de
  // l'épreuve, le nom permet de reconnaître SA note d'ensemble.
  const pathByEvent = new Map<number, string | null>(children.map((c) => [c.id, c.path]));
  const objectNameByEvent = new Map<number, string | null>(
    children.map((c) => [c.id, c.objectName]),
  );

  /**
   * La progression portant le nom de la session elle-même (« Piscine Go ») est
   * l'avancement global, pas un exercice : la compter gonflait le total de
   * chaque candidat et polluait la liste des exercices.
   */
  const sessionObjectName = sessionRoot?.objectName ?? null;

  const admissionByLogin = new Map(admissions.map((a) => [a.userLogin, a.grade]));

  // Dernier enregistrement par (candidat, épreuve) : Zone01 en produit un par
  // tentative, garder le plus récent est la seule lecture juste.
  /**
   * ⚠️ Sous un événement d'examen, Zone01 range DEUX natures de lignes :
   *   - les exercices tentés pendant l'épreuve (`only1`, `printif`… notés 0/1)
   *   - la note de l'examen lui-même (objet « Exam 01 », ex. 0.30)
   *
   * Seule la seconde est une note d'examen. Les moyenner ensemble gonflait la
   * moyenne — 0.85 au lieu de 0.31 pour un candidat — ce qui peut fausser une
   * décision de sélection. Et les tentatives portent les mêmes noms que les
   * exercices du quotidien, donc les stocker les écrasait.
   *
   * Règle : sous un sous-événement, on ne garde que la ligne dont l'objet porte
   * le nom de l'événement. Sur la racine, l'inverse — sa propre ligne est
   * l'avancement global, les autres sont les exercices du quotidien.
   */
  const latest = new Map<string, PiscineProgressRaw>();
  for (const p of progress) {
    if (!p.objectName) continue;

    const isChild = p.eventId != null && objectNameByEvent.has(p.eventId);
    if (isChild) {
      if (p.objectName !== objectNameByEvent.get(p.eventId!)) continue;
    } else if (sessionObjectName && p.objectName === sessionObjectName) {
      continue;
    }
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

    const exams = own.filter(
      (p) => kindOfEvent(pathByEvent.get(p.eventId ?? -1) ?? null) === 'exam' && p.grade !== null,
    );
    const examAverage =
      exams.length > 0 ? exams.reduce((sum, e) => sum + (e.grade ?? 0), 0) / exams.length : null;

    const exercises = own.filter(
      (p) => kindOfEvent(pathByEvent.get(p.eventId ?? -1) ?? null) === 'exercise',
    );

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
        exercisesDone: exercises.filter((p) => p.isDone).length,
        exercisesTried: exercises.length,
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
          exercisesDone: exercises.filter((p) => p.isDone).length,
          exercisesTried: exercises.length,
          examAverage,
          lastActivityAt: lastActivity ? new Date(lastActivity) : null,
          syncedAt: new Date(),
        },
      })
      .returning({ id: piscineCandidates.id });

    /**
     * Le miroir doit REFLÉTER Zone01, pas s'y ajouter : une épreuve qui n'est
     * plus produite (exercice retiré de la piscine, ligne mal classée par une
     * version précédente) doit disparaître. Sans cet élagage, un upsert seul
     * accumule indéfiniment.
     */
    const keptNames = own.map((p) => p.objectName!);
    await db
      .delete(piscineResults)
      .where(
        keptNames.length > 0
          ? and(
              eq(piscineResults.candidateId, candidate.id),
              notInArray(piscineResults.name, keptNames),
            )
          : eq(piscineResults.candidateId, candidate.id),
      );

    if (own.length > 0) {
      await db
        .insert(piscineResults)
        .values(
          own.map((p) => ({
            candidateId: candidate.id,
            name: p.objectName!,
            kind: kindOfEvent(pathByEvent.get(p.eventId ?? -1) ?? null),
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
  /** Note de chaque examen, indexée par son nom (« Exam 01 » → 0.27). */
  examGrades: Record<string, number | null>;
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

/**
 * Examens d'une session, dans l'ordre où ils ont eu lieu.
 *
 * L'ordre vient de l'`event_id` : les sous-événements sont créés dans l'ordre
 * chronologique (Exam 01 = 1023, Exam 02 = 1025, Final Exam = 1029), ce qui
 * donne les colonnes dans le bon sens sans dépendre du nom.
 */
export async function getSessionExams(sessionId: number): Promise<string[]> {
  const rows = await db
    .select({
      name: piscineResults.name,
      firstEvent: sql<number>`min(${piscineResults.eventId})`,
    })
    .from(piscineResults)
    .innerJoin(piscineCandidates, eq(piscineCandidates.id, piscineResults.candidateId))
    .where(
      and(
        eq(piscineCandidates.sessionEventId, sessionId),
        eq(piscineResults.kind, 'exam'),
      ),
    )
    .groupBy(piscineResults.name)
    .orderBy(sql`min(${piscineResults.eventId})`);

  return rows.map((r) => r.name);
}

export async function getSessionCandidates(sessionId: number): Promise<CandidateRow[]> {
  const rows = await db
    .select()
    .from(piscineCandidates)
    .where(eq(piscineCandidates.sessionEventId, sessionId))
    .orderBy(desc(piscineCandidates.examAverage), desc(piscineCandidates.exercisesDone));

  // Notes d'examen de toute la session en une requête : une par candidat
  // ferait autant d'allers-retours qu'il y a de lignes.
  const examRows = await db
    .select({
      candidateId: piscineResults.candidateId,
      name: piscineResults.name,
      grade: piscineResults.grade,
    })
    .from(piscineResults)
    .innerJoin(piscineCandidates, eq(piscineCandidates.id, piscineResults.candidateId))
    .where(
      and(
        eq(piscineCandidates.sessionEventId, sessionId),
        eq(piscineResults.kind, 'exam'),
      ),
    );

  const examsByCandidate = new Map<number, Record<string, number | null>>();
  for (const r of examRows) {
    const entry = examsByCandidate.get(r.candidateId) ?? {};
    entry[r.name] = r.grade;
    examsByCandidate.set(r.candidateId, entry);
  }

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
    examGrades: examsByCandidate.get(c.id) ?? {},
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
    examGrades: Object.fromEntries(
      results.filter((r) => r.kind === 'exam').map((r) => [r.name, r.grade]),
    ),
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
