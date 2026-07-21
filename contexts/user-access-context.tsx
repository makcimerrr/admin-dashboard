'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface UserAccess {
  email: string;
  name: string;
  image: string | null;
  role: string;
  planningPermission: string;
  provider: 'stack' | 'authentik';
}

const UserAccessContext = createContext<UserAccess | null>(null);

export function UserAccessProvider({
  value,
  children,
}: {
  value: UserAccess;
  children: ReactNode;
}) {
  return <UserAccessContext.Provider value={value}>{children}</UserAccessContext.Provider>;
}

/**
 * Accès unifié (Stack ou Authentik) résolu côté serveur par le layout dashboard.
 * À utiliser à la place de `useUser()` de Stack pour role / planningPermission :
 * les comptes Authentik n'ont pas de session Stack et retomberaient sinon sur
 * les valeurs par défaut ('user' / 'reader').
 */
export function useUserAccess(): UserAccess | null {
  return useContext(UserAccessContext);
}
