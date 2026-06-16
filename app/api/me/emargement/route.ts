import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { withAuth } from '@/lib/api/with-auth';
import { isAdminRole } from '@/lib/nav-apps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Données d'émargement de l'utilisateur courant (widget non-admin).
 *
 * L'API émargement `/api/user/*` est protégée par session admin Authentik (non
 * appelable backend), donc on lit directement sa base via EMARGEMENT_DATABASE_URL
 * (réseau Docker partagé), en faisant correspondre l'utilisateur par email
 * (ou login = nickname). On réplique le calcul d'émargement :
 * heures = SUM(EXTRACT(EPOCH FROM (exit_time - enter_time))).
 */

const WEEK_TARGET_HOURS = 35; // objectif hebdo standard Zone01 (7h/j × 5j)
const HOURS_PER_DAY = 7;

function workingDaysInMonth(d: Date): number {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  let n = 0;
  for (let day = 1; day <= last; day++) {
    const wd = new Date(Date.UTC(year, month, day)).getUTCDay();
    if (wd >= 1 && wd <= 5) n++;
  }
  return n;
}

export const GET = withAuth(async (req, ctx) => {
  // Override admin : un admin peut consulter l'émargement d'un autre étudiant en
  // passant ?login=. Honoré UNIQUEMENT pour un admin (sécurité : un étudiant ne
  // doit jamais voir les données d'un autre).
  const overrideLogin = isAdminRole(ctx.user.role)
    ? new URL(req.url).searchParams.get('login')?.trim().toLowerCase() || null
    : null;

  const email = (ctx.user.email ?? '').trim().toLowerCase();
  const url = process.env.EMARGEMENT_DATABASE_URL;
  if (!url) {
    return NextResponse.json({ success: true, found: false, reason: 'non configuré' });
  }
  if (!overrideLogin && !email) {
    return NextResponse.json({ success: true, found: false, reason: 'email manquant' });
  }

  const emg = postgres(url, { ssl: false, max: 1 });
  try {
    // Résolution de l'utilisateur émargement.
    // - Override admin : match par login (nickname ou email = overrideLogin).
    // - Sinon : utilisateur courant (email d'abord, sinon nickname=login local).
    const login = overrideLogin ?? email.split('@')[0];
    const users = overrideLogin
      ? await emg<{ id: number; nickname: string | null; name: string | null }[]>`
          SELECT id, nickname, name FROM users
          WHERE lower(nickname) = ${overrideLogin} OR lower(email) = ${overrideLogin}
          LIMIT 1
        `
      : await emg<{ id: number; nickname: string | null; name: string | null }[]>`
          SELECT id, nickname, name FROM users
          WHERE lower(email) = ${email} OR lower(nickname) = ${login}
          LIMIT 1
        `;
    if (users.length === 0) {
      return NextResponse.json({ success: true, found: false, reason: 'utilisateur introuvable' });
    }
    const u = users[0];

    const [agg] = await emg<{ week_seconds: number; month_seconds: number }[]>`
      SELECT
        COALESCE(SUM(EXTRACT(EPOCH FROM (exit_time - enter_time)))
          FILTER (WHERE date >= date_trunc('week', now()) AND exit_time IS NOT NULL), 0)::bigint AS week_seconds,
        COALESCE(SUM(EXTRACT(EPOCH FROM (exit_time - enter_time)))
          FILTER (WHERE date >= date_trunc('month', now()) AND exit_time IS NOT NULL), 0)::bigint AS month_seconds
      FROM logs WHERE user_id = ${u.id}
    `;

    const logs = await emg<
      { date: string; enter_time: string; exit_time: string | null }[]
    >`
      SELECT to_char(date, 'YYYY-MM-DD') AS date,
             to_char(enter_time, 'HH24:MI') AS enter_time,
             to_char(exit_time, 'HH24:MI') AS exit_time
      FROM logs WHERE user_id = ${u.id}
      ORDER BY date DESC, enter_time DESC
      LIMIT 5
    `;

    const now = new Date();
    const monthTarget = workingDaysInMonth(now) * HOURS_PER_DAY;
    const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    return NextResponse.json({
      success: true,
      found: true,
      name: u.name,
      week: {
        doneHours: Math.round((Number(agg.week_seconds) / 3600) * 100) / 100,
        targetHours: WEEK_TARGET_HOURS,
      },
      month: {
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        doneHours: Math.round((Number(agg.month_seconds) / 3600) * 100) / 100,
        targetHours: monthTarget,
        workingDays: workingDaysInMonth(now),
      },
      logs: logs.map((l) => ({ date: l.date, in: l.enter_time, out: l.exit_time })),
    });
  } catch (e) {
    console.error('GET /api/me/emargement error:', e);
    return NextResponse.json({ success: false, error: 'Erreur émargement' }, { status: 500 });
  } finally {
    await emg.end({ timeout: 5 }).catch(() => {});
  }
});
