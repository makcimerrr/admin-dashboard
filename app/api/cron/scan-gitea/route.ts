import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveStudentLogins,
  upsertGiteaProfile,
  replaceSkillsForSource,
  updateGiteaAiSummary,
} from '@/lib/db/services/studentSkills';
import {
  fetchGiteaInfo,
  computeActivityMetrics,
  fetchGiteaLanguages,
  deriveLanguageSkills,
} from '@/lib/services/gitea';
import { synthesizeSkills, isAiSynthesisAvailable } from '@/lib/services/skills-ai';

// Plan Hobby : plafond à 60s par invocation. Pour couvrir tous les étudiants,
// scanner par tranches via ?offset/?limit (voir plus bas).
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const CONCURRENCY = 5;

/**
 * Chantier A — Scan Gitea (hebdo). Pour chaque étudiant actif, récupère
 * l'activité Gitea (Palier 1 via API deno) et upsert son snapshot. Le Palier 2
 * (langages via token Gitea) s'active automatiquement quand GITEA_URL/TOKEN
 * sont présents.
 *
 * Auth : header `Authorization: Bearer <CRON_SECRET>` ou `?secret=`.
 * `?login=<login>` pour scanner un seul étudiant (debug).
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const provided = authHeader?.replace('Bearer ', '') || querySecret;
    if (provided !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  const single = request.nextUrl.searchParams.get('login');
  const offsetParam = Number(request.nextUrl.searchParams.get('offset') ?? '0');
  const limitParam = request.nextUrl.searchParams.get('limit');
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? Math.floor(offsetParam) : 0;
  const limit = limitParam && Number.isFinite(Number(limitParam)) ? Math.floor(Number(limitParam)) : null;

  const allLogins = single ? [single] : await getActiveStudentLogins();
  // Tranche optionnelle (Hobby = 60s/invocation) : ?offset=&limit=.
  const logins = single
    ? allLogins
    : allLogins.slice(offset, limit != null ? offset + limit : undefined);

  // Synthèse IA opt-in (coût) : ?ai=1 ou SKILLS_AI_SYNTHESIS=1, si provider dispo.
  const aiRequested =
    request.nextUrl.searchParams.get('ai') === '1' || process.env.SKILLS_AI_SYNTHESIS === '1';
  const runAi = aiRequested && isAiSynthesisAvailable();

  const nowSec = Math.floor(Date.now() / 1000);
  let scanned = 0;
  let withActivity = 0;
  let aiSynthesized = 0;
  const errors: { login: string; error: string }[] = [];

  // Traitement par lots pour ne pas saturer l'API deno.
  for (let i = 0; i < logins.length; i += CONCURRENCY) {
    const batch = logins.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (login) => {
        try {
          const info = await fetchGiteaInfo(login);
          const metrics = computeActivityMetrics(info, nowSec);
          const lang = await fetchGiteaLanguages(login); // null en Palier 1

          await upsertGiteaProfile({
            login,
            totalContributions: metrics.totalContributions,
            activeDays: metrics.activeDays,
            contributions30d: metrics.contributions30d,
            contributions90d: metrics.contributions90d,
            currentStreakDays: metrics.currentStreakDays,
            longestStreakDays: metrics.longestStreakDays,
            lastActivityAt: metrics.lastActivityAt,
            engagementScore: metrics.engagementScore,
            affinityLabel: metrics.affinityLabel,
            reposCount: lang?.reposCount ?? null,
            languages: lang?.languages ?? null,
            raw: info ?? null,
          });

          // Dérive et remplace les skills "langage" (déterministe, sans IA).
          if (lang?.languages) {
            const skills = deriveLanguageSkills(lang.languages, metrics.engagementScore);
            await replaceSkillsForSource(
              login,
              'gitea',
              skills.map((s) => ({ login, ...s })),
            );
          }

          // Synthèse IA optionnelle : frameworks/domaines + narratif.
          if (runAi && lang?.languages && lang.reposCount > 0) {
            const ai = await synthesizeSkills({
              login,
              languages: lang.languages,
              repoNames: lang.repoNames,
              engagementScore: metrics.engagementScore,
              affinityLabel: metrics.affinityLabel,
            });
            if (ai) {
              await replaceSkillsForSource(login, 'ai', ai.skills.map((s) => ({ login, ...s })));
              await updateGiteaAiSummary(login, ai.narrative);
              aiSynthesized += 1;
            }
          }

          scanned += 1;
          if (metrics.totalContributions > 0) withActivity += 1;
        } catch (error) {
          errors.push({
            login,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      }),
    );
  }

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - startTime,
    totalActive: allLogins.length,
    offset,
    limit,
    inThisRun: logins.length,
    scanned,
    withActivity,
    aiRequested,
    aiAvailable: isAiSynthesisAvailable(),
    aiSynthesized,
    errors,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
