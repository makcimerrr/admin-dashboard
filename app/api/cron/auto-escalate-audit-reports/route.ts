import { NextRequest, NextResponse } from 'next/server';
import {
  getAuditRequestsToEscalate,
  markAuditEscalated,
} from '@/lib/db/services/auditReports';
import { sendTeamsCard, buildEscalationCard } from '@/lib/services/teams';

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hub.zone01normandie.org';

/**
 * Feature 7 (auto) — escalade des rapports d'audit sans réponse après 2 jours
 * ouvrés. Pour chaque demande non répondue/non escaladée assez ancienne, poste
 * une carte Teams (canal principal) puis marque `escalated_at`.
 *
 * Auth : Authorization: Bearer <CRON_SECRET> ou ?secret=.
 * ?dry=1 : liste les escalades prévues sans rien envoyer ni marquer.
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

  const dry = request.nextUrl.searchParams.get('dry') === '1';
  const suiviUrl = `${BASE_URL}/code-reviews/suivi`;

  const requests = await getAuditRequestsToEscalate();

  if (dry) {
    return NextResponse.json({
      success: true,
      dry: true,
      checked: requests.length,
      escalated: requests.map((r) => ({
        id: r.id,
        auditorLogin: r.auditorLogin,
        projectName: r.projectName,
        requestedAt: r.requestedAt,
      })),
    });
  }

  const escalated: { id: number; auditorLogin: string }[] = [];
  const errors: { id: number; auditorLogin: string }[] = [];
  for (const r of requests) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await sendTeamsCard(
      buildEscalationCard({
        auditorLogin: r.auditorLogin,
        projectName: r.projectName,
        requestedAt: r.requestedAt,
        suiviUrl,
      }),
    );
    if (ok) {
      // eslint-disable-next-line no-await-in-loop
      await markAuditEscalated(r.id);
      escalated.push({ id: r.id, auditorLogin: r.auditorLogin });
    } else {
      errors.push({ id: r.id, auditorLogin: r.auditorLogin });
    }
  }

  return NextResponse.json({
    success: true,
    checked: requests.length,
    escalated,
    errors,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
