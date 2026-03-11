import { NextResponse } from 'next/server';
import { cleanOrphanGroupStatuses } from '@/lib/db/services/groupStatuses';

export async function GET() {
  try {
    const deletedCount = await cleanOrphanGroupStatuses();
    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error('Error cleaning orphan group statuses:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

