import { Analytics } from '@vercel/analytics/react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { stackServerApp } from '@/lib/stack-server';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options'; // ton NextAuth config
import type React from 'react';

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // ===============================
  // 1. Essayer Stack Auth
  // ===============================
  const stackUser = await stackServerApp.getUser();

  let user: {
    id: string;
    email: string;
    name: string;
    image?: string;
    role: string;
    planningPermission: string;
  } | null = null;

  if (stackUser) {
    // Utilisateur Stack Auth trouvé
    user = {
      id: stackUser.id,
      email: stackUser.primaryEmail ?? '',
      name: stackUser.displayName ?? stackUser.primaryEmail ?? '',
      image: stackUser.profileImageUrl ?? undefined,
      role:
        stackUser.serverMetadata?.role ||
        stackUser.clientReadOnlyMetadata?.role ||
        stackUser.clientMetadata?.role ||
        'user',
      planningPermission:
        stackUser.serverMetadata?.planningPermission ||
        stackUser.clientReadOnlyMetadata?.planningPermission ||
        stackUser.clientMetadata?.planningPermission ||
        'reader'
    };

    console.log('✅ Dashboard - Stack Auth utilisateur:', user.email, '- Rôle:', user.role);
  } else {
    // ===============================
    // 2. Essayer NextAuth / Authentik
    // ===============================
    const session = await getServerSession(authOptions);

    if (session?.user?.email) {
      // Déterminer le rôle à partir des groupes Authentik
      const groups: string[] = (session.user.groups || []) as string[];
      const isAdmin = groups.includes('authentik Admins');

      user = {
        id: session.user.id ?? '',
        email: session.user.email ?? '',
        name: session.user.name ?? session.user.email ?? '',
        image: session.user.image ?? undefined,
        role: isAdmin ? 'Admin' : 'user',
        planningPermission: 'reader' // par défaut pour Authentik
      };

      console.log(
        '✅ Dashboard - NextAuth/Authentik utilisateur connecté:',
        user.email,
        'Role:',
        user.role
      );
    }
  }

  // ===============================
  // 3. Pas de session détectée → rediriger vers login
  // ===============================
  if (!user) {
    console.log(
      '⛔ Dashboard - Aucun utilisateur connecté, redirection vers /login'
    );
    redirect('/login');
  }

  // ===============================
  // 4. Protection des routes selon le rôle
  // ===============================
  if (user.role !== 'Admin' && user.role !== 'Super Admin') {
    console.log('⛔ Accès refusé - Redirection vers /non-admin');
    redirect('/non-admin');
  }

  // ===============================
  // 5. Layout principal
  // ===============================
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
        <Analytics />
      </SidebarInset>
    </SidebarProvider>
  );
}
