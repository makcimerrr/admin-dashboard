import 'server-only';
import postgres from 'postgres';
import { db } from '../config';
import { students } from '../schema/students';
import { alternantContracts } from '../schema/alternants';
import { reconcileMilestones } from './followUps';
import { sql, eq, inArray } from 'drizzle-orm';

/**
 * Synchronise les statuts des apprenants (archivé + alternant) depuis émargement.
 *
 * SENS UNIQUE : émargement est la source de vérité RH et n'est JAMAIS modifié
 * (lecture seule). Seule la table `students` du hub est écrite — émargement
 * ÉCRASE les saisies manuelles du hub.
 *
 * Source = base émargement (table `users`), lue directement via
 * `EMARGEMENT_DATABASE_URL` (réseau Docker partagé) car l'API HTTP d'émargement
 * exige une session admin Authentik (non appelable en backend).
 *
 * ⚠️ Le `nickname` d'émargement n'est PAS fiable comme login Zone01 (ex.
 * `rlevasse` y est stocké « Levasseur »). On résout donc chaque utilisateur
 * émargement vers un login du hub par : (1) nickname == login, sinon (2) nom
 * complet == « prénom nom » du hub (normalisé, sans accents). Les non-résolus
 * sont comptés et ignorés (jamais d'écriture hasardeuse).
 *
 * Règles (autoritatif) :
 *  - `archived`    = `users.archived` (double sens : archive ET désarchive).
 *  - `isAlternant` = contrat présent (`contract_type` ∈ {apprentissage,
 *                    professionnalisation}). Marque ET démarque.
 *  - Alternant     → `alternantStartDate/EndDate` repris des dates de contrat
 *                    (en TEXTE 'YYYY-MM-DD' → pas de décalage de fuseau).
 *  - Non-alternant → efface les champs alternant du hub (dates + entreprise /
 *                    contact / email / téléphone / notes).
 */

const ALTERNANT_CONTRACTS = ['apprentissage', 'professionnalisation'];

export interface EmargementSyncResult {
  dry: boolean;
  archivedInEmargement: number;
  alternantsInEmargement: number;
  studentsArchived: number;
  studentsAlternant: number;
  /** Contrats structurés (type + dates + tuteur) synchronisés depuis émargement. */
  contractsSynced: number;
  /** Documents 'contrat' (CERFA) rattachés au contrat synchronisé. */
  documentsLinked: number;
  /** Utilisateurs émargement (archivé/alternant) non rattachés à un login hub. */
  unresolved: number;
}

interface EmgUserRow {
  nickname: string | null;
  name: string | null;
  archived: boolean | null;
  contract_type: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  tutor_1_first_name: string | null;
  tutor_1_last_name: string | null;
  tutor_1_phone_number: string | null;
}

interface AlternantInfo {
  start: string | null;
  end: string | null;
  contractType: string;
  tutorName: string | null;
  tutorPhone: string | null;
}

/** Normalise pour le rapprochement : minuscules, sans accents, espaces compactés. */
function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export async function syncEmargementStatuses(
  { dry = false }: { dry?: boolean } = {},
): Promise<EmargementSyncResult> {
  const emgUrl = process.env.EMARGEMENT_DATABASE_URL;
  if (!emgUrl) throw new Error('EMARGEMENT_DATABASE_URL non configuré');

  // 1) Charger les apprenants du hub pour le rapprochement (login + nom + id).
  const hubStudents = await db
    .select({
      id: students.id,
      login: students.login,
      firstName: students.first_name,
      lastName: students.last_name,
      companyName: students.companyName,
    })
    .from(students);

  const loginSet = new Set(hubStudents.map((s) => s.login.toLowerCase()));
  const studentIdByLogin = new Map<string, number>();
  // Entreprise saisie à la main (durable sur students.company_name) → réappliquée
  // aux contrats synchronisés pour ne pas être écrasée par la synchro.
  const companyByLogin = new Map<string, string>();
  const loginByName = new Map<string, string>();
  for (const s of hubStudents) {
    const login = s.login.toLowerCase();
    studentIdByLogin.set(login, s.id);
    if (s.companyName && s.companyName.trim()) companyByLogin.set(login, s.companyName.trim());
    const fwd = norm(`${s.firstName} ${s.lastName}`);
    const rev = norm(`${s.lastName} ${s.firstName}`);
    if (fwd && !loginByName.has(fwd)) loginByName.set(fwd, login);
    if (rev && !loginByName.has(rev)) loginByName.set(rev, login);
  }

  /** Résout un utilisateur émargement vers un login hub, ou null. */
  const resolve = (u: EmgUserRow): string | null => {
    const nick = norm(u.nickname);
    if (nick && loginSet.has(nick)) return nick;
    const byName = loginByName.get(norm(u.name));
    return byName ?? null;
  };

  // 2) LECTURE SEULE émargement (jamais d'écriture ici). Dates en TEXTE.
  const emg = postgres(emgUrl, { ssl: false, max: 1 });
  let rows: EmgUserRow[] = [];
  try {
    rows = await emg<EmgUserRow[]>`
      SELECT u.nickname,
             u.name,
             u.archived,
             u.contract_type,
             u.contract_start_date::text AS contract_start_date,
             u.contract_end_date::text   AS contract_end_date,
             cd.tutor_1_first_name,
             cd.tutor_1_last_name,
             cd.tutor_1_phone_number
      FROM users u
      LEFT JOIN candidate_data cd ON cd.user_id = u.id
    `;
  } finally {
    await emg.end({ timeout: 5 }).catch(() => {});
  }

  // 3) Rapprochement → ensembles de logins hub.
  const archivedLogins = new Set<string>();
  const alternantMap = new Map<string, AlternantInfo>();
  let unresolved = 0;

  for (const u of rows) {
    const isArchived = !!u.archived;
    const isAlternant =
      !!u.contract_type &&
      ALTERNANT_CONTRACTS.includes(u.contract_type.trim().toLowerCase());
    if (!isArchived && !isAlternant) continue;

    const login = resolve(u);
    if (!login) {
      unresolved++;
      continue;
    }
    if (isArchived) archivedLogins.add(login);
    if (isAlternant) {
      const tutorName =
        [u.tutor_1_first_name, u.tutor_1_last_name].filter(Boolean).join(' ').trim() || null;
      alternantMap.set(login, {
        start: u.contract_start_date,
        end: u.contract_end_date,
        contractType: u.contract_type!.trim().toLowerCase(),
        tutorName,
        tutorPhone: u.tutor_1_phone_number?.trim() || null,
      });
    }
  }

  const archivedList = [...archivedLogins];
  const alternantList = [...alternantMap.keys()];

  if (dry) {
    return {
      dry: true,
      archivedInEmargement: archivedList.length,
      alternantsInEmargement: alternantList.length,
      studentsArchived: 0,
      studentsAlternant: 0,
      contractsSynced: 0,
      documentsLinked: 0,
      unresolved,
    };
  }

  // 4) ÉCRITURE hub uniquement (students).
  // 4a) archived (double sens).
  if (archivedList.length === 0) {
    await db.execute(sql`UPDATE students SET archived = false WHERE archived = true`);
  } else {
    const list = sql.join(archivedList.map((l) => sql`${l}`), sql`, `);
    await db.execute(sql`UPDATE students SET archived = (lower(login) IN (${list}))`);
  }

  // 4b) isAlternant (double sens).
  if (alternantList.length === 0) {
    await db.execute(sql`UPDATE students SET is_alternant = false WHERE is_alternant = true`);
  } else {
    const list = sql.join(alternantList.map((l) => sql`${l}`), sql`, `);
    await db.execute(sql`UPDATE students SET is_alternant = (lower(login) IN (${list}))`);
  }

  // 4c) Non-alternants : effacer les champs alternant du hub (autoritatif).
  await db.execute(sql`
    UPDATE students SET
      alternant_start_date = NULL,
      alternant_end_date = NULL,
      company_name = NULL,
      company_contact = NULL,
      company_email = NULL,
      company_phone = NULL,
      alternant_notes = NULL
    WHERE (is_alternant IS NULL OR is_alternant = false)
  `);

  // 4d) Alternants : dates de contrat en UN SEUL update ensembliste (VALUES).
  //     Dates passées en TEXTE puis castées → pas de décalage de fuseau, et pas
  //     de binding de Date concurrent (source du « Failed query » précédent).
  const withDates = [...alternantMap.entries()].filter(([, d]) => d.start || d.end);
  if (withDates.length > 0) {
    const values = sql.join(
      withDates.map(
        ([login, d]) => sql`(${login}, ${d.start}::timestamp, ${d.end}::timestamp)`,
      ),
      sql`, `,
    );
    await db.execute(sql`
      UPDATE students AS s SET
        alternant_start_date = v.d_start,
        alternant_end_date = v.d_end
      FROM (VALUES ${values}) AS v(login, d_start, d_end)
      WHERE lower(s.login) = v.login
    `);
  }

  // 4e) Contrats structurés depuis émargement (type + dates + tuteur).
  //     UPSERT sur la clé naturelle `student_id` (émargement porte au plus UN
  //     contrat par utilisateur : les colonnes contract_* sont sur `users`).
  //     Les contrats saisis à la main (source='manual') ne sont jamais touchés.
  //
  //     ⚠️ Ne JAMAIS repasser en DELETE + INSERT : les IDs de contrat sont
  //     référencés par les échéances de suivi en entreprise
  //     (`follow_up_milestones.contract_id`, ON DELETE CASCADE). Les recréer à
  //     chaque synchro détruirait les échéances, les relances tracées et le
  //     rattachement des comptes rendus.
  //
  //     émargement n'a pas le nom d'entreprise → placeholder « Non renseigné ».
  const now = new Date();
  const desiredByStudent = new Map<number, typeof alternantContracts.$inferInsert>();
  for (const [login, info] of alternantMap.entries()) {
    const studentId = studentIdByLogin.get(login);
    if (!studentId || !info.start || !info.end) continue; // dates obligatoires
    const endDate = new Date(info.end);
    desiredByStudent.set(studentId, {
      studentId,
      contractType: info.contractType,
      startDate: new Date(info.start),
      endDate,
      companyName: companyByLogin.get(login) ?? 'Non renseigné',
      tutorName: info.tutorName,
      tutorPhone: info.tutorPhone,
      isActive: endDate >= now,
      source: 'emargement',
    });
  }

  // État actuel des contrats synchronisés, pour décider update / insert / delete.
  const existingEmg = await db
    .select({ id: alternantContracts.id, studentId: alternantContracts.studentId })
    .from(alternantContracts)
    .where(eq(alternantContracts.source, 'emargement'))
    .orderBy(alternantContracts.id);

  const existingByStudent = new Map<number, number>(); // studentId → contractId conservé
  const staleIds: number[] = []; // doublons hérités + contrats disparus d'émargement
  for (const row of existingEmg) {
    if (existingByStudent.has(row.studentId)) {
      staleIds.push(row.id); // doublon (données antérieures au passage en upsert)
    } else {
      existingByStudent.set(row.studentId, row.id);
    }
  }
  for (const [studentId, contractId] of existingByStudent.entries()) {
    if (!desiredByStudent.has(studentId)) staleIds.push(contractId);
  }
  if (staleIds.length > 0) {
    await db.delete(alternantContracts).where(inArray(alternantContracts.id, staleIds));
  }

  const contractIds: number[] = [];
  /** (studentId, contractId) pour rattacher les CERFA au bon contrat. */
  const studentContractPairs: [number, number][] = [];
  for (const [studentId, row] of desiredByStudent.entries()) {
    const existingId = existingByStudent.get(studentId);
    if (existingId) {
      await db
        .update(alternantContracts)
        .set({
          contractType: row.contractType,
          startDate: row.startDate,
          endDate: row.endDate,
          companyName: row.companyName,
          tutorName: row.tutorName,
          tutorPhone: row.tutorPhone,
          isActive: row.isActive,
          updatedAt: now,
        })
        .where(eq(alternantContracts.id, existingId));
      contractIds.push(existingId);
      studentContractPairs.push([studentId, existingId]);
    } else {
      const [inserted] = await db
        .insert(alternantContracts)
        .values(row)
        .returning({ id: alternantContracts.id });
      contractIds.push(inserted.id);
      studentContractPairs.push([studentId, inserted.id]);
    }
  }
  const contractRows = [...desiredByStudent.values()];

  let documentsLinked = 0;
  if (contractIds.length > 0) {
    // Rattacher les documents type 'contrat' (CERFA) au contrat de l'apprenant.
    const pairs = studentContractPairs.map(([sid, cid]) => sql`(${sid}::int, ${cid}::int)`);
    const linkRes = await db.execute(sql`
      UPDATE alternant_documents AS d SET contract_id = v.cid
      FROM (VALUES ${sql.join(pairs, sql`, `)}) AS v(sid, cid)
      WHERE d.student_id = v.sid AND d.document_type = 'contrat'
        AND (d.contract_id IS NULL OR d.contract_id <> v.cid)
    `);
    documentsLinked = (linkRes as unknown as { count?: number }).count ?? 0;
  }

  // 4f) Réconcilier les échéances de suivi en entreprise sur ces contrats.
  //     Idempotent : ne crée que ce qui manque, décale si la date de début a
  //     changé, n'écrase jamais un suivi déjà réalisé.
  if (contractIds.length > 0) {
    await reconcileMilestones({ contractIds }).catch((e) => {
      // Un échec ici ne doit pas faire échouer la synchro RH elle-même.
      console.error('[emargementSync] réconciliation des échéances échouée :', e);
    });
  }

  // 5) Comptage.
  const asRows = <T,>(r: unknown) => r as unknown as T[];
  const archivedRes = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM students WHERE archived = true`,
  );
  const alternantRes = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM students WHERE is_alternant = true`,
  );

  return {
    dry: false,
    archivedInEmargement: archivedList.length,
    alternantsInEmargement: alternantList.length,
    studentsArchived: Number(asRows<{ count: number }>(archivedRes)[0]?.count ?? 0),
    studentsAlternant: Number(asRows<{ count: number }>(alternantRes)[0]?.count ?? 0),
    contractsSynced: contractRows.length,
    documentsLinked,
    unresolved,
  };
}
