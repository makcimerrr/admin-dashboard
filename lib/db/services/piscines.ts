import 'server-only';
import { and, asc, desc, eq, notInArray, sql } from 'drizzle-orm';
import { db } from '../config';
import {
  piscineCandidateComments,
  piscineCandidates,
  piscineProjectReviews,
  piscineResults,
  piscineSessions,
  REVIEWED_PROJECTS,
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
/**
 * Barème de chaque examen, par suffixe de chemin.
 *
 * Les `grade` renvoyés par Zone01 pour un examen se sont révélés
 * inexploitables (valeurs supérieures à 1, sans rapport lisible avec la
 * performance). La note retenue est donc le NOMBRE D'EXERCICES RÉUSSIS pendant
 * l'épreuve, rapporté à ce barème.
 *
 * Si une piscine change de format, c'est ici qu'on ajuste.
 */
const EXAM_MAX_SCORE: { suffix: string; max: number }[] = [
  { suffix: 'exam-01', max: 5 },
  { suffix: 'exam-02', max: 7 },
  { suffix: 'exam-03', max: 9 },
  { suffix: 'final-exam', max: 10 },
];

/**
 * Grille de lecture standard d'une piscine-go : les mêmes colonnes d'une
 * session à l'autre.
 *
 * Une session de rattrapage ne tient parfois qu'une seule épreuve (août 2026
 * n'a qu'un « Exam 02 ») : n'afficher que ce qu'elle contient donnait un
 * tableau différent à chaque session, impossible à lire en diagonale.
 * L'absence d'une épreuve devient une information affichée, pas une colonne
 * manquante.
 */
export const STANDARD_EXAMS: { name: string; maxScore: number }[] = [
  { name: 'Exam 01', maxScore: 5 },
  { name: 'Exam 02', maxScore: 7 },
  { name: 'Exam 03', maxScore: 9 },
  { name: 'Final Exam', maxScore: 10 },
];

export const STANDARD_PROJECTS = ['quad', 'sudoku', 'quadchecker'] as const;

function examMaxScore(eventPath: string | null): number | null {
  const p = (eventPath ?? '').toLowerCase();
  return EXAM_MAX_SCORE.find((e) => p.endsWith(e.suffix))?.max ?? null;
}

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
  { onlyOngoing = false, sessionId }: { onlyOngoing?: boolean; sessionId?: number } = {},
): Promise<PiscineSyncResult> {
  const result: PiscineSyncResult = { sessions: 0, candidates: 0, results: 0, errors: [] };

  const raw = await fetchPiscineSessions();
  const now = Date.now();

  for (const s of raw) {
    // Reprise ciblée : une session à la fois, pour des requêtes courtes.
    if (sessionId !== undefined && s.id !== sessionId) continue;

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
  /**
   * Tentatives faites PENDANT un examen, par (candidat, examen, exercice) :
   * c'est leur décompte qui donne la note, le `grade` de l'examen n'étant pas
   * exploitable. On ne garde que la dernière tentative de chaque exercice —
   * un exercice repassé jusqu'à réussite compte pour un succès.
   */
  const examAttempts = new Map<string, PiscineProgressRaw>();

  for (const p of progress) {
    if (!p.objectName) continue;

    const isChild = p.eventId != null && objectNameByEvent.has(p.eventId);
    if (isChild) {
      if (p.objectName !== objectNameByEvent.get(p.eventId!)) {
        if (kindOfEvent(pathByEvent.get(p.eventId!) ?? null) === 'exam') {
          const k = `${p.userLogin}|${p.eventId}|${p.objectName}`;
          const prev = examAttempts.get(k);
          if (!prev || (p.updatedAt ?? '') >= (prev.updatedAt ?? '')) examAttempts.set(k, p);
        }
        continue;
      }
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

  /**
   * Barème complet de la session : somme des barèmes de ses examens, comptés
   * une seule fois PAR NOM.
   *
   * Certaines sessions rejouent une épreuve (Février 2026 a deux « Exam 02» et
   * deux « Exam 03 », sur des événements distincts). Les additionner portait le
   * barème à 47 au lieu de 31 et écrasait le pourcentage de tous les candidats
   * de la session — 18 % contre 30 % ailleurs, sans que personne n'ait moins
   * bien réussi. Un examen rejoué reste le même examen.
   */
  const scaleByExamName = new Map<string, number>();
  for (const c of children) {
    if (kindOfEvent(c.path) !== 'exam') continue;
    const max = examMaxScore(c.path);
    if (max === null || !c.objectName) continue;
    scaleByExamName.set(c.objectName, max);
  }
  const sessionExamScale = [...scaleByExamName.values()].reduce((a, b) => a + b, 0);

  /** (login|eventId) → exercices réussis pendant cet examen. */
  const passedByExam = new Map<string, number>();
  for (const a of examAttempts.values()) {
    if ((a.grade ?? 0) <= 0) continue;
    const k = `${a.userLogin}|${a.eventId}`;
    passedByExam.set(k, (passedByExam.get(k) ?? 0) + 1);
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
      (p) => kindOfEvent(pathByEvent.get(p.eventId ?? -1) ?? null) === 'exam',
    );

    /**
     * Moyenne ABSOLUE : le dénominateur est le barème COMPLET de la session
     * (5 + 7 + 9 + 10 = 31), pas seulement celui des épreuves passées.
     *
     * Sans ça, quelqu'un qui abandonne après deux examens affichait 6/12 —
     * 50 %, soit mieux qu'un candidat allé au bout à 15/31. Rapporter tout le
     * monde au même barème est la seule façon de les comparer.
     *
     * `null` si le candidat n'a passé aucun examen : ce n'est pas un zéro,
     * c'est une absence.
     *
     * Quand une épreuve a été rejouée, c'est la DERNIÈRE tentative qui compte
     * (cf. la déduplication par nom plus haut) : c'est le dernier mot de la
     * plateforme sur cette épreuve.
     */
    const examPassed = exams.reduce(
      (sum, e) => sum + (passedByExam.get(`${login}|${e.eventId}`) ?? 0),
      0,
    );
    // Ne pas s'être présenté vaut zéro, pas « non renseigné » : le barème de
    // la session s'applique à tout le monde, sinon deux candidats ne se
    // comparent pas. Le détail par épreuve, lui, distingue « non inscrit »
    // d'un vrai échec.
    const examTotal = sessionExamScale;
    const examAverage = examTotal > 0 ? examPassed / examTotal : null;

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
        examPassed: examTotal > 0 ? examPassed : null,
        examTotal: examTotal > 0 ? examTotal : null,
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
          examPassed: examTotal > 0 ? examPassed : null,
          examTotal: examTotal > 0 ? examTotal : null,
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
          own.map((p) => {
            const path = pathByEvent.get(p.eventId ?? -1) ?? null;
            const kind = kindOfEvent(path);
            const max = kind === 'exam' ? examMaxScore(path) : null;
            return {
              candidateId: candidate.id,
              name: p.objectName!,
              kind,
              grade: p.grade,
              score: max !== null ? (passedByExam.get(`${login}|${p.eventId}`) ?? 0) : null,
              maxScore: max,
              isDone: p.isDone,
              eventId: p.eventId,
              updatedAt: p.updatedAt ? new Date(p.updatedAt) : null,
            };
          }),
        )
        .onConflictDoUpdate({
          target: [piscineResults.candidateId, piscineResults.name],
          set: {
            grade: sql`excluded.grade`,
            score: sql`excluded.score`,
            maxScore: sql`excluded.max_score`,
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
  /** Note de chaque examen : réussis / barème (« Exam 01 » → 2/5). */
  examScores: Record<string, { passed: number; max: number }>;
  /**
   * Projets : réussi / échoué. Un projet ABSENT de cette table n'a pas été
   * tenté — ce n'est pas un échec, et la nuance se voit dans le tableau.
   */
  projectResults: Record<string, 'reussi' | 'echoue'>;
  /** Cumul sur l'ensemble des examens passés. */
  examPassed: number | null;
  examTotal: number | null;
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
 * Examens à afficher pour une session : la grille STANDARD, complétée par
 * d'éventuelles épreuves propres à la session.
 *
 * Une session de rattrapage ne tient parfois qu'une épreuve (août 2026 n'a
 * qu'un « Exam 02 ») : n'afficher que ce qu'elle contient donnait un tableau
 * différent à chaque session, illisible en diagonale. L'absence d'une épreuve
 * devient une information affichée, pas une colonne manquante.
 */
export async function getSessionExams(
  sessionId: number,
): Promise<{ name: string; maxScore: number }[]> {
  const rows = await db
    .select({
      name: piscineResults.name,
      maxScore: sql<number>`max(${piscineResults.maxScore})`,
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

  const extras = rows
    .filter((r) => r.maxScore !== null && !STANDARD_EXAMS.some((e) => e.name === r.name))
    .map((r) => ({ name: r.name, maxScore: Number(r.maxScore) }));

  return [...STANDARD_EXAMS, ...extras];
}

/** Projets à afficher : la grille standard, plus d'éventuels ajouts. */
export async function getSessionProjects(sessionId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: piscineResults.name })
    .from(piscineResults)
    .innerJoin(piscineCandidates, eq(piscineCandidates.id, piscineResults.candidateId))
    .where(
      and(
        eq(piscineCandidates.sessionEventId, sessionId),
        eq(piscineResults.kind, 'project'),
      ),
    );

  const extras = rows
    .map((r) => r.name)
    .filter((n) => !(STANDARD_PROJECTS as readonly string[]).includes(n));

  return [...STANDARD_PROJECTS, ...extras];
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
      score: piscineResults.score,
      maxScore: piscineResults.maxScore,
    })
    .from(piscineResults)
    .innerJoin(piscineCandidates, eq(piscineCandidates.id, piscineResults.candidateId))
    .where(
      and(
        eq(piscineCandidates.sessionEventId, sessionId),
        eq(piscineResults.kind, 'exam'),
      ),
    );

  const examsByCandidate = new Map<number, Record<string, { passed: number; max: number }>>();
  for (const r of examRows) {
    if (r.maxScore === null) continue;
    const entry = examsByCandidate.get(r.candidateId) ?? {};
    entry[r.name] = { passed: r.score ?? 0, max: r.maxScore };
    examsByCandidate.set(r.candidateId, entry);
  }

  const projectRows = await db
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
        eq(piscineResults.kind, 'project'),
      ),
    );

  const projectsByCandidate = new Map<number, Record<string, 'reussi' | 'echoue'>>();
  for (const r of projectRows) {
    const entry = projectsByCandidate.get(r.candidateId) ?? {};
    entry[r.name] = (r.grade ?? 0) > 0 ? 'reussi' : 'echoue';
    projectsByCandidate.set(r.candidateId, entry);
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
    examScores: examsByCandidate.get(c.id) ?? {},
    projectResults: projectsByCandidate.get(c.id) ?? {},
    examPassed: c.examPassed,
    examTotal: c.examTotal,
    risk: riskOf({
      level: c.level,
      exercisesDone: c.exercisesDone,
      examAverage: c.examAverage,
      admission: c.admission as AdmissionStatus,
      lastActivityAt: c.lastActivityAt,
    }),
  }));
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

/**
 * Recherche d'un candidat dans TOUTES les sessions, insensible à l'ordre des
 * mots : « Maxime Dubois » et « Dubois Maxime » trouvent la même personne.
 *
 * Le filtrage par mot se fait en SQL (chaque mot doit apparaître dans le nom,
 * le login ou l'email), pour ne pas rapatrier 1275 candidats à chaque frappe.
 */
export async function searchCandidates(query: string): Promise<CandidateMatch[]> {
  const words = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) return [];

  // `translate` plutôt que l'extension `unaccent` : elle n'est pas installée
  // sur cette base, et une recherche ne justifie pas d'en dépendre.
  const haystack = sql`lower(translate(
    coalesce(${piscineCandidates.firstName}, '') || ' ' ||
    coalesce(${piscineCandidates.lastName}, '') || ' ' ||
    ${piscineCandidates.login} || ' ' ||
    coalesce(${piscineCandidates.email}, ''),
    'àâäãáéèêëíìîïóòôöõúùûüçñÀÂÄÃÁÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  ))`;

  const rows = await db
    .select({
      id: piscineCandidates.id,
      login: piscineCandidates.login,
      firstName: piscineCandidates.firstName,
      lastName: piscineCandidates.lastName,
      sessionEventId: piscineCandidates.sessionEventId,
      sessionLabel: piscineSessions.label,
      admission: piscineCandidates.admission,
      startAt: piscineSessions.startAt,
    })
    .from(piscineCandidates)
    .innerJoin(piscineSessions, eq(piscineSessions.eventId, piscineCandidates.sessionEventId))
    .where(and(...words.map((w) => sql`${haystack} LIKE ${'%' + w + '%'}`)))
    .orderBy(desc(piscineSessions.startAt))
    .limit(20);

  return rows.map((r) => ({
    id: r.id,
    login: r.login,
    firstName: r.firstName,
    lastName: r.lastName,
    sessionEventId: r.sessionEventId,
    sessionLabel: r.sessionLabel,
    admission: r.admission as AdmissionStatus,
  }));
}

export interface SessionStats {
  candidates: number;
  admitted: number;
  refused: number;
  pending: number;
  atRisk: number;
  /** Moyenne absolue de la session : réussis cumulés / barèmes cumulés. */
  averageExam: number | null;
}

export async function getSessionStats(sessionId: number): Promise<SessionStats> {
  const candidates = await getSessionCandidates(sessionId);

  // Moyenne de session ABSOLUE : on cumule réussis et barèmes de tout le monde,
  // au lieu de moyenner des moyennes individuelles.
  let passed = 0;
  let total = 0;
  for (const c of candidates) {
    passed += c.examPassed ?? 0;
    total += c.examTotal ?? 0;
  }

  return {
    candidates: candidates.length,
    admitted: candidates.filter((c) => c.admission === 'admis').length,
    refused: candidates.filter((c) => c.admission === 'refuse').length,
    pending: candidates.filter((c) => c.admission === 'en_cours').length,
    atRisk: candidates.filter((c) => c.risk !== null).length,
    averageExam: total > 0 ? passed / total : null,
  };
}

// ─── Saisie humaine : commentaire et comptes rendus ──────────────────────────

export interface ProjectReview {
  project: string;
  slot: number;
  content: string;
  author: string;
  updatedAt: string;
}

/**
 * Enregistre (ou efface) un compte rendu de projet.
 *
 * Un contenu vide SUPPRIME la ligne : sans ça, effacer un texte laisserait un
 * compte rendu vide qui compterait comme rempli.
 */
export async function saveProjectReview(
  candidateId: number,
  project: string,
  slot: number,
  content: string,
  author: string,
): Promise<void> {
  if (!(REVIEWED_PROJECTS as readonly string[]).includes(project)) {
    throw new Error(`Projet inconnu : ${project}`);
  }
  if (slot < 1 || slot > 3) throw new Error('Le compte rendu doit être 1, 2 ou 3');

  if (!content.trim()) {
    await db
      .delete(piscineProjectReviews)
      .where(
        and(
          eq(piscineProjectReviews.candidateId, candidateId),
          eq(piscineProjectReviews.project, project),
          eq(piscineProjectReviews.slot, slot),
        ),
      );
    return;
  }

  await db
    .insert(piscineProjectReviews)
    .values({ candidateId, project, slot, content: content.trim(), author })
    .onConflictDoUpdate({
      target: [
        piscineProjectReviews.candidateId,
        piscineProjectReviews.project,
        piscineProjectReviews.slot,
      ],
      set: { content: content.trim(), author, updatedAt: new Date() },
    });
}

/** Commentaire libre sur un candidat ; vide = suppression. */
export async function saveCandidateComment(
  candidateId: number,
  comment: string,
  author: string,
): Promise<void> {
  if (!comment.trim()) {
    await db
      .delete(piscineCandidateComments)
      .where(eq(piscineCandidateComments.candidateId, candidateId));
    return;
  }
  await db
    .insert(piscineCandidateComments)
    .values({ candidateId, comment: comment.trim(), author })
    .onConflictDoUpdate({
      target: piscineCandidateComments.candidateId,
      set: { comment: comment.trim(), author, updatedAt: new Date() },
    });
}

export interface CandidateDetail extends CandidateRow {
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
  /** Saisie humaine, jamais écrasée par la synchro. */
  comment: { content: string; author: string; updatedAt: string } | null;
  reviews: ProjectReview[];
}

export async function getCandidateDetail(candidateId: number): Promise<CandidateDetail | null> {
  const [row] = await db
    .select()
    .from(piscineCandidates)
    .where(eq(piscineCandidates.id, candidateId))
    .limit(1);
  if (!row) return null;

  const [results, comment, reviews] = await Promise.all([
    db
      .select()
      .from(piscineResults)
      .where(eq(piscineResults.candidateId, candidateId))
      .orderBy(asc(piscineResults.updatedAt)),
    db
      .select()
      .from(piscineCandidateComments)
      .where(eq(piscineCandidateComments.candidateId, candidateId))
      .limit(1),
    db
      .select()
      .from(piscineProjectReviews)
      .where(eq(piscineProjectReviews.candidateId, candidateId))
      .orderBy(asc(piscineProjectReviews.project), asc(piscineProjectReviews.slot)),
  ]);

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
    examScores: Object.fromEntries(
      results
        .filter((r) => r.kind === 'exam' && r.maxScore !== null)
        .map((r) => [r.name, { passed: r.score ?? 0, max: r.maxScore! }]),
    ),
    projectResults: Object.fromEntries(
      results
        .filter((r) => r.kind === 'project')
        .map((r) => [r.name, (r.grade ?? 0) > 0 ? 'reussi' : 'echoue'] as [
          string,
          'reussi' | 'echoue',
        ]),
    ),
    examPassed: row.examPassed,
    examTotal: row.examTotal,
    risk: riskOf({
      level: row.level,
      exercisesDone: row.exercisesDone,
      examAverage: row.examAverage,
      admission: row.admission as AdmissionStatus,
      lastActivityAt: row.lastActivityAt,
    }),
    comment: comment[0]
      ? {
          content: comment[0].comment,
          author: comment[0].author,
          updatedAt: comment[0].updatedAt.toISOString(),
        }
      : null,
    reviews: reviews.map((r) => ({
      project: r.project,
      slot: r.slot,
      content: r.content,
      author: r.author,
      updatedAt: r.updatedAt.toISOString(),
    })),
    results: results.map((r) => ({
      name: r.name,
      kind: r.kind as PiscineResultKind,
      grade: r.grade,
      score: r.score,
      maxScore: r.maxScore,
      isDone: r.isDone,
      updatedAt: r.updatedAt?.toISOString() ?? null,
    })),
  };
}
