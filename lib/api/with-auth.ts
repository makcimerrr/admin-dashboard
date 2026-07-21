import type { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getUserAccessByEmail } from '@/lib/db/services/users';
import { normalizeRole, normalizePermission } from './members-format';
import { isAdminRole } from '@/lib/nav-apps';
import { apiError } from './response';

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: string;
  planningPermission: string;
  provider: 'stack' | 'authentik';
  /** Login Zone01 (preferred_username Authentik) si dispo — sert à requêter
   *  les données intra/01-edu de l'utilisateur. Absent pour les comptes Stack. */
  login?: string;
}

type Handler<Ctx> = (req: NextRequest, ctx: Ctx & { user: AuthedUser }) => Promise<NextResponse>;

export async function resolveUser(): Promise<AuthedUser | null> {
  const stackUser = await stackServerApp.getUser();
  if (stackUser) {
    return {
      id: stackUser.id,
      email: stackUser.primaryEmail ?? '',
      name: stackUser.displayName ?? stackUser.primaryEmail ?? '',
      image: stackUser.profileImageUrl ?? undefined,
      provider: 'stack',
      role:
        stackUser.serverMetadata?.role ||
        stackUser.clientReadOnlyMetadata?.role ||
        stackUser.clientMetadata?.role ||
        'user',
      planningPermission:
        stackUser.serverMetadata?.planningPermission ||
        stackUser.clientReadOnlyMetadata?.planningPermission ||
        stackUser.clientMetadata?.planningPermission ||
        'reader',
    };
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const groups: string[] = (session.user.groups || []) as string[];
    const groupAdmin = groups.includes('Developers') || groups.includes('authentik Admins');
    // Les comptes Authentik n'ont pas de metadata Stack : leurs accès fins
    // (rôle éventuel + permission planning) vivent dans la table locale `users`,
    // gérée par la page /members.
    const local = await getUserAccessByEmail(session.user.email).catch(() => null);
    return {
      id: session.user.id ?? '',
      email: session.user.email,
      name: session.user.name ?? session.user.email,
      image: session.user.image ?? undefined,
      provider: 'authentik',
      role: groupAdmin || isAdminRole(normalizeRole(local?.role)) ? 'Admin' : 'user',
      planningPermission: normalizePermission(local?.planningPermission),
      // preferred_username Authentik = login Zone01.
      login: (session.user as { username?: string }).username,
    };
  }
  return null;
}

/**
 * Wraps a route handler to ensure the caller is authenticated.
 * Returns 401 with the standard error envelope if not.
 *
 *     export const GET = withAuth(async (req, { user }) => {
 *       return apiSuccess({ hello: user.email });
 *     });
 */
export function withAuth<Ctx = unknown>(handler: Handler<Ctx>) {
  return async (req: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    const user = await resolveUser();
    if (!user) return apiError('UNAUTHENTICATED', 'Non authentifié');
    return handler(req, { ...(ctx as Ctx), user });
  };
}

/**
 * Same as withAuth but additionally requires Admin / Super Admin role.
 */
export function withAdmin<Ctx = unknown>(handler: Handler<Ctx>) {
  return withAuth<Ctx>(async (req, ctx) => {
    if (ctx.user.role !== 'Admin' && ctx.user.role !== 'Super Admin') {
      return apiError('FORBIDDEN', 'Accès réservé aux administrateurs');
    }
    return handler(req, ctx);
  });
}
