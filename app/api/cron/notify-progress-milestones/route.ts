import { NextRequest, NextResponse } from 'next/server';
import {
  getGroupsForMilestoneCheck,
  markMilestoneNotified,
} from '@/lib/db/services/groupStatuses';
import { sendDiscordDM } from '@/lib/services/discord';
import { getTrackByProjectName } from '@/lib/config/projects';
import { getReviewerForRoundRobin, type Reviewer } from '@/lib/db/services/reviewers';

export const maxDuration = 60;

function buildMilestoneMessage(
  captain: string,
  project: string,
  weeks: number,
  pct: number,
  reviewer: Reviewer
): string {
  return [
    `Hey ${captain} ! 👋`,
    ``,
    `Ton groupe est à environ **${pct}%** du temps prévu pour le projet **${project}** (${weeks} semaine${weeks > 1 ? 's' : ''}).`,
    ``,
    `C'est le bon moment pour faire un point d'avancement avec un coach. En tant que **capitaine**, réserve un créneau avec **${reviewer.name}** :`,
    `📅 ${reviewer.planningUrl}`,
    ``,
    `Ça aide à débloquer ce qui coince et à rester dans les temps 💪`,
  ].join('\n');
}

export async function GET(request: NextRequest) {
  if (
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}` &&
    request.nextUrl.searchParams.get('secret') !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  const rows = await getGroupsForMilestoneCheck();

  let assignmentIndex = 0;
  const sent: Array<Record<string, unknown>> = [];

  // Seul le palier 50 % est conservé, et uniquement pour les projets de
  // ≥ 4 semaines. Les projets optionnels sont ignorés.
  const MILESTONE_PCT = 50 as const;
  const MILESTONE_FRAC = 0.5;

  for (const row of rows) {
    if (!row.projectTimeWeek || !row.discordId) continue;

    // Ignore les projets courts (< 4 semaines)
    if (row.projectTimeWeek < 4) continue;

    // Ignore les projets optionnels
    if (row.optional === true) continue;

    // Idempotence sur le palier 50 %
    if (row.notified50At != null) continue;

    const durationMs = row.projectTimeWeek * 7 * 24 * 3600 * 1000;
    const elapsedMs = Date.now() - new Date(row.setupAt as Date).getTime();

    if (elapsedMs < durationMs * MILESTONE_FRAC) continue;

    const track = await getTrackByProjectName(row.projectName);
    const reviewer = await getReviewerForRoundRobin(track, assignmentIndex);
    if (!reviewer) {
      console.warn(
        `notify-progress-milestones: no reviewer for track=${track} project=${row.projectName} (group ${row.id})`
      );
      continue;
    }

    if (dry) {
      sent.push({
        captain: row.captainLogin,
        project: row.projectName,
        pct: MILESTONE_PCT,
        coach: reviewer.name,
        dry: true,
      });
      continue;
    }

    const msg = buildMilestoneMessage(
      row.captainLogin as string,
      row.projectName,
      row.projectTimeWeek,
      MILESTONE_PCT,
      reviewer
    );
    const ok = await sendDiscordDM(row.discordId, msg);

    if (ok) {
      await markMilestoneNotified(row.id, MILESTONE_PCT);
      assignmentIndex++;
      sent.push({
        captain: row.captainLogin,
        project: row.projectName,
        pct: MILESTONE_PCT,
        coach: reviewer.name,
      });
    }
  }

  return NextResponse.json({ success: true, checked: rows.length, sent });
}
