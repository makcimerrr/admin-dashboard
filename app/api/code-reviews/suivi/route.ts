import {
  getAllForSuivi,
  deleteGroupStatus,
  archiveGroupStatus,
  cleanOrphanGroupStatuses,
} from '@/lib/db/services/groupStatuses';
import { apiError, apiSuccess, withAuth, withErrorHandler } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async () => {
    await cleanOrphanGroupStatuses();
    const rows = await getAllForSuivi();
    return apiSuccess({ rows });
  }),
);

/**
 * Accepts either { id: number } or { ids: number[] }.
 * Returns { ids } on success — always an array, so the client can branch
 * uniformly on bulk vs single.
 */
function readIds(body: unknown): number[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as { id?: unknown; ids?: unknown };
  if (Array.isArray(b.ids)) {
    const arr = b.ids.filter((x): x is number => typeof x === 'number');
    return arr.length > 0 ? arr : null;
  }
  if (typeof b.id === 'number') return [b.id];
  return null;
}

export const DELETE = withErrorHandler(
  withAuth(async (request) => {
    const ids = readIds(await request.json());
    if (!ids) return apiError('BAD_REQUEST', 'ID manquant');
    await Promise.all(ids.map((id) => deleteGroupStatus(id)));
    return apiSuccess({ ids });
  }),
);

export const PATCH = withErrorHandler(
  withAuth(async (request) => {
    const ids = readIds(await request.json());
    if (!ids) return apiError('BAD_REQUEST', 'ID manquant');
    await Promise.all(ids.map((id) => archiveGroupStatus(id)));
    return apiSuccess({ ids });
  }),
);
