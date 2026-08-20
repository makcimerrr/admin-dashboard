import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { getFollowUpSettings, updateFollowUpSettings } from '@/lib/db/services/followUps';
import {
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
  TEMPLATE_VARIABLES,
} from '@/lib/services/follow-up-notify';
import { isCalendarConfigured } from '@/lib/services/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/follow-ups/settings — réglages du module + état de l'agenda.
 *
 * Aucun état SMTP : le hub n'envoie pas de mail, il ouvre la messagerie de
 * l'utilisateur (`mailto:`).
 */
export const GET = withErrorHandler(
  withAdmin(async () => {
    const settings = await getFollowUpSettings();

    return apiSuccess({
      settings,
      defaults: {
        subject: DEFAULT_SUBJECT_TEMPLATE,
        body: DEFAULT_BODY_TEMPLATE,
        variables: TEMPLATE_VARIABLES,
      },
      integrations: {
        calendarConfigured: isCalendarConfigured(),
      },
    });
  }),
);

/** PUT /api/follow-ups/settings — met à jour les réglages du module. */
export const PUT = withErrorHandler(
  withAdmin(async (req: NextRequest, { user }) => {
    const body = (await req.json()) as Record<string, unknown>;

    const numeric = [
      'internalAlertLeadDays',
      'reminderLeadDays',
      'secondReminderAfterDays',
      'minDaysBeforeContractEnd',
    ] as const;
    for (const key of numeric) {
      if (body[key] !== undefined) {
        const n = Number(body[key]);
        if (!Number.isInteger(n) || n < 0 || n > 365) {
          return apiError('BAD_REQUEST', `${key} doit être un entier entre 0 et 365`);
        }
        body[key] = n;
      }
    }

    const allowed = [
      ...numeric,
      'bookingUrl',
      'watchedCalendarId',
      'senderName',
      'senderEmail',
      'replyToEmail',
      'emailSubjectTemplate',
      'emailBodyTemplate',
      'teamsAlertsEnabled',
    ];
    const patch = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k)),
    );

    const settings = await updateFollowUpSettings(patch, user.email);
    return apiSuccess({ settings });
  }),
);
