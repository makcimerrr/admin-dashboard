'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Alert, AlertCategory } from '@/lib/types/alerts';
import type { LucideIcon } from 'lucide-react';

interface AlertBlockProps {
  title: string;
  icon: LucideIcon;
  category: AlertCategory;
  iconColor?: string;
  emptyText?: string;
  maxAlerts?: number;
}

export function AlertBlock({ title, icon: Icon, category, iconColor = 'text-muted-foreground', emptyText = 'Aucune alerte', maxAlerts = 5 }: AlertBlockProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setAlerts(data.alerts.filter((a: Alert) => a.category === category).slice(0, maxAlerts));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, maxAlerts]);

  if (loading) return <Skeleton className="h-[200px] w-full rounded-lg" />;

  const severityColors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-400',
  };

  return (
    <Card className="border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
          {alerts.length > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {alerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">{emptyText}</p>
        ) : (
          <div className="space-y-1.5">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${severityColors[alert.severity] ?? 'bg-gray-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug truncate">{alert.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
