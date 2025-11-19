import type { StackServerApp } from "@stackframe/stack";

/**
 * Type pour l'utilisateur Stack formaté avec role et planningPermission
 */
export type FormattedStackUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string;
  planningPermission: string;
};

/**
 * Extrait le rôle de l'utilisateur depuis les métadonnées
 * Ordre de priorité : Server Metadata > Client Read-Only > Client Metadata
 */
export function getUserRole(user: Awaited<ReturnType<typeof StackServerApp.prototype.getUser>>): string {
  if (!user) return 'user';

  return user.serverMetadata?.role ||
         user.clientReadOnlyMetadata?.role ||
         user.clientMetadata?.role ||
         'user';
}

/**
 * Extrait la permission planning de l'utilisateur depuis les métadonnées
 * Ordre de priorité : Server Metadata > Client Read-Only > Client Metadata
 */
export function getUserPlanningPermission(user: Awaited<ReturnType<typeof StackServerApp.prototype.getUser>>): string {
  if (!user) return 'reader';

  return user.serverMetadata?.planningPermission ||
         user.clientReadOnlyMetadata?.planningPermission ||
         user.clientMetadata?.planningPermission ||
         'reader';
}

/**
 * Formatte l'utilisateur Stack pour l'utiliser dans l'application
 */
export function formatStackUser(
  user: Awaited<ReturnType<typeof StackServerApp.prototype.getUser>>
): FormattedStackUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.primaryEmail,
    name: user.displayName,
    image: user.profileImageUrl,
    role: getUserRole(user),
    planningPermission: getUserPlanningPermission(user),
  };
}
