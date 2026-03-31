import { NextRequest, NextResponse } from 'next/server';
import { getAllReviewers, createReviewer } from '@/lib/db/services/reviewers';

export async function GET(request: NextRequest) {
  try {
    const includeInactive = request.nextUrl.searchParams.get('all') === 'true';
    const data = await getAllReviewers(!includeInactive);
    return NextResponse.json({ success: true, reviewers: data });
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, planningUrl, tracks, calendarId, eventPrefix, excludedPromos } = body;

    if (!name || !planningUrl) {
      return NextResponse.json({ error: 'name et planningUrl requis' }, { status: 400 });
    }

    const reviewer = await createReviewer({
      name,
      planningUrl,
      tracks: tracks || ['Golang', 'Javascript', 'Rust', 'Java'],
      calendarId: calendarId || null,
      eventPrefix: eventPrefix || null,
      excludedPromos: excludedPromos || [],
      isActive: true,
    });

    return NextResponse.json({ success: true, reviewer });
  } catch (error) {
    console.error('Error creating reviewer:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
