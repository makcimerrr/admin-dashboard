import { NextRequest, NextResponse } from 'next/server';
import { makeLog } from '@/lib/log';
import { getFollowUpSettings, listMilestones, setMilestoneStatus } from '@/lib/db/services/followUps';
import { getUpcomingCalendarEvents, isCalendarConfigured } from '@/lib/services/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const log = makeLog('cron:follow-up-calendar');

/** Normalise pour comparer des noms : minuscules, sans accents. */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Détection automatique des RDV réservés.
 *
 * Lit l'agenda surveillé (lecture seule, service account déjà en place) et
 * bascule en « RDV planifié » les échéances dont le tuteur a effectivement pris
 * un créneau — pour ne pas relancer quelqu'un qui a déjà répondu.
 *
 * Rapprochement, du plus fiable au plus souple :
 *   1. email du tuteur présent dans les participants de l'événement ;
 *   2. nom de l'apprenant présent dans le titre de l'événement.
 *
 * Un événement déjà rattaché à une échéance n'est jamais réutilisé.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  if (!isCalendarConfigured()) {
    return NextResponse.json({
      success: false,
      reason: 'Google Calendar non configuré (GOOGLE_CALENDAR_ID / service account)',
    });
  }

  const dry = request.nextUrl.searchParams.get('dry') === 'true';
  const settings = await getFollowUpSettings();
  const events = await getUpcomingCalendarEvents(
    250,
    settings.watchedCalendarId || undefined,
  );

  // Échéances encore ouvertes ET déjà relancées ou proches : ce sont les seules
  // pour lesquelles un RDV dans l'agenda a du sens.
  const open = await listMilestones({ status: ['a_venir', 'relance_envoyee'] });

  // Événements déjà rattachés à une échéance (y compris closes) → intouchables.
  const allMilestones = await listMilestones({ includeClosed: true });
  const takenEventIds = new Set(
    allMilestones.map((m) => m.calendarEventId).filter((id): id is string => Boolean(id)),
  );

  const matched: { milestoneId: number; eventId: string; start: string }[] = [];

  for (const milestone of open) {
    const tutorEmail = milestone.tutorEmail?.trim().toLowerCase();
    const studentName = norm(`${milestone.firstName} ${milestone.lastName}`);

    const event = events.find((e) => {
      if (takenEventIds.has(e.id)) return false;
      if (tutorEmail && e.attendees.some((a) => a.email.toLowerCase() === tutorEmail)) {
        return true;
      }
      return norm(e.summary).includes(studentName);
    });

    if (!event || !event.startDateTime) continue;

    takenEventIds.add(event.id);
    matched.push({ milestoneId: milestone.id, eventId: event.id, start: event.startDateTime });

    if (!dry) {
      // `calendarEventId` est mémorisé pour ne jamais rapprocher deux fois le
      // même événement d'agenda.
      await setMilestoneStatus(milestone.id, 'rdv_planifie', {
        scheduledAt: new Date(event.startDateTime),
        calendarEventId: event.id,
      });
    }
  }

  const summary = { dry, eventsScanned: events.length, openMilestones: open.length, matched };
  log.info('détection RDV terminée', summary);
  return NextResponse.json({ success: true, ...summary });
}
