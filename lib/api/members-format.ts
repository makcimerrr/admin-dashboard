import { getUserRole, getUserPlanningPermission } from '@/lib/stack-helpers';

export type AuthMethod = 'google' | 'password' | 'sso' | 'autre';

/** DTO Stack brut (POST invite, réponse Stack pour formatMember). */
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

/** DTO fusionné renvoyé par la liste (clé canonique = email). */
export interface MergedMemberDTO {
  email: string;
  displayName: string | null;
  role: string;
  planningPermission: string;
  sources: { stack: boolean; local: boolean };
  stackId?: string;
  authMethod: AuthMethod;
  signedUpAt: string | null;
  lastActiveAt: string | null;
  isPending: boolean;
}

export function toDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  try {
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

export function extractOauthProviders(user: any): string[] {
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

/**
 * Normalise un libellé de rôle vers la forme canonique {Admin, Super Admin, user}.
 * Tolère la casse / variantes stockées localement (ex. "admin", "ADMIN").
 */
export function normalizeRole(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return 'user';
  const lower = v.toLowerCase();
  if (lower === 'super admin' || lower === 'superadmin' || lower === 'super_admin') return 'Super Admin';
  if (lower === 'admin') return 'Admin';
  if (lower === 'user') return 'user';
  return v;
}

/** Normalise la permission planning vers {editor, reader}. */
export function normalizePermission(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase() === 'editor' ? 'editor' : 'reader';
}
