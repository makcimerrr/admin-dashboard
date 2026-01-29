import { AppSidebar } from './app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { DashboardBreadcrumb } from '../(dashboard)/get-breadcrumb-items';
import { stackServerApp } from '@/lib/stack-server';
import { unifiedSignOut } from '@/lib/unified-signout';
import { redirect } from 'next/navigation';

export default async function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const stackUser = await stackServerApp.getUser();

  // Protection : rediriger vers /login si pas connecté
  if (!stackUser) {
    redirect('/login');
  }

  async function logout() {
    'use server';
    await unifiedSignOut();
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

  console.log('✅ Home - Utilisateur connecté:', user.email, 'Role:', user.role);

  return (
    <SidebarProvider>
      <AppSidebar user={user} logout={logout} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {/*<Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>*/}
            <DashboardBreadcrumb />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
