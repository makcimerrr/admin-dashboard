import { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import AlertsPanel from '@/components/alerts-panel';
import OverviewWidget from '@/components/widgets/overview-widget';
import RecentActivityWidget from '@/components/widgets/recent-activity-widget';
import TrackProgressWidget from '@/components/widgets/track-progress-widget';
import { MyTasksWidgetServer } from '@/components/hub/MyTasksWidgetServer';
import {
  BarChart3,
  Users,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  Calendar,
  Bell,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord</h1>
            <p className="text-muted-foreground">
              Bienvenue sur le dashboard administratif de Zone01 Normandie
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          zone01normandie.org
        </Badge>
      </div>

      {/* Quick Stats - Overview Widget */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <OverviewWidget />
      </Suspense>

      {/* Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accès Rapide</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/students">
                <GraduationCap className="h-4 w-4 mr-2" />
                Voir tous les étudiants
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promotions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/promos/status">
                <BarChart3 className="h-4 w-4 mr-2" />
                Statut des promotions
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analytics</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                Voir les statistiques
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes</CardTitle>
            <Bell className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full border-orange-200 hover:bg-orange-50 dark:border-orange-900 dark:hover:bg-orange-950/30">
              <Link href="/reports">
                <Bell className="h-4 w-4 mr-2 text-orange-600" />
                Voir les alertes
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Widgets Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Alerts Section - Compact Mode */}
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
            <AlertsPanel compact maxAlerts={5} />
          </Suspense>
        </div>

        {/* My Tasks Widget */}
        <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
          <MyTasksWidgetServer />
        </Suspense>
      </div>

      {/* Activity & Track Progress Widgets */}
      <div className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <RecentActivityWidget />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <TrackProgressWidget />
        </Suspense>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              À propos de Zone01
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Zone01 Normandie est une école de programmation innovante utilisant la pédagogie par
              projet.
            </p>
            <p>
              Les étudiants progressent à travers différents troncs : Golang, Javascript, Rust et
              Java.
            </p>
            <Button asChild variant="link" className="px-0">
              <Link href="https://zone01normandie.org" target="_blank" rel="noopener noreferrer">
                En savoir plus
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Système de Suivi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Ce dashboard permet de suivre en temps réel la progression de tous les étudiants.</p>
            <p>
              Les alertes automatiques vous informent des situations nécessitant une attention
              particulière.
            </p>
            <Button asChild variant="link" className="px-0">
              <Link href="/promos/status">
                Voir le statut des promotions
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
