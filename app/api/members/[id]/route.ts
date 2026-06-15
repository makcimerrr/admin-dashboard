import { NextRequest } from 'next/server';
import { withAdmin } from '@/lib/api/with-auth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { getStackServerApp } from '@/lib/stack-server';
import { formatMember } from '../route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ROLES = ['Admin', 'Super Admin', 'user'] as const;
const VALID_PERMISSIONS = ['editor', 'reader'] as const;

type RouteCtx = { params: Promise<{ id: string }> };

export const PATCH = withAdmin<RouteCtx>(async (req: NextRequest, ctx) => {
  try {
    const { id } = await ctx.params;
    if (!id) return apiError('BAD_REQUEST', 'Identifiant manquant');

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return apiError('BAD_REQUEST', 'Corps de requête invalide');
    }

    const { role, planningPermission, displayName } = body;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return apiError('BAD_REQUEST', `Rôle invalide (attendu: ${VALID_ROLES.join(', ')})`);
    }
    if (planningPermission !== undefined && !VALID_PERMISSIONS.includes(planningPermission)) {
      return apiError(
        'BAD_REQUEST',
        `Permission planning invalide (attendu: ${VALID_PERMISSIONS.join(', ')})`,
      );
    }
    if (displayName !== undefined && typeof displayName !== 'string') {
      return apiError('BAD_REQUEST', 'displayName invalide');
    }

    const app = await getStackServerApp();
    const user = await app.getUser(id);
    if (!user) return apiError('NOT_FOUND', 'Membre introuvable');

    // Fusion avec les métadonnées existantes
    const prevServer = (user.serverMetadata ?? {}) as Record<string, unknown>;
    const prevClient = (user.clientReadOnlyMetadata ?? {}) as Record<string, unknown>;

    const nextRole = role ?? prevServer.role ?? prevClient.role ?? 'user';
    const nextPermission =
      planningPermission ?? prevServer.planningPermission ?? prevClient.planningPermission ?? 'reader';

    const mergedServer = { ...prevServer, role: nextRole, planningPermission: nextPermission };
    const mergedClient = { ...prevClient, role: nextRole, planningPermission: nextPermission };

    await user.setServerMetadata(mergedServer);
    await user.setClientReadOnlyMetadata(mergedClient);

    if (displayName !== undefined) {
      await user.update({ displayName: displayName.trim() });
    }

    // Relecture pour renvoyer l'état à jour
    const updated = await app.getUser(id);
    return apiSuccess({ member: formatMember(updated ?? user) });
  } catch (error) {
    console.error('PATCH /api/members/[id] error:', error);
    return apiError('INTERNAL_ERROR', 'Erreur lors de la mise à jour du membre');
  }
});

export const DELETE = withAdmin<RouteCtx>(async (_req: NextRequest, ctx) => {
  try {
    const { id } = await ctx.params;
    if (!id) return apiError('BAD_REQUEST', 'Identifiant manquant');

    if (id === ctx.user.id) {
      return apiError('BAD_REQUEST', 'Impossible de supprimer son propre compte');
    }

    const app = await getStackServerApp();
    const user = await app.getUser(id);
    if (!user) return apiError('NOT_FOUND', 'Membre introuvable');

    await user.delete();
    return apiSuccess({ deleted: true, id });
  } catch (error) {
    console.error('DELETE /api/members/[id] error:', error);
    return apiError('INTERNAL_ERROR', 'Erreur lors de la suppression du membre');
  }
});
