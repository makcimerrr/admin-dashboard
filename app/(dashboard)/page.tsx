import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import OverviewWidget from '@/components/widgets/overview-widget';
import RecentActivityWidget from '@/components/widgets/recent-activity-widget';
import CodeReviewsWidget from '@/components/widgets/code-reviews-widget';
import { MyTasksWidgetServer } from '@/components/hub/MyTasksWidgetServer';
import { AlertBlock } from '@/components/dashboard/alert-block';
import { NonAdminLanding } from '@/components/non-admin-landing';
import { LoadingCard } from '@/components/ui/loading-card';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { stackServerApp } from '@/lib/stack-server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { isAdminRole } from '@/lib/nav-apps';

async function getCurrentUser() {
  const stackUser = await stackServerApp.getUser();
  if (stackUser) {
    return {
      name: stackUser.displayName ?? stackUser.primaryEmail ?? '',
      role:
        stackUser.serverMetadata?.role ||
        stackUser.clientReadOnlyMetadata?.role ||
        stackUser.clientMetadata?.role ||
        'user',
    };
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const groups: string[] = (session.user.groups || []) as string[];
    return {
      name: session.user.name ?? session.user.email ?? '',
      role: groups.includes('authentik Admins') ? 'Admin' : 'user',
    };
  }
  return null;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!isAdminRole(user?.role)) {
    return <NonAdminLanding userName={user?.name} role={user?.role} />;
  }

  return (
    <div className="page-container flex flex-col gap-4 md:gap-5 p-4 md:p-6">
      <PageHeader
        icon={BarChart3}
        title="Tableau de Bord"
        description="Vue d'ensemble de votre plateforme"
        badge={
          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
            zone01rouennormandie.org
          </Badge>
        }
      />

      <Suspense fallback={<LoadingCard height="sm" count={2} columns={2} />}>
        <OverviewWidget />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<LoadingCard height="lg" />}>
            <MyTasksWidgetServer />
          </Suspense>
        </div>
        <Suspense fallback={<LoadingCard height="lg" />}>
          <CodeReviewsWidget />
        </Suspense>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AlertBlock title="Émargement" category="emargement" />
        <AlertBlock title="Code Reviews" category="code-reviews" />
        <AlertBlock title="Retards" category="retards" />
      </div>

      <Suspense fallback={<LoadingCard height="lg" />}>
        <RecentActivityWidget />
      </Suspense>
    </div>
  );
}
