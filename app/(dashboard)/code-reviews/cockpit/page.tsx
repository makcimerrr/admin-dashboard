'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import { PILL } from '@/lib/status-pills';
import { cn } from '@/lib/utils';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  ArrowRight,
  Check,
  Pencil,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PromoCockpit {
  promoId: string;
  promoName: string;
  auditsThisWeek: number;
  auditsLastWeek: number;
  auditsTotal: number;
  trend: number[];
  pending: number;
  awaitingResponse: number;
  stuck: number;
  noCaptain: number;
  noDiscord: number;
  weeklyTarget: number;
}

interface Cockpit {
  promos: PromoCockpit[];
  totals: { auditsThisWeek: number; auditsLastWeek: number; pending: number; stuck: number; weeklyTarget: number };
  weekStarts: string[];
}

export default function CockpitPage() {
  const [data, setData] = useState<Cockpit | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/code-reviews/cockpit');
      const d = await res.json();
      if (d.success) setData(d);
      else toast.error(d.error || 'Erreur de chargement.');
    } catch {
      toast.error('Impossible de charger le cockpit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = data?.totals;
  const weekDelta = totals ? totals.auditsThisWeek - totals.auditsLastWeek : 0;

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={Gauge}
        title="Cockpit Code Reviews"
        description="Surveiller et faire progresser le nombre de CR, par promotion."
      />

      {/* Global tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="CR cette semaine" loading={loading}
          value={totals?.auditsThisWeek ?? 0}
          hint={totals ? <WeekDelta delta={weekDelta} /> : null}
        />
        <Tile label="Objectif hebdo (total)" loading={loading} value={totals?.weeklyTarget ?? 0} tone="blue" />
        <Tile label="En attente d'audit" loading={loading} value={totals?.pending ?? 0} tone="amber" />
        <Tile label="Capitaines bloqués" loading={loading} value={totals?.stuck ?? 0} tone={totals && totals.stuck > 0 ? 'rose' : 'emerald'} />
      </div>

      {loading ? (
        <LoadingCard height="lg" />
      ) : !data || data.promos.length === 0 ? (
        <EmptyState icon={Gauge} title="Aucune promotion active" />
      ) : (
        <div className="grid gap-3">
          {data.promos.map((p) => (
            <PromoRow key={p.promoId} promo={p} onTargetSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, hint, tone, loading }: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'blue' | 'amber' | 'rose' | 'emerald'; loading?: boolean;
}) {
  const toneText: Record<string, string> = {
    blue: 'text-primary',
    amber: 'text-warning',
    rose: 'text-destructive',
    emerald: 'text-success',
  };
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      {loading ? (
        <div className="h-7 w-14 mt-1 bg-muted rounded animate-pulse" />
      ) : (
        <div className="flex items-baseline gap-2 mt-1">
          <p className={cn('text-xl md:text-2xl font-bold tabular-nums', tone && toneText[tone])}>{value}</p>
          {hint}
        </div>
      )}
    </Card>
  );
}

function WeekDelta({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-muted-foreground inline-flex items-center"><Minus className="h-3 w-3" /></span>;
  const up = delta > 0;
  return (
    <span className={cn('text-xs inline-flex items-center gap-0.5', up ? 'text-success' : 'text-destructive')}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{delta}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-0.5 h-8" title={`8 dernières semaines : ${values.join(', ')}`}>
      {values.map((v, i) => (
        <div
          key={i}
          className={cn('w-2 rounded-sm', i === values.length - 1 ? 'bg-primary' : 'bg-primary/30')}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function PromoRow({ promo, onTargetSaved }: { promo: PromoCockpit; onTargetSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(String(promo.weeklyTarget));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const v = Number(target);
    if (!Number.isFinite(v) || v < 0) {
      toast.error('Objectif invalide.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/code-reviews/cockpit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoId: promo.promoId, weeklyTarget: v }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success('Objectif mis à jour.');
        setEditing(false);
        onTargetSaved();
      } else {
        toast.error(d.error || 'Erreur.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  const hasTarget = promo.weeklyTarget > 0;
  const pct = hasTarget ? Math.min(100, Math.round((promo.auditsThisWeek / promo.weeklyTarget) * 100)) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">{promo.promoName}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {promo.stuck > 0 && (
              <Badge variant="outline" className={cn(PILL.rose, 'gap-1')}>
                <AlertTriangle className="h-3 w-3" />
                {promo.stuck} bloqué{promo.stuck > 1 ? 's' : ''}
              </Badge>
            )}
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
              <Link href={`/code-reviews/${promo.promoId}`}>
                Auditer <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
          {/* Cette semaine + objectif */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">{promo.auditsThisWeek}</span>
              <span className="text-xs text-muted-foreground">CR cette semaine</span>
              <WeekDelta delta={promo.auditsThisWeek - promo.auditsLastWeek} />
            </div>
            {/* Objectif éditable */}
            <div className="mt-1 flex items-center gap-2">
              {editing ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="h-7 w-20 text-xs"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setTarget(String(promo.weeklyTarget)); } }}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-success" />}
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {hasTarget ? `Objectif : ${promo.weeklyTarget}/sem` : 'Définir un objectif'}
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            {hasTarget && (
              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-full max-w-[180px]">
                <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-success' : 'bg-primary')} style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>

          {/* Tendance */}
          <div className="flex flex-col items-start gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">8 sem.</span>
            <Sparkline values={promo.trend} />
          </div>

          {/* Pipeline */}
          <Metric label="En attente" value={promo.pending} />
          <Metric
            label="Bloqués ≥7j"
            value={promo.stuck}
            icon={<Clock className="h-3 w-3" />}
            tone={promo.stuck > 0 ? 'rose' : undefined}
          />
          <Metric label="Total CR" value={promo.auditsTotal} />
        </div>

        {/* Bloqueurs */}
        {(promo.noCaptain > 0 || promo.noDiscord > 0) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
            {promo.noCaptain > 0 && (
              <Badge variant="outline" className={PILL.amber}>{promo.noCaptain} sans capitaine</Badge>
            )}
            {promo.noDiscord > 0 && (
              <Badge variant="outline" className={PILL.amber}>{promo.noDiscord} sans Discord</Badge>
            )}
            <Link href="/code-reviews/suivi" className="text-primary hover:underline">→ Suivi</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon?: React.ReactNode; tone?: 'rose' }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">{icon}{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', tone === 'rose' && value > 0 && 'text-destructive')}>{value}</p>
    </div>
  );
}
