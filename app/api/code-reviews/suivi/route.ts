import { NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { getAllForSuivi, deleteGroupStatus, archiveGroupStatus, cleanOrphanGroupStatuses } from '@/lib/db/services/groupStatuses';

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  try {
    await cleanOrphanGroupStatuses(); // Nettoyage automatique
    const rows = await getAllForSuivi();
    return NextResponse.json({ success: true, rows });
  } catch (error) {
    console.error('Error fetching suivi rows:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

  try {
    await deleteGroupStatus(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group status:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

  try {
    await archiveGroupStatus(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error archiving group status:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
