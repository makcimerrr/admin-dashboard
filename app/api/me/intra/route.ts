import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { zone01Graphql } from '@/lib/services/zone01-graphql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Données Intra (zone01normandie.org / admin-rouen) de l'utilisateur courant.
 * Source : GraphQL Hasura Zone01 (`zone01Graphql`, token admin) — mêmes données
 * que /admin/rouen. L'utilisateur est résolu par son LOGIN zone01
 * (`preferred_username` Authentik ; fallback : partie locale de l'email).
 */

interface IntraQuery {
  level: { amount: number }[];
  xp: { aggregate: { sum: { amount: number | null } } };
  up: { aggregate: { sum: { amount: number | null } } };
  down: { aggregate: { sum: { amount: number | null } } };
  skills: { type: string; amount: number }[];
  progress: { object: { name: string; type: string } | null; updatedAt: string }[];
}

const QUERY = `query($login:String!){
  level: transaction(where:{user:{login:{_eq:$login}},type:{_eq:"level"}}, order_by:{amount:desc}, limit:1){ amount }
  xp: transaction_aggregate(where:{user:{login:{_eq:$login}},type:{_eq:"xp"}}){ aggregate{ sum{ amount } } }
  up: transaction_aggregate(where:{user:{login:{_eq:$login}},type:{_eq:"up"}}){ aggregate{ sum{ amount } } }
  down: transaction_aggregate(where:{user:{login:{_eq:$login}},type:{_eq:"down"}}){ aggregate{ sum{ amount } } }
  skills: transaction(where:{user:{login:{_eq:$login}},type:{_like:"skill_%"}}, distinct_on:type, order_by:[{type:asc},{amount:desc}]){ type amount }
  progress: progress(where:{user:{login:{_eq:$login}},isDone:{_eq:false}}, order_by:{updatedAt:desc}, limit:5){ object{ name type } updatedAt }
}`;

const SKILL_LABELS: Record<string, string> = {
  algo: 'Algorithmique',
  prog: 'Programmation',
  go: 'Go',
  git: 'Git',
  stats: 'Statistiques',
  front: 'Front-end',
  back: 'Back-end',
  js: 'JavaScript',
  'sys-admin': 'Sys-admin',
  tcp: 'Réseau',
  'game': 'Jeux',
};

function prettySkill(type: string): string {
  const key = type.replace(/^skill_/, '');
  return SKILL_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');
}

export const GET = withAuth(async (_req, ctx) => {
  const login = (ctx.user.login || (ctx.user.email ?? '').split('@')[0]).trim();
  if (!login) return NextResponse.json({ success: true, found: false, reason: 'login inconnu' });

  try {
    const d = await zone01Graphql<IntraQuery>(QUERY, { login });
    if (!d.level && !d.skills) {
      return NextResponse.json({ success: true, found: false, reason: 'aucune donnée' });
    }
    const up = Number(d.up?.aggregate?.sum?.amount ?? 0);
    const down = Number(d.down?.aggregate?.sum?.amount ?? 0);

    return NextResponse.json({
      success: true,
      found: true,
      login,
      level: Number(d.level?.[0]?.amount ?? 0),
      xp: Number(d.xp?.aggregate?.sum?.amount ?? 0),
      audit: { up, down, ratio: down > 0 ? Math.round((up / down) * 100) / 100 : null },
      skills: (d.skills ?? [])
        .map((s) => ({ name: prettySkill(s.type), level: Number(s.amount) }))
        .sort((a, b) => b.level - a.level),
      projects: (d.progress ?? [])
        .filter((p) => p.object)
        .map((p) => ({ name: p.object!.name, type: p.object!.type, updatedAt: p.updatedAt })),
    });
  } catch (e) {
    console.error('GET /api/me/intra error:', e);
    return NextResponse.json({ success: false, error: 'Erreur intra' }, { status: 500 });
  }
});
