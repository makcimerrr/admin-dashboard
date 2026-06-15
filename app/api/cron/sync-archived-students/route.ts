import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { db } from '@/lib/db/config';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Synchronise le statut « archivé » des apprenants depuis émargement.
 *
 * Source = base émargement (table `users`, colonne `archived`, login = `nickname`).
 * L'API émargement `/api/users/{user}` est protégée par session admin Authentik
 * (non appelable depuis un backend), donc on lit la base directement via
 * `EMARGEMENT_DATABASE_URL` (l'app et émargement partagent le réseau Docker
 * `postgres-production-network`). Lecture seule côté émargement.
 *
 * Effet : `students.archived = true` pour tout login archivé côté émargement,
 * `false` sinon (gère aussi le désarchivage). Les archivés sont exclus des
 * stats/widgets via `countableStudentsWhere`. ⚠️ DISTINCT de `isDropout`
 * (perdition/abandon).
 *
 * Auth : Authorization: Bearer <CRON_SECRET> ou ?secret=. ?dry=1 = aperçu.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const provided = authHeader?.replace('Bearer ', '') || querySecret;
    if (provided !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  const emgUrl = process.env.EMARGEMENT_DATABASE_URL;
  if (!emgUrl) {
    return NextResponse.json({
      success: false,
      skipped: true,
      reason: 'EMARGEMENT_DATABASE_URL non configuré',
    });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  // 1) Lire les logins archivés côté émargement (read-only, base interne sans TLS).
  const emg = postgres(emgUrl, { ssl: false, max: 1 });
  let archivedLogins: string[] = [];
  try {
    const rows = await emg<{ login: string }[]>`
      SELECT lower(nickname) AS login FROM users
      WHERE archived = true AND nickname IS NOT NULL AND nickname <> ''
    `;
    archivedLogins = rows.map((r) => r.login).filter(Boolean);
  } catch (e) {
    await emg.end({ timeout: 5 }).catch(() => {});
    console.error('sync-archived-students: lecture émargement échouée', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Lecture émargement échouée' },
      { status: 500 },
    );
  }
  await emg.end({ timeout: 5 }).catch(() => {});

  if (dry) {
    return NextResponse.json({
      success: true,
      dry: true,
      archivedInEmargement: archivedLogins.length,
    });
  }

  // 2) Mettre à jour students.archived (true si match, false sinon → désarchivage géré).
  if (archivedLogins.length === 0) {
    await db.execute(sql`UPDATE students SET archived = false WHERE archived = true`);
  } else {
    const list = sql.join(archivedLogins.map((l) => sql`${l}`), sql`, `);
    await db.execute(sql`UPDATE students SET archived = (lower(login) IN (${list}))`);
  }

  // 3) Compter le résultat.
  const res = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM students WHERE archived = true`,
  );
  const studentsArchived = Number((res as unknown as { count: number }[])[0]?.count ?? 0);

  return NextResponse.json({
    success: true,
    archivedInEmargement: archivedLogins.length,
    studentsArchived,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
