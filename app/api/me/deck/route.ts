import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { withAuth } from '@/lib/api/with-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stats 01deck de l'utilisateur courant (widget non-admin).
 *
 * 01deck (base `deck` sur postgres-production, schéma Prisma) n'expose pas d'API
 * publique exploitable backend → on lit directement sa base via
 * DECK_DATABASE_URL (réseau Docker partagé), match par email.
 * Données : XP total, rang par XP, streak, profil compétitif (ELO + V/D),
 * XP de la semaine.
 */
export const GET = withAuth(async (_req, ctx) => {
  const email = (ctx.user.email ?? '').trim().toLowerCase();
  const url = process.env.DECK_DATABASE_URL;
  if (!url) return NextResponse.json({ success: true, found: false, reason: 'non configuré' });
  if (!email) return NextResponse.json({ success: true, found: false, reason: 'email manquant' });

  const deck = postgres(url, { ssl: false, max: 1 });
  try {
    const rows = await deck<
      {
        id: string;
        xp: number;
        currentStreak: number | null;
        longestStreak: number | null;
        rating: number | null;
        wins: number | null;
        losses: number | null;
      }[]
    >`
      SELECT u.id, u.xp,
             s."currentStreak", s."longestStreak",
             cp.rating, cp.wins, cp.losses
      FROM "User" u
      LEFT JOIN "Streak" s ON s."userId" = u.id
      LEFT JOIN "CompetitiveProfile" cp ON cp."userId" = u.id
      WHERE lower(u.email) = ${email}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ success: true, found: false, reason: 'utilisateur introuvable' });
    }
    const u = rows[0];

    const [[rankRow], [totalRow], [weekRow]] = await Promise.all([
      deck<{ rank: number }[]>`SELECT count(*) + 1 AS rank FROM "User" WHERE xp > ${u.xp}`,
      deck<{ total: number }[]>`SELECT count(*) AS total FROM "User"`,
      deck<{ xp: number }[]>`
        SELECT COALESCE(SUM(xp), 0)::int AS xp FROM "UserXPEvent"
        WHERE "userId" = ${u.id} AND "createdAt" >= date_trunc('week', now())
      `,
    ]);

    return NextResponse.json({
      success: true,
      found: true,
      xp: Math.round(Number(u.xp) || 0),
      xpThisWeek: Number(weekRow?.xp ?? 0),
      rank: Number(rankRow?.rank ?? 0),
      totalUsers: Number(totalRow?.total ?? 0),
      streak: Number(u.currentStreak ?? 0),
      longestStreak: Number(u.longestStreak ?? 0),
      competitive: {
        rating: u.rating != null ? Number(u.rating) : null,
        wins: Number(u.wins ?? 0),
        losses: Number(u.losses ?? 0),
      },
    });
  } catch (e) {
    console.error('GET /api/me/deck error:', e);
    return NextResponse.json({ success: false, error: 'Erreur deck' }, { status: 500 });
  } finally {
    await deck.end({ timeout: 5 }).catch(() => {});
  }
});
