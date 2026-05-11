import type { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { apiError } from './response';

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  planningPermission: string;
}

type Handler<Ctx> = (req: NextRequest, ctx: Ctx & { user: AuthedUser }) => Promise<NextResponse>;

async function resolveUser(): Promise<AuthedUser | null> {
  const stackUser = await stackServerApp.getUser();
  if (stackUser) {
    return {
      id: stackUser.id,
      email: stackUser.primaryEmail ?? '',
      name: stackUser.displayName ?? stackUser.primaryEmail ?? '',
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
    return {
      id: session.user.id ?? '',
      email: session.user.email,
      name: session.user.name ?? session.user.email,
      role: groups.includes('authentik Admins') ? 'Admin' : 'user',
      planningPermission: 'reader',
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
