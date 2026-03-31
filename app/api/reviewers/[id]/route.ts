import { NextRequest, NextResponse } from 'next/server';
import { getReviewerById, updateReviewer, deleteReviewer } from '@/lib/db/services/reviewers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reviewer = await getReviewerById(parseInt(id, 10));
    if (!reviewer) {
      return NextResponse.json({ error: 'Reviewer non trouvé' }, { status: 404 });
    }
    return NextResponse.json({ success: true, reviewer });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, planningUrl, tracks, calendarId, eventPrefix, excludedPromos, isActive } = body;

    const updated = await updateReviewer(parseInt(id, 10), {
      ...(name !== undefined && { name }),
      ...(planningUrl !== undefined && { planningUrl }),
      ...(tracks !== undefined && { tracks }),
      ...(calendarId !== undefined && { calendarId }),
      ...(eventPrefix !== undefined && { eventPrefix }),
      ...(excludedPromos !== undefined && { excludedPromos }),
      ...(isActive !== undefined && { isActive }),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Reviewer non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, reviewer: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteReviewer(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
