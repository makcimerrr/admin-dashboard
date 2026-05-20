'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Flag,
  CheckCircle2,
  ClipboardCheck,
  ArrowRight,
  Users,
} from 'lucide-react';
import { trackDotStyle } from '@/lib/track-colors';
import { cn } from '@/lib/utils';

interface PendingGroup {
  groupId: string;
  projectName: string;
  track: string;
  promoId: string;
  promoName: string;
  members: { login: string; isDropout: boolean }[];
  activeMembers: number;
  priority: 'urgent' | 'warning' | 'normal';
  priorityScore: number;
  priorityReasons: string[];
  membersNeverAudited: number;
}

interface PendingStats {
  total: number;
  urgent: number;
  warning: number;
  normal: number;
  avgScore: number;
}

type FilterKey = 'urgent' | 'warning' | 'all';

const MAX_ROWS = 8;

export function ActionInbox() {
  const [pending, setPending] = useState<PendingGroup[] | null>(null);
  const [stats, setStats] = useState<PendingStats | null>(null);
  const [filter, setFilter] = useState<FilterKey>('urgent');

  useEffect(() => {
    let active = true;
    fetch('/api/code-reviews/pending')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data?.success) {
          setPending(data.pending ?? []);
          setStats(data.stats ?? null);
        } else {
          setPending([]);
        }
      })
      .catch(() => {
        if (active) setPending([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const loading = pending === null;

  // Auto-select the most relevant tab when data lands
  useEffect(() => {
    if (!stats) return;
    if (filter === 'urgent' && stats.urgent === 0 && stats.warning > 0) {
      setFilter('warning');
    } else if (
      filter === 'urgent' &&
      stats.urgent === 0 &&
      stats.warning === 0 &&
      stats.total > 0
    ) {
      setFilter('all');
    }
  }, [stats]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    if (!pending) return [];
    const filtered = filter === 'all' ? pending : pending.filter((p) => p.priority === filter);
    // Already sorted server-side by priority + score, take top N
    return filtered.slice(0, MAX_ROWS);
  }, [pending, filter]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" />
              Actions à traiter
            </CardTitle>
            <CardDescription>
              Groupes en attente d&apos;audit, triés par priorité.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
            <FilterPill
              active={filter === 'urgent'}
              onClick={() => setFilter('urgent')}
              loading={loading}
              count={stats?.urgent}
              tone="urgent"
              icon={AlertCircle}
              label="Urgents"
            />
            <FilterPill
              active={filter === 'warning'}
              onClick={() => setFilter('warning')}
              loading={loading}
              count={stats?.warning}
              tone="warning"
              icon={Flag}
              label="À traiter"
            />
            <FilterPill
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              loading={loading}
              count={stats?.total}
              label="Tous"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5">
        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={filter === 'urgent' ? 'Aucun urgent' : filter === 'warning' ? 'Aucun à traiter' : 'Tout est traité'}
            description={
              filter === 'all'
                ? 'Aucun groupe en attente d\'audit.'
                : 'Les autres groupes apparaissent dans les autres onglets.'
            }
            size="compact"
          />
        ) : (
          <>
            {rows.map((p) => (
              <ActionRow key={`${p.promoId}-${p.groupId}`} group={p} />
            ))}
            {pending && filterCount(pending, filter) > MAX_ROWS && (
              <div className="pt-2">
                <Button variant="ghost" size="sm" asChild className="w-full text-xs">
                  <Link href="/code-reviews/all">
                    Voir tout ({filterCount(pending, filter)})
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function filterCount(pending: PendingGroup[], filter: FilterKey): number {
  if (filter === 'all') return pending.length;
  return pending.filter((p) => p.priority === filter).length;
}

function FilterPill({
  active,
  onClick,
  loading,
  count,
  tone,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  loading?: boolean;
  count?: number;
  tone?: 'urgent' | 'warning';
  icon?: React.ElementType;
  label: string;
}) {
  const toneClass =
    tone === 'urgent'
      ? 'text-red-700 dark:text-red-400'
      : tone === 'warning'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-foreground';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors',
        active
          ? 'bg-background shadow-sm border'
          : 'hover:bg-background/60 text-muted-foreground',
      )}
    >
      {Icon && <Icon className={cn('h-3 w-3', active && toneClass)} />}
      <span className={cn(active && toneClass)}>{label}</span>
      {loading ? (
        <Skeleton className="h-3.5 w-5 rounded" />
      ) : (
        <span className={cn('text-[10px] tabular-nums opacity-70', active && toneClass)}>
          {count ?? 0}
        </span>
      )}
    </button>
  );
}

function ActionRow({ group }: { group: PendingGroup }) {
  const isUrgent = group.priority === 'urgent';
  const isWarning = group.priority === 'warning';
  const rowTint = isUrgent
    ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
    : isWarning
      ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
      : 'hover:bg-muted/30';
  const dotIcon = isUrgent ? (
    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
  ) : isWarning ? (
    <Flag className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
  ) : (
    <ClipboardCheck className="h-4 w-4 text-muted-foreground shrink-0" />
  );

  const reasonSummary = group.priorityReasons[0] ?? null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md border transition-colors',
        rowTint,
      )}
    >
      {dotIcon}

      {/* Track dot */}
      <div
        className="w-1.5 h-7 rounded-full shrink-0"
        style={trackDotStyle(group.track)}
        title={group.track}
        aria-hidden
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{group.projectName}</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal shrink-0">
            {group.promoName}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 min-w-0">
          <Users className="h-3 w-3 shrink-0" />
          <span className="tabular-nums shrink-0">{group.activeMembers}</span>
          {reasonSummary && (
            <>
              <span className="opacity-50 shrink-0">•</span>
              <span className="truncate">{reasonSummary}</span>
            </>
          )}
        </div>
      </div>

      <Button
        size="sm"
        variant={isUrgent ? 'default' : 'outline'}
        className="h-7 text-xs shrink-0"
        asChild
      >
        <Link
          href={`/code-reviews/${group.promoId}/audit?groupId=${group.groupId}&project=${encodeURIComponent(
            group.projectName,
          )}&track=${encodeURIComponent(group.track)}`}
        >
          Auditer
          <ArrowRight className="h-3 w-3 ml-1" />
        </Link>
      </Button>
    </div>
  );
}
