import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api/with-auth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { getStackServerApp } from '@/lib/stack-server';
import { getUserRole, getUserPlanningPermission } from '@/lib/stack-helpers';
import { listAllUsers, type LocalUserListItem } from '@/lib/db/services/users';
import {
  formatMember,
  extractOauthProviders,
  toDate,
  normalizeRole,
  normalizePermission,
  type AuthMethod,
  type MergedMemberDTO,
} from '@/lib/api/members-format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ROLES = ['Admin', 'Super Admin', 'user'] as const;
const VALID_PERMISSIONS = ['editor', 'reader'] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET = withAdmin(async () => {
  try {
    const app = await getStackServerApp();

    // 1) Users Stack — pagination complète (listUsers renvoie une page à la fois).
    type PageUser = Awaited<ReturnType<typeof app.listUsers>>[number];
    const stackUsers: PageUser[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 500; guard++) {
      const page = await app.listUsers({ cursor, limit: 200, orderBy: 'signedUpAt' });
      stackUsers.push(...page);
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }

    // 2) Users locaux (Authentik/SSO + legacy).
    let localUsers: LocalUserListItem[] = [];
    try {
      localUsers = await listAllUsers();
    } catch (e) {
      console.error('listAllUsers error (fusion partielle Stack uniquement):', e);
    }

    // 3) Fusion dédupliquée par email en minuscule.
    const byEmail = new Map<string, MergedMemberDTO>();

    // 3a) Stack en premier (source d'autorité pour role/permission/dates).
    for (const u of stackUsers) {
      const email = (u.primaryEmail ?? '').trim();
      if (!email) continue;
      const key = email.toLowerCase();
      const oauth = extractOauthProviders(u);
      const hasGoogle = oauth.some((p) => p.toLowerCase() === 'google');
      const hasPassword = Boolean((u as any).hasPassword);
      const signedUpAt = toDate(u.signedUpAt);
      const lastActiveAt = toDate(u.lastActiveAt);

      let authMethod: AuthMethod = 'autre';
      if (hasGoogle) authMethod = 'google';
      else if (hasPassword) authMethod = 'password';

      byEmail.set(key, {
        email,
        displayName: u.displayName ?? null,
        role: normalizeRole(getUserRole(u)),
        planningPermission: normalizePermission(getUserPlanningPermission(u)),
        sources: { stack: true, local: false },
        stackId: u.id,
        authMethod,
        signedUpAt,
        lastActiveAt,
        // Invitation en attente : aucun moyen d'auth ni connexion connue.
        isPending: !hasPassword && oauth.length === 0 && !lastActiveAt,
      });
    }

    // 3b) Users locaux : fusion ou ajout.
    for (const lu of localUsers) {
      const email = (lu.email ?? '').trim();
      if (!email) continue;
      const key = email.toLowerCase();
      const existing = byEmail.get(key);

      if (existing) {
        // Déjà présent via Stack : on enrichit seulement les sources + fallback displayName.
        existing.sources.local = true;
        if (!existing.displayName) existing.displayName = lu.name ?? null;
        continue;
      }

      // Uniquement local (ex. Vivien Frebourg, Authentik/SSO).
      // SSO = pas de mot de passe ; sinon mot de passe.
      const authMethod: AuthMethod = lu.hasPassword ? 'password' : 'sso';
      byEmail.set(key, {
        email,
        displayName: lu.name ?? null,
        role: normalizeRole(lu.role),
        planningPermission: normalizePermission(lu.planningPermission),
        sources: { stack: false, local: true },
        authMethod,
        signedUpAt: null,
        lastActiveAt: null,
        // SSO considéré non-pending (compte provisionné côté IdP).
        isPending: false,
      });
    }

    const members = Array.from(byEmail.values());
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
