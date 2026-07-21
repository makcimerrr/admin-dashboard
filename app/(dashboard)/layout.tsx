import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { AppTabs } from '@/components/app-tabs';
import { BottomNav } from '@/components/bottom-nav';
import { AssistantBubble } from '@/components/assistant/assistant-bubble';
import { redirect } from 'next/navigation';
import { resolveUser } from '@/lib/api/with-auth';
import { isAdminRole } from '@/lib/nav-apps';
import { UserAccessProvider } from '@/contexts/user-access-context';
import type React from 'react';

// Dashboard authentifié : rendu à la demande (jamais prérendu au build).
// Évite d'exécuter l'auth/DB pendant le build de l'image Docker.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // ===============================
  // 1. Résolution unifiée Stack / Authentik (rôle + permission planning ;
  //    les comptes Authentik lisent leurs accès dans la table locale `users`).
  // ===============================
  const user = await resolveUser();

  // ===============================
  // 3. Pas de session détectée → rediriger vers login
  // ===============================
  if (!user) {
    redirect('/login');
  }

  // ===============================
  // 3 bis. Garde d'accès par provider :
  //   - Authentik (étudiants + staff) : accès autorisé (admin OU non-admin).
  //   - Stack Auth (Google / GitHub / e-mail-mdp) : RÉSERVÉ aux admins.
  //     Un non-admin via Stack est bloqué (les étudiants passent par Authentik).
  // ===============================
  if (user.provider === 'stack' && !isAdminRole(user.role)) {
    redirect('/access-denied');
  }

  // ===============================
  // 4. Layout principal
  // ===============================
  const isStudent = !isAdminRole(user.role);

  // Accès unifié exposé aux Client Components (pages planning/settings…) :
  // remplace useUser() de Stack, qui renvoie null pour les comptes Authentik.
  const access = {
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    role: user.role,
    planningPermission: user.planningPermission,
    provider: user.provider,
  };

  // Étudiant : shell minimal (juste le header pour le menu/déconnexion). La
  // navigation est la navbar PARTAGÉE z01-student-nav (sidebar desktop / bottom
  // mobile, rendue dans la landing) — identique sur hub/émargement/01deck. On
  // réserve l'espace : padding gauche (sidebar desktop) / bas (barre mobile).
  if (isStudent) {
    return (
      <UserAccessProvider value={access}>
        <div className="fixed inset-0 flex flex-col overflow-hidden">
          <SiteHeader />
          <div className="flex flex-1 flex-col min-h-0 overflow-auto">{children}</div>
        </div>
      </UserAccessProvider>
    );
  }

  // Admin : shell complet (sidebar + onglets + bottom-nav).
  return (
    <UserAccessProvider value={access}>
      <div className="fixed inset-0 flex overflow-hidden">
        <AppSidebar user={user} />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <SiteHeader />
          <AppTabs />
          <div className="flex flex-1 flex-col min-h-0 overflow-auto pb-14 md:pb-0">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {children}
            </div>
          </div>
        </div>
        <BottomNav user={user} />
        {(user.role === 'Admin' || user.role === 'Super Admin') && (
          <AssistantBubble userId={user.email} />
        )}
      </div>
    </UserAccessProvider>
  );
}
