import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { getFollowUpSettings, updateFollowUpSettings } from '@/lib/db/services/followUps';
import {
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
  TEMPLATE_VARIABLES,
} from '@/lib/services/follow-up-notify';
import { isMailerConfigured, verifyMailer } from '@/lib/services/mailer';
import { isCalendarConfigured } from '@/lib/services/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/follow-ups/settings — réglages du module + état des intégrations
 * (SMTP, agenda) pour que l'UI affiche ce qui est réellement opérationnel.
 */
export const GET = withErrorHandler(
  withAdmin(async (req: NextRequest) => {
    const settings = await getFollowUpSettings();
    const { searchParams } = new URL(req.url);

    // ?verify=true : test réel de la connexion SMTP (bouton dédié).
    const verify =
      searchParams.get('verify') === 'true' ? await verifyMailer() : undefined;

    return apiSuccess({
      settings,
      defaults: {
        subject: DEFAULT_SUBJECT_TEMPLATE,
        body: DEFAULT_BODY_TEMPLATE,
        variables: TEMPLATE_VARIABLES,
      },
      integrations: {
        mailerConfigured: isMailerConfigured(),
        calendarConfigured: isCalendarConfigured(),
        ...(verify ? { smtpVerify: verify } : {}),
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
