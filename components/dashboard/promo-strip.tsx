'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, GraduationCap, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Promo {
  eventId: number | string;
  key: string;
  title: string;
  dates: { start: string; end: string };
}

interface PendingGroup {
  promoId: string;
  priority: 'urgent' | 'warning' | 'normal';
}

interface PromoMetrics {
  total: number;
  urgent: number;
}

/**
 * Compact promo strip for the dashboard hub. Each card shows the promo key,
 * a small date range, and a pending-audits badge (live from /api/code-reviews/pending).
 */
export function PromoStrip() {
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [metrics, setMetrics] = useState<Map<string, PromoMetrics>>(new Map());

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/promotions/active').then((r) => r.json()),
      fetch('/api/code-reviews/pending').then((r) => r.json()),
    ])
      .then(([promoRes, pendingRes]) => {
        if (!active) return;
        if (promoRes?.success) setPromos(promoRes.promotions ?? []);
        else setPromos([]);

        if (pendingRes?.success && Array.isArray(pendingRes.pending)) {
          const map = new Map<string, PromoMetrics>();
          for (const g of pendingRes.pending as PendingGroup[]) {
            const cur = map.get(g.promoId) ?? { total: 0, urgent: 0 };
            cur.total += 1;
            if (g.priority === 'urgent') cur.urgent += 1;
            map.set(g.promoId, cur);
          }
          setMetrics(map);
        }
      })
      .catch(() => {
        if (active) setPromos([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4" />
          Promotions
        </CardTitle>
        <CardDescription>
          Cliquez pour voir la progression et auditer ses groupes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {promos === null ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-md" />
            ))
          ) : promos.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">
              Aucune promotion active.
            </p>
          ) : (
            promos.map((promo) => {
              const m = metrics.get(String(promo.eventId));
              const total = m?.total ?? 0;
              const urgent = m?.urgent ?? 0;
              return (
                <Link
                  key={promo.eventId}
                  href={`/code-reviews/${promo.eventId}`}
                  className="block group"
                >
                  <div
                    className={cn(
                      'h-full p-3 rounded-md border transition-colors',
                      urgent > 0
                        ? 'border-destructive/30 hover:bg-destructive/5'
                        : 'hover:border-primary/50 hover:bg-muted/30',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {promo.key}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>
                            {new Date(promo.dates.start).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                            {' – '}
                            {new Date(promo.dates.end).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>

                    {total > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                        {urgent > 0 && (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 bg-destructive/15 text-destructive border-destructive/30"
                          >
                            {urgent} urgent{urgent > 1 ? 's' : ''}
                          </Badge>
                        )}
                        <span className="text-muted-foreground">
                          {total} en attente
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
