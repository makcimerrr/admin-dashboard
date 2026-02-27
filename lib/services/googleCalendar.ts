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

export async function getUpcomingCalendarEvents(maxResults = 50): Promise<CalendarEvent[]> {
  if (!isCalendarConfigured()) return [];

  try {
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
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
    console.error('Google Calendar error:', error);
    return [];
  }
}
