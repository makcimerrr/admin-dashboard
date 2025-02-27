import { AppSidebar } from '../app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { DashboardBreadcrumb } from '@/components/get-breadcrumb-items';
import { auth, signOut } from '@/lib/auth';

export default async function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth(); // 🚀 Récupérer les données côté serveur
  async function logout() {
    'use server';
    await signOut();
  }

  const user = session?.user || null;
  return (
    <SidebarProvider>
      <AppSidebar user={user} logout={logout} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <DashboardBreadcrumb />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
