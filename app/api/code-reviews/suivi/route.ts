import { NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { getAllForSuivi } from '@/lib/db/services/groupStatuses';

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  try {
    const rows = await getAllForSuivi();
    return NextResponse.json({ success: true, rows });
  } catch (error) {
    console.error('Error fetching suivi rows:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
