import { google } from 'googleapis';

export interface CalendarEvent {
  id: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  attendees: { email: string; displayName?: string }[];
  htmlLink: string;
}

export function isCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CALENDAR_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

export async function getUpcomingCalendarEvents(maxResults = 50, calendarId?: string): Promise<CalendarEvent[]> {
  if (!isCalendarConfigured()) return [];

  const targetCalendarId = calendarId || process.env.GOOGLE_CALENDAR_ID!;

  try {
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: targetCalendarId,
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const items = response.data.items ?? [];

    return items.map((event) => ({
      id: event.id ?? '',
      summary: event.summary ?? '(sans titre)',
      startDateTime: event.start?.dateTime ?? event.start?.date ?? '',
      endDateTime: event.end?.dateTime ?? event.end?.date ?? '',
      attendees: (event.attendees ?? []).map((a) => ({
        email: a.email ?? '',
        displayName: a.displayName ?? undefined,
      })),
      htmlLink: event.htmlLink ?? '',
    }));
  } catch (error) {
    console.error(`Google Calendar error (${targetCalendarId}):`, error);
    return [];
  }
}

export interface CalendarEventWithReviewer extends CalendarEvent {
  reviewerName: string;
  reviewerId: number;
}

export async function getUpcomingEventsFromAllReviewers(maxResultsPerCalendar = 30): Promise<CalendarEventWithReviewer[]> {
  if (!isCalendarConfigured()) return [];

  const { getAllReviewers } = await import('@/lib/db/services/reviewers');
  const reviewers = await getAllReviewers();

  // Collect all unique calendar IDs (reviewer calendars + default)
  const calendarSources: { calendarId: string; reviewerName: string; reviewerId: number; eventPrefix: string | null }[] = [];

  for (const reviewer of reviewers) {
    if (reviewer.calendarId) {
      calendarSources.push({
        calendarId: reviewer.calendarId,
        reviewerName: reviewer.name,
        reviewerId: reviewer.id,
        eventPrefix: reviewer.eventPrefix ?? null,
      });
    }
  }

  // Always include the default calendar if no reviewer calendars exist
  if (calendarSources.length === 0) {
    const defaultEvents = await getUpcomingCalendarEvents(maxResultsPerCalendar);
    return defaultEvents.map(e => ({ ...e, reviewerName: 'Default', reviewerId: 0 }));
  }

  // Fetch all calendars in parallel, filter by event prefix
  const results = await Promise.all(
    calendarSources.map(async ({ calendarId, reviewerName, reviewerId, eventPrefix }) => {
      const events = await getUpcomingCalendarEvents(maxResultsPerCalendar, calendarId);
      const filtered = eventPrefix
        ? events.filter(e => e.summary.toLowerCase().startsWith(eventPrefix.toLowerCase()))
        : events;
      return filtered.map(e => ({ ...e, reviewerName, reviewerId }));
    })
  );

  // Flatten and sort by start time
  return results.flat().sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
}
