import { NextRequest, NextResponse } from 'next/server';
import {
  getAuditedProjects,
  recordAuditReportRequest,
  buildAuditReportMessage,
  SINCE_DAYS_DEFAULT,
} from '@/lib/db/services/auditReports';
import { getDiscordIdByLogin } from '@/lib/db/services/discordUsers';
import { sendDiscordDM } from '@/lib/services/discord';

export const maxDuration = 60;

/**
 * Chantier D — compte-rendus d'audit.
 *  GET  ?promo=<key>[&sinceDays=60] → projets audités + auditeurs (Discord/déjà demandé)
 *  POST { auditorLogin, groupId, project } → DM Discord de demande + trace
 */
export async function GET(request: NextRequest) {
  try {
    const promo = request.nextUrl.searchParams.get('promo');
    if (!promo || promo === 'all') {
      return NextResponse.json({ success: false, error: 'Sélectionnez une promotion.' }, { status: 400 });
    }
    const sinceDays = Number(request.nextUrl.searchParams.get('sinceDays') ?? SINCE_DAYS_DEFAULT);
    const projects = await getAuditedProjects(promo, Number.isFinite(sinceDays) ? sinceDays : SINCE_DAYS_DEFAULT);
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('GET /api/audit-reports error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur de chargement.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auditorLogin = String(body?.auditorLogin ?? '').trim();
    const groupId = String(body?.groupId ?? '').trim();
    const project = String(body?.project ?? '').trim();
    if (!auditorLogin || !groupId) {
      return NextResponse.json({ success: false, error: 'auditorLogin et groupId requis.' }, { status: 400 });
    }

    const discordId = await getDiscordIdByLogin(auditorLogin);
    if (!discordId) {
      return NextResponse.json(
        { success: false, error: `${auditorLogin} n'a pas de Discord lié.` },
        { status: 400 },
      );
    }

    // Pas de membres résolus côté demande manuelle → message « un autre groupe ».
    const sent = await sendDiscordDM(discordId, buildAuditReportMessage(auditorLogin, project || 'son projet', ''));
    if (!sent) {
      return NextResponse.json({ success: false, error: 'Échec de l\'envoi du DM Discord.' }, { status: 502 });
    }

    await recordAuditReportRequest(auditorLogin, groupId, project || null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/audit-reports error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'envoi.' },
      { status: 500 },
    );
  }
}
