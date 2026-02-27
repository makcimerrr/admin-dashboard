import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { updateSlot, unlinkSlot } from '@/lib/db/services/groupStatuses';

export async function POST(request: NextRequest) {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  try {
    const body = await request.json();
    const { groupStatusId, action, slotDate, slotEventId, slotAttendeeEmail } = body;

    if (!groupStatusId) {
      return NextResponse.json({ error: 'groupStatusId requis' }, { status: 400 });
    }

    if (action === 'unlink') {
      await unlinkSlot(Number(groupStatusId));
      return NextResponse.json({ success: true });
    }

    if (!slotDate || !slotEventId) {
      return NextResponse.json({ error: 'slotDate et slotEventId requis' }, { status: 400 });
    }

    await updateSlot(Number(groupStatusId), new Date(slotDate), slotEventId, slotAttendeeEmail ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error linking slot:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
