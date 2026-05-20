'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Users, CheckCircle2, AlertCircle, GraduationCap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type TrackRow = { track: string; completed: number; total: number; percentage: number };
type DelayRow = { level: string; count: number };

interface KpiStripProps {
  promoKey: string;
  activePromos: number;
}

export function AnalyticsKpiStrip({ promoKey, activePromos }: KpiStripProps) {
  const [tracks, setTracks] = useState<TrackRow[] | null>(null);
  const [delays, setDelays] = useState<DelayRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/analytics/track-comparison?promo=${promoKey}`).then((r) => r.json()),
      fetch(`/api/analytics/delay-distribution?promo=${promoKey}`).then((r) => r.json()),
    ])
      .then(([trackRes, delayRes]) => {
        if (cancelled) return;
        if (trackRes?.success) setTracks(trackRes.tracks);
        if (delayRes?.success) setDelays(delayRes.delayLevels);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [promoKey]);

  const total = tracks?.[0]?.total ?? 0;
  const validatedCount = delays?.find((d) => d.level === 'Validé')?.count ?? 0;
  const lateCount = delays?.find((d) => d.level === 'en retard')?.count ?? 0;
  const totalCounted = delays?.reduce((acc, d) => acc + d.count, 0) ?? 0;
  const validationRate = totalCounted > 0 ? Math.round((validatedCount / totalCounted) * 100) : 0;
  const lateRate = totalCounted > 0 ? Math.round((lateCount / totalCounted) * 100) : 0;

  const tiles = [
    {
      label: 'Étudiants',
      value: total,
      icon: Users,
      tone: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Taux de validation',
      value: `${validationRate}%`,
      icon: CheckCircle2,
      tone: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'En retard',
      value: `${lateRate}%`,
      icon: AlertCircle,
      tone: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: promoKey === 'all' ? 'Promos actives' : 'Promo',
      value: promoKey === 'all' ? activePromos : '1',
      icon: GraduationCap,
      tone: 'text-violet-700 dark:text-violet-400',
      bg: 'bg-violet-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Card key={tile.label} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate">{tile.label}</span>
              <div className={cn('p-1.5 rounded-md shrink-0', tile.bg)}>
                <Icon className={cn('h-3.5 w-3.5', tile.tone)} />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-xl md:text-2xl font-bold mt-1 tabular-nums">{tile.value}</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
