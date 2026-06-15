import { NextRequest } from 'next/server';
import { withAdmin } from '@/lib/api/with-auth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { getStackServerApp } from '@/lib/stack-server';
import { updateUserAccessByEmail, deleteUserByEmail } from '@/lib/db/services/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ROLES = ['Admin', 'Super Admin', 'user'] as const;
const VALID_PERMISSIONS = ['editor', 'reader'] as const;

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * Cherche le user Stack par email (match exact, case-insensitive sur primaryEmail).
 * Retourne null si introuvable côté Stack.
 */
async function findStackUserByEmail(
  app: Awaited<ReturnType<typeof getStackServerApp>>,
  email: string,
) {
  const list = await app
    .listUsers({ query: email, includeAnonymous: true })
    .catch(() => null);
  if (!Array.isArray(list)) return null;
  const target = email.toLowerCase();
  return (
    list.find((u: any) => (u.primaryEmail ?? '').toLowerCase() === target) ?? null
  );
}

export const PATCH = withAdmin<RouteCtx>(async (req: NextRequest, ctx) => {
  try {
    const { id } = await ctx.params;
    if (!id) return apiError('BAD_REQUEST', 'Identifiant manquant');
    const email = decodeURIComponent(id).trim();
    if (!email) return apiError('BAD_REQUEST', 'Email manquant');

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
    const trimmedName =
      typeof displayName === 'string' ? displayName.trim() : undefined;

    const app = await getStackServerApp();

    // --- Maj Stack (si une entrée existe pour cet email) ---
    let stackUpdated = false;
    const stackUser = await findStackUserByEmail(app, email);
    if (stackUser) {
      const prevServer = (stackUser.serverMetadata ?? {}) as Record<string, unknown>;
      const prevClient = (stackUser.clientReadOnlyMetadata ?? {}) as Record<string, unknown>;

      const nextRole = role ?? prevServer.role ?? prevClient.role ?? 'user';
      const nextPermission =
        planningPermission ??
        prevServer.planningPermission ??
        prevClient.planningPermission ??
        'reader';

      await stackUser.setServerMetadata({
        ...prevServer,
        role: nextRole,
        planningPermission: nextPermission,
      });
      await stackUser.setClientReadOnlyMetadata({
        ...prevClient,
        role: nextRole,
        planningPermission: nextPermission,
      });
      if (trimmedName !== undefined) {
        await stackUser.update({ displayName: trimmedName });
      }
      stackUpdated = true;
    }

    // --- Maj locale (si une ligne existe pour cet email) ---
    const localUpdated = await updateUserAccessByEmail(email, {
      role,
      planningPermission,
      name: trimmedName,
    }).catch((e) => {
      console.error('updateUserAccessByEmail error:', e);
      return false;
    });

    if (!stackUpdated && !localUpdated) {
      return apiError('NOT_FOUND', 'Membre introuvable');
    }

    return apiSuccess({
      email,
      sources: { stack: stackUpdated, local: localUpdated },
    });
  } catch (error) {
    console.error('PATCH /api/members/[id] error:', error);
    return apiError('INTERNAL_ERROR', 'Erreur lors de la mise à jour du membre');
  }
});

export const DELETE = withAdmin<RouteCtx>(async (_req: NextRequest, ctx) => {
  try {
    const { id } = await ctx.params;
    if (!id) return apiError('BAD_REQUEST', 'Identifiant manquant');
    const email = decodeURIComponent(id).trim();
    if (!email) return apiError('BAD_REQUEST', 'Email manquant');

    // Garde-fou : on ne peut pas se supprimer soi-même.
    if (email.toLowerCase() === (ctx.user.email ?? '').toLowerCase()) {
      return apiError('BAD_REQUEST', 'Impossible de supprimer son propre compte');
    }

    const app = await getStackServerApp();

    // --- Suppression Stack (si trouvé par email) ---
    let stackDeleted = false;
    const stackUser = await findStackUserByEmail(app, email);
    if (stackUser) {
      await stackUser.delete();
      stackDeleted = true;
    }

    // --- Suppression locale ---
    const localDeleted = await deleteUserByEmail(email).catch((e) => {
      console.error('deleteUserByEmail error:', e);
      return false;
    });

    if (!stackDeleted && !localDeleted) {
      return apiError('NOT_FOUND', 'Membre introuvable');
    }

    return apiSuccess({
      deleted: true,
      email,
      sources: { stack: stackDeleted, local: localDeleted },
    });
  } catch (error) {
    console.error('DELETE /api/members/[id] error:', error);
    return apiError('INTERNAL_ERROR', 'Erreur lors de la suppression du membre');
  }
});
