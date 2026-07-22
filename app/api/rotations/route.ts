import { NextResponse } from 'next/server';
import { withPlanningAccess, withPlanningEditor } from '@/lib/api/with-auth';
import {
  listRotations,
  createRotation,
  sanitizeWeeks,
  seedDefaultRotationsIfEmpty,
} from '@/lib/db/services/rotations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/rotations — liste les roulements (seed Standard/Piscine au 1er appel).
export const GET = withPlanningAccess(async () => {
  try {
    await seedDefaultRotationsIfEmpty();
    const items = await listRotations();
    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/rotations error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des roulements' }, { status: 500 });
  }
});

// POST /api/rotations — crée un roulement { name, weeks, description? }.
export const POST = withPlanningEditor(async (request) => {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'Nom invalide (1-100 caractères)' }, { status: 400 });
    }
    const weeks = sanitizeWeeks(body?.weeks);
    if (!weeks) {
      return NextResponse.json({ error: 'Semaines invalides (1 à 12 semaines attendues)' }, { status: 400 });
    }
    const description =
      typeof body?.description === 'string' ? body.description.slice(0, 500) : null;

    const rotation = await createRotation(name, weeks, description);
    return NextResponse.json(rotation, { status: 201 });
  } catch (error: any) {
    if (/unique|duplicate/i.test(String(error?.message))) {
      return NextResponse.json({ error: 'Un roulement porte déjà ce nom' }, { status: 409 });
    }
    console.error('POST /api/rotations error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du roulement' }, { status: 500 });
  }
});
