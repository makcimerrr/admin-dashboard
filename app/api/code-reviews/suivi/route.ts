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

export const DELETE = withErrorHandler(
  withAuth(async (request) => {
    const { id } = await request.json();
    if (!id) return apiError('BAD_REQUEST', 'ID manquant');
    await deleteGroupStatus(id);
    return apiSuccess({ id });
  }),
);

export const PATCH = withErrorHandler(
  withAuth(async (request) => {
    const { id } = await request.json();
    if (!id) return apiError('BAD_REQUEST', 'ID manquant');
    await archiveGroupStatus(id);
    return apiSuccess({ id });
  }),
);
