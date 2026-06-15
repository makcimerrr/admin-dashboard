import { NextRequest } from 'next/server';
import { withAdmin } from '@/lib/api/with-auth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { db } from '@/lib/db/config';
import { students } from '@/lib/db/schema/students';
import { eq } from 'drizzle-orm';
import { CACHE_TAGS, invalidate } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/student/[id]/archive
 * Body: { archived: boolean }
 *
 * Archive ou désarchive manuellement un apprenant (DISTINCT de la perdition).
 * Un archivé est exclu des effectifs et des stats. Réservé aux admins
 * (Stack Auth OU Authentik via withAdmin → resolveUser).
 */
export const PATCH = withAdmin<RouteCtx>(async (req: NextRequest, ctx) => {
  try {
    const { id } = await ctx.params;
    const studentId = parseInt(id, 10);
    if (isNaN(studentId)) {
      return apiError('BAD_REQUEST', 'ID étudiant invalide');
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.archived !== 'boolean') {
      return apiError('BAD_REQUEST', 'Le champ "archived" (boolean) est requis');
    }

    const updated = await db
      .update(students)
      .set({ archived: body.archived })
      .where(eq(students.id, studentId))
      .returning({ id: students.id, archived: students.archived });

    if (updated.length === 0) {
      return apiError('NOT_FOUND', 'Étudiant non trouvé');
    }

    invalidate(CACHE_TAGS.widgetsOverview, CACHE_TAGS.codeReviewsStats);

    return apiSuccess({
      student: updated[0],
      message: body.archived ? 'Apprenant archivé' : 'Apprenant désarchivé',
    });
  } catch (error) {
    console.error('Erreur lors de l\'archivage:', error);
    return apiError('INTERNAL_ERROR', 'Erreur serveur');
  }
});
