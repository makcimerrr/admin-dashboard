import { NextResponse } from 'next/server';
import { withPlanningEditor } from '@/lib/api/with-auth';
import {
  getRotationById,
  updateRotation,
  deleteRotation,
  sanitizeWeeks,
} from '@/lib/db/services/rotations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

// PUT /api/rotations/[id] — met à jour { name?, weeks?, description? }.
export const PUT = withPlanningEditor<RouteCtx>(async (request, context) => {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Id invalide' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    const fields: { name?: string; weeks?: NonNullable<ReturnType<typeof sanitizeWeeks>>; description?: string | null } = {};
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 100) {
        return NextResponse.json({ error: 'Nom invalide (1-100 caractères)' }, { status: 400 });
      }
      fields.name = name;
    }
    if (body.weeks !== undefined) {
      const weeks = sanitizeWeeks(body.weeks);
      if (!weeks) {
        return NextResponse.json({ error: 'Semaines invalides (1 à 12 semaines attendues)' }, { status: 400 });
      }
      fields.weeks = weeks;
    }
    if (body.description !== undefined) {
      fields.description =
        typeof body.description === 'string' ? body.description.slice(0, 500) : null;
    }
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    const rotation = await updateRotation(id, fields);
    if (!rotation) return NextResponse.json({ error: 'Roulement introuvable' }, { status: 404 });
    return NextResponse.json(rotation);
  } catch (error: any) {
    if (/unique|duplicate/i.test(String(error?.message))) {
      return NextResponse.json({ error: 'Un roulement porte déjà ce nom' }, { status: 409 });
    }
    console.error('PUT /api/rotations/[id] error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du roulement' }, { status: 500 });
  }
});

// DELETE /api/rotations/[id]
export const DELETE = withPlanningEditor<RouteCtx>(async (_request, context) => {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Id invalide' }, { status: 400 });

    const existing = await getRotationById(id);
    if (!existing) return NextResponse.json({ error: 'Roulement introuvable' }, { status: 404 });

    await deleteRotation(id);
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error('DELETE /api/rotations/[id] error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du roulement' }, { status: 500 });
  }
});
