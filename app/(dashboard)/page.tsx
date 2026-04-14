import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import OverviewWidget from '@/components/widgets/overview-widget';
import RecentActivityWidget from '@/components/widgets/recent-activity-widget';
import CodeReviewsWidget from '@/components/widgets/code-reviews-widget';
import { MyTasksWidgetServer } from '@/components/hub/MyTasksWidgetServer';
import { AlertBlock } from '@/components/dashboard/alert-block';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export default function DashboardPage() {
  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
      <PageHeader
        icon={BarChart3}
        title="Tableau de Bord"
        description="Vue d'ensemble de votre plateforme"
        badge={
          <Badge variant="outline" className="text-sm px-3 py-1 hidden sm:inline-flex">
            zone01normandie.org
          </Badge>
        }
      />

      {/* Quick Stats - Only active students */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <OverviewWidget />
      </Suspense>

      {/* Tasks (prominent) + Code Reviews */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-[350px] w-full" />}>
            <MyTasksWidgetServer />
          </Suspense>
        </div>
        <Suspense fallback={<Skeleton className="h-[350px] w-full" />}>
          <CodeReviewsWidget />
        </Suspense>
      </div>

      {/* 3 Alert Blocks */}
      <div className="grid gap-4 md:grid-cols-3">
        <AlertBlock title="Emargement" category="emargement" />
        <AlertBlock title="Code Reviews" category="code-reviews" />
        <AlertBlock title="Retards" category="retards" />
      </div>

      {/* Recent Activity */}
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <RecentActivityWidget />
      </Suspense>
    </div>
  );
}
