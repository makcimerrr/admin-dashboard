import { NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { getUpcomingCalendarEvents, isCalendarConfigured } from '@/lib/services/googleCalendar';

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const configured = isCalendarConfigured();
  if (!configured) {
    return NextResponse.json({ success: true, configured: false, events: [] });
  }

  try {
    const events = await getUpcomingCalendarEvents();
    return NextResponse.json({ success: true, configured: true, events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
