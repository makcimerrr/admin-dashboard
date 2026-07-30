import 'server-only';
import postgres from 'postgres';
import { db } from '../config';
import { sql } from 'drizzle-orm';

/**
 * Synchronise les statuts des apprenants (archivé + alternant) depuis émargement.
 *
 * SENS UNIQUE : émargement est la source de vérité RH et n'est JAMAIS modifié
 * (lecture seule). Seule la table `students` du hub est écrite — émargement
 * ÉCRASE les saisies manuelles du hub.
 *
 * Source = base émargement (table `users`, login = `nickname`), lue directement
 * via `EMARGEMENT_DATABASE_URL` (réseau Docker partagé) car l'API HTTP
 * d'émargement exige une session admin Authentik (non appelable en backend).
 *
 * Règles (autoritatif) :
 *  - `archived`     = `users.archived` (double sens : archive ET désarchive).
 *  - `isAlternant`  = contrat présent (`contract_type` non vide → apprentissage /
 *                     professionnalisation). Marque ET démarque.
 *  - Alternant  → `alternantStartDate/EndDate` repris de `contract_start/end_date`.
 *  - Non-alternant → efface les champs alternant du hub (dates + entreprise /
 *    contact / email / téléphone / notes) : l'émargement prime sur le manuel.
 *    (émargement ne fournit pas le nom d'entreprise → conservé pour les alternants
 *    confirmés, faute de source de remplacement.)
 */

const ALTERNANT_CONTRACTS = ['apprentissage', 'professionnalisation'];

export interface EmargementSyncResult {
  dry: boolean;
  archivedInEmargement: number;
  alternantsInEmargement: number;
  studentsArchived: number;
  studentsAlternant: number;
}

interface EmgUserRow {
  login: string;
  archived: boolean | null;
  contract_type: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
}

export async function syncEmargementStatuses(
  { dry = false }: { dry?: boolean } = {},
): Promise<EmargementSyncResult> {
  const emgUrl = process.env.EMARGEMENT_DATABASE_URL;
  if (!emgUrl) throw new Error('EMARGEMENT_DATABASE_URL non configuré');

  // 1) LECTURE SEULE émargement (jamais d'écriture ici).
  const emg = postgres(emgUrl, { ssl: false, max: 1 });
  let rows: EmgUserRow[] = [];
  try {
    rows = await emg<EmgUserRow[]>`
      SELECT lower(nickname) AS login,
             archived,
             contract_type,
             contract_start_date,
             contract_end_date
      FROM users
      WHERE nickname IS NOT NULL AND nickname <> ''
    `;
  } finally {
    await emg.end({ timeout: 5 }).catch(() => {});
  }

  const archivedLogins = rows.filter((r) => r.archived).map((r) => r.login);
  const alternants = rows.filter(
    (r) => r.contract_type && ALTERNANT_CONTRACTS.includes(r.contract_type.trim().toLowerCase()),
  );
  const alternantLogins = alternants.map((r) => r.login);

  if (dry) {
    return {
      dry: true,
      archivedInEmargement: archivedLogins.length,
      alternantsInEmargement: alternantLogins.length,
      studentsArchived: 0,
      studentsAlternant: 0,
    };
  }

  // 2) ÉCRITURE hub uniquement (students).
  // 2a) archived (double sens).
  if (archivedLogins.length === 0) {
    await db.execute(sql`UPDATE students SET archived = false WHERE archived = true`);
  } else {
    const list = sql.join(archivedLogins.map((l) => sql`${l}`), sql`, `);
    await db.execute(sql`UPDATE students SET archived = (lower(login) IN (${list}))`);
  }

  // 2b) isAlternant (double sens).
  if (alternantLogins.length === 0) {
    await db.execute(sql`UPDATE students SET is_alternant = false WHERE is_alternant = true`);
  } else {
    const list = sql.join(alternantLogins.map((l) => sql`${l}`), sql`, `);
    await db.execute(sql`UPDATE students SET is_alternant = (lower(login) IN (${list}))`);
  }

  // 2c) Non-alternants : effacer les champs alternant du hub (autoritatif).
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

  // 2d) Alternants : dates de contrat reprises d'émargement.
  await Promise.all(
    alternants.map((a) =>
      db.execute(sql`
        UPDATE students SET
          alternant_start_date = ${a.contract_start_date},
          alternant_end_date = ${a.contract_end_date}
        WHERE lower(login) = ${a.login}
      `),
    ),
  );

  // 3) Comptage.
  const archivedRes = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM students WHERE archived = true`,
  );
  const alternantRes = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM students WHERE is_alternant = true`,
  );
  const asRows = <T,>(r: unknown) => r as unknown as T[];

  return {
    dry: false,
    archivedInEmargement: archivedLogins.length,
    alternantsInEmargement: alternantLogins.length,
    studentsArchived: Number(asRows<{ count: number }>(archivedRes)[0]?.count ?? 0),
    studentsAlternant: Number(asRows<{ count: number }>(alternantRes)[0]?.count ?? 0),
  };
}
