'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck,
  ArrowRight,
  Calendar,
  Users,
  AlertCircle,
  Bell,
  Gauge,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PromoCardSkeleton } from '@/components/code-reviews/skeletons';

interface PendingStats {
  total: number;
  urgent: number;
  warning: number;
  normal: number;
  avgDaysPending: number;
}

interface Promo {
  eventId: number | string;
  key: string;
  title: string;
  dates: { start: string; end: string };
}

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function CodeReviewsPage() {
  const [pendingStats, setPendingStats] = useState<PendingStats | null>(null);
  const [promotions, setPromotions] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [pendingRes, promosRes] = await Promise.all([
        safeFetch<{ success: boolean; stats: PendingStats }>(
          '/api/code-reviews/pending',
        ),
        safeFetch<{ success: boolean; promotions: Promo[] }>(
          '/api/promotions/active',
        ),
      ]);
      if (!mounted) return;

      if (pendingRes?.success) setPendingStats(pendingRes.stats);
      if (promosRes?.success) setPromotions(promosRes.promotions ?? []);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={ClipboardCheck}
        title="Code Reviews"
        description="Sélectionnez une promotion pour gérer ses audits, ou explorez les vues transverses."
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="En attente"
          value={pendingStats?.total ?? '—'}
          icon={ClipboardCheck}
          loading={loading}
        />
        <StatTile
          label="Urgents"
          value={pendingStats?.urgent ?? '—'}
          icon={AlertCircle}
          tone="urgent"
          loading={loading}
        />
        <StatTile
          label="À traiter"
          value={pendingStats?.warning ?? '—'}
          icon={Bell}
          tone="warning"
          loading={loading}
        />
        <StatTile
          label="Délai moyen"
          value={
            pendingStats?.avgDaysPending != null
              ? `${pendingStats.avgDaysPending} j`
              : '—'
          }
          icon={Calendar}
          loading={loading}
        />
      </div>

      {/* Promotions grid — primary entry point */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Promotions
          </CardTitle>
          <CardDescription>
            Sélectionnez une promotion pour voir sa progression et auditer ses
            groupes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <PromoCardSkeleton key={i} />
                ))
              : promotions.map((promo) => (
                  <Link
                    key={promo.eventId}
                    href={`/code-reviews/${promo.eventId}`}
                    className="block group"
                  >
                    <div className="p-4 rounded-lg border hover:border-primary hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold group-hover:text-primary transition-colors">
                            {promo.key}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {promo.title}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(promo.dates.start).toLocaleDateString(
                            'fr-FR',
                            { day: 'numeric', month: 'short' },
                          )}{' '}
                          -{' '}
                          {new Date(promo.dates.end).toLocaleDateString(
                            'fr-FR',
                            { day: 'numeric', month: 'short', year: 'numeric' },
                          )}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-cutting views — secondary nav */}
      <div className="grid gap-3 sm:grid-cols-2">
        <NavCard
          href="/code-reviews/suivi"
          icon={Bell}
          title="Suivi des audits"
          description="État des relances Discord, audits réalisés, et export PDF — toutes promos confondues."
        />
        <NavCard
          href="/code-reviews/cockpit"
          icon={Gauge}
          title="Cockpit CR"
          description="Surveiller et faire progresser le nombre de code-reviews : objectifs, tendance, capitaines bloqués."
        />
        <NavCard
          href="/code-reviews/audit-reports"
          icon={FileText}
          title="Comptes-rendus d'audit"
          description="Auditeurs (pairs) par projet audité — demander leur compte-rendu via Discord."
        />
      </div>

      <p className="text-xs text-muted-foreground px-1">
        <span className="font-medium">Info :</span> seuls les groupes avec
        statut{' '}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 mx-1">
          finished
        </Badge>{' '}
        peuvent être audités. Les étudiants en perdition sont exclus des
        statistiques.
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: 'urgent' | 'warning';
  loading?: boolean;
}) {
  const toneClass =
    tone === 'urgent'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-warning'
        : 'text-muted-foreground';
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-muted rounded animate-pulse mt-1" />
      ) : (
        <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      )}
    </Card>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="p-4 hover:border-primary hover:bg-muted/30 transition-colors">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold group-hover:text-primary transition-colors">
                {title}
              </p>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
