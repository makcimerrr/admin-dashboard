import { Analytics } from '@vercel/analytics/react';
import {
  SidebarInset,
  SidebarProvider
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { auth } from '@/lib/auth';
import type React from 'react';
import { SessionProvider } from "next-auth/react";

export default async function DashboardLayout({
                                                children
                                              }: {
  children: React.ReactNode;
}) {
  let session = await auth();
  let user = session?.user;

  return (
      <SidebarProvider>
        <AppSidebar variant="inset" user={user} />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2"><SessionProvider>{children}</SessionProvider></div>
          </div>
          <Analytics />
        </SidebarInset>
      </SidebarProvider>
  );
}

