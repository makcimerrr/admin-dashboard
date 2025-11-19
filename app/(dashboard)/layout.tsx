import { Analytics } from '@vercel/analytics/react';
import {
  SidebarInset,
  SidebarProvider
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { stackServerApp } from '@/lib/stack-server';
import { redirect } from 'next/navigation';
import type React from 'react';

export default async function DashboardLayout({
                                                children
                                              }: {
  children: React.ReactNode;
}) {
  const stackUser = await stackServerApp.getUser();

  // Protection: rediriger vers /login si pas connecté
  if (!stackUser) {
    redirect('/login');
  }

  const user = {
    id: stackUser.id,
    email: stackUser.primaryEmail,
    name: stackUser.displayName,
    image: stackUser.profileImageUrl,
    // Essayer Server Metadata en premier, puis Client Read-Only, puis Client
    role: stackUser.serverMetadata?.role ||
          stackUser.clientReadOnlyMetadata?.role ||
          stackUser.clientMetadata?.role ||
          'user',
    planningPermission: stackUser.serverMetadata?.planningPermission ||
                       stackUser.clientReadOnlyMetadata?.planningPermission ||
                       stackUser.clientMetadata?.planningPermission ||
                       'reader',
  };

  console.log('✅ Dashboard - Utilisateur connecté:', user.email, 'Role:', user.role);

  // Protection des routes : seuls les Admin et Super Admin ont accès au dashboard
  if (user.role !== 'Admin' && user.role !== 'Super Admin') {
    console.log('⛔ Accès refusé - Redirection vers /non-admin');
    redirect('/non-admin');
  }

  return (
      <SidebarProvider>
        <AppSidebar variant="inset" user={user} />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">{children}</div>
          </div>
          <Analytics />
        </SidebarInset>
      </SidebarProvider>
  );
}

