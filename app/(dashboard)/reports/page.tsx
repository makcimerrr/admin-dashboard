import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import AlertsPanel from '@/components/alerts-panel';
import { AlertTriangle, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/10 rounded-xl">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Rapports & Alertes</h1>
            <p className="text-muted-foreground">
              Surveillance des situations nécessitant une attention particulière
            </p>
          </div>
        </div>
      </div>

      {/* Alerts Panel - Full Mode */}
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <AlertsPanel compact={false} />
      </Suspense>

      {/* Additional Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              À propos des Alertes
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground space-y-2">
              <p>
                Le système d'alertes surveille automatiquement la progression des étudiants et
                identifie les situations nécessitant une intervention.
              </p>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-xs">
                    <strong>Critique:</strong> Action immédiate requise
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-xs">
                    <strong>Élevée:</strong> Attention nécessaire sous 48h
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-xs">
                    <strong>Moyenne:</strong> À surveiller cette semaine
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-xs">
                    <strong>Basse:</strong> Information générale
                  </span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-green-600" />
              Actions Recommandées
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground space-y-2">
              <p>
                Pour chaque alerte, des actions spécifiques sont recommandées:
              </p>
              <ul className="mt-3 space-y-1 text-xs list-disc list-inside">
                <li>Contacter les étudiants en retard pour identifier les blocages</li>
                <li>Assigner les étudiants sans groupe à des équipes disponibles</li>
                <li>Planifier des sessions de révision pour les parcours incomplets</li>
                <li>Organiser un suivi individuel pour les cas critiques</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
