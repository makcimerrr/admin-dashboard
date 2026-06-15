import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api/with-auth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { getStackServerApp } from '@/lib/stack-server';
import { getUserRole, getUserPlanningPermission } from '@/lib/stack-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ROLES = ['Admin', 'Super Admin', 'user'] as const;
const VALID_PERMISSIONS = ['editor', 'reader'] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface MemberDTO {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  planningPermission: string;
  hasPassword: boolean;
  oauthProviders: string[];
  signedUpAt: string | null;
  lastActiveAt: string | null;
}

function toDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  try {
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

function extractOauthProviders(user: any): string[] {
  // Le SDK expose les comptes connectés via oauthProviders / connectedAccounts selon version.
  const providers: unknown =
    user.oauthProviders ?? user.connectedAccounts ?? user.connected_accounts;
  if (Array.isArray(providers)) {
    return providers
      .map((p: any) => (typeof p === 'string' ? p : p?.id ?? p?.provider ?? p?.type))
      .filter((p: unknown): p is string => typeof p === 'string');
  }
  return [];
}

export function formatMember(user: any): MemberDTO {
  return {
    id: user.id,
    email: user.primaryEmail ?? null,
    displayName: user.displayName ?? null,
    role: getUserRole(user),
    planningPermission: getUserPlanningPermission(user),
    hasPassword: Boolean(user.hasPassword),
    oauthProviders: extractOauthProviders(user),
    signedUpAt: toDate(user.signedUpAt),
    lastActiveAt: toDate(user.lastActiveAt),
  };
}

export const GET = withAdmin(async () => {
  try {
    const app = await getStackServerApp();
    const users = await app.listUsers();

    const members: MemberDTO[] = (users ?? []).map(formatMember);
    members.sort((a, b) => {
      const ka = (a.displayName || a.email || '').toLowerCase();
      const kb = (b.displayName || b.email || '').toLowerCase();
      return ka.localeCompare(kb);
    });

    return apiSuccess({ members });
  } catch (error) {
    console.error('GET /api/members error:', error);
    return apiError('INTERNAL_ERROR', 'Erreur lors de la récupération des membres');
  }
});

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return apiError('BAD_REQUEST', 'Corps de requête invalide');
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const displayName =
      typeof body.displayName === 'string' && body.displayName.trim()
        ? body.displayName.trim()
        : undefined;
    const role = body.role;
    const planningPermission = body.planningPermission;

    if (!email || !EMAIL_RE.test(email)) {
      return apiError('BAD_REQUEST', 'Adresse email invalide');
    }
    if (!VALID_ROLES.includes(role)) {
      return apiError('BAD_REQUEST', `Rôle invalide (attendu: ${VALID_ROLES.join(', ')})`);
    }
    if (!VALID_PERMISSIONS.includes(planningPermission)) {
      return apiError(
        'BAD_REQUEST',
        `Permission planning invalide (attendu: ${VALID_PERMISSIONS.join(', ')})`,
      );
    }

    const app = await getStackServerApp();

    // Vérifier si l'email existe déjà
    const existing = await app.listUsers({ query: email }).catch(() => null);
    if (Array.isArray(existing)) {
      const match = existing.find(
        (u: any) => (u.primaryEmail ?? '').toLowerCase() === email.toLowerCase(),
      );
      if (match) {
        return apiError('CONFLICT', 'Un membre avec cet email existe déjà');
      }
    }

    const metadata = { role, planningPermission };

    let created: any;
    try {
      created = await app.createUser({
        primaryEmail: email,
        primaryEmailAuthEnabled: true,
        otpAuthEnabled: true,
        displayName,
        serverMetadata: metadata,
        clientReadOnlyMetadata: metadata,
      });
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (/exist|already|duplicate|conflict/i.test(msg)) {
        return apiError('CONFLICT', 'Un membre avec cet email existe déjà');
      }
      throw err;
    }

    // Envoi de l'invitation (email pour définir le mot de passe ou se connecter via OAuth)
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const callbackUrl = `${base}/handler/sign-in`;
    try {
      await app.sendSignInInvitationEmail(email, callbackUrl);
    } catch (err) {
      console.error('sendSignInInvitationEmail error:', err);
      // L'utilisateur est créé ; on remonte un avertissement non bloquant.
      return apiSuccess(
        {
          member: formatMember(created),
          warning: "Membre créé mais l'email d'invitation n'a pas pu être envoyé.",
        },
        { status: 201 },
      );
    }

    return apiSuccess({ member: formatMember(created) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/members error:', error);
    return apiError('INTERNAL_ERROR', 'Erreur lors de la création du membre');
  }
});
