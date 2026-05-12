'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  Code2,
  Workflow,
  CheckCircle2,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  Zap,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackAccent, trackDotStyle } from '@/lib/track-colors';

interface PromoStatusDisplayProps {
  selectedPromo: string;
}

function percentageBadgeClass(pct: number): string {
  if (pct >= 80)
    return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400';
  if (pct >= 50)
    return 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400';
  return 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400';
}

function percentageRingClass(pct: number): string {
  if (pct >= 80) return 'text-emerald-500';
  if (pct >= 50) return 'text-amber-500';
  return 'text-red-500';
}

interface ProgressStats {
  totalStudents: number;
  onExpectedProject: number;
  percentage: number;
  offProjectStats: {
    ahead: number;
    late: number;
    specialty: number;
    validated: number;
    notValidated: number;
    other: number;
  };
  rustStats?: { total: number; onProject: number };
  javaStats?: { total: number; onProject: number };
}

// Loading skeleton
function PromoStatusSkeleton({ isAllPromos }: { isAllPromos: boolean }) {
  if (isAllPromos) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  );
}

// Progress ring component
function ProgressRing({
  percentage,
  size = 48,
  strokeWidth = 4
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn('transition-all duration-500', percentageRingClass(percentage))}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{percentage}%</span>
      </div>
    </div>
  );
}

// Compact tile for the "hors projet" breakdown row.
function OffProjectTile({
  show,
  label,
  value,
  icon: Icon,
  tone,
}: {
  show: boolean;
  label: string;
  value: number;
  icon: React.ElementType;
  tone: string;
}) {
  if (!show) return null;
  return (
    <div className={cn('p-2 rounded-lg text-center', tone)}>
      <Icon className="h-4 w-4 mx-auto mb-1" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}

// Theme-aware track card for the multi-choice (Rust / Java) view.
function TrackCard({
  track,
  project,
  stats,
}: {
  track: 'Rust' | 'Java';
  project: string | undefined;
  stats?: { total: number; onProject: number };
}) {
  const accent = trackAccent(track);
  const pct = stats ? Math.round((stats.onProject / Math.max(1, stats.total)) * 100) : 0;
  return (
    <div
      className="relative overflow-hidden p-4 rounded-xl border-2"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${accent} 6%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full" style={trackDotStyle(track)} />
          <span className="text-sm font-semibold" style={{ color: accent }}>
            Tronc {track}
          </span>
        </div>
        {stats && (
          <ProgressRing percentage={pct} size={40} strokeWidth={3} />
        )}
      </div>
      <h4 className="text-lg font-bold mb-2">{project || 'N/A'}</h4>
      {stats && (
        <div className="space-y-2">
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats.onProject} / {stats.total} étudiants
          </p>
        </div>
      )}
    </div>
  );
}

// Single promo view component
function SinglePromoView({
  project,
  stats,
  isLoading
}: {
  project: any;
  stats: ProgressStats | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <PromoStatusSkeleton isAllPromos={false} />;
  }

  // Formation terminée
  if (typeof project === 'string' && project.toLowerCase() === 'fin') {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30">
        <div className="p-3 rounded-xl bg-emerald-500/15">
          <Trophy className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            Formation Terminée
          </h3>
          <p className="text-sm text-muted-foreground">
            Tous les projets ont été complétés avec succès
          </p>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Validé
        </Badge>
      </div>
    );
  }

  // Projet simple
  if (typeof project === 'string') {
    return (
      <div className="space-y-4">
        {/* Project header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Code2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold truncate">{project}</h3>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Projet actuel
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Projet sur lequel les étudiants devraient travailler
            </p>
          </div>
        </div>

        {stats && (
          <>
            {/* Progress section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Main progress */}
              <div className="lg:col-span-2 p-4 bg-muted/30 rounded-xl border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Progression</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {stats.percentage}%
                  </span>
                </div>
                <Progress value={stats.percentage} className="h-3 mb-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{stats.onExpectedProject} sur le projet</span>
                  <span>{stats.totalStudents} au total</span>
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Sur le projet</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {stats.onExpectedProject}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Hors projet</span>
                  </div>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                    {stats.totalStudents - stats.onExpectedProject}
                  </p>
                </div>
              </div>
            </div>

            {/* Off-project breakdown */}
            {(stats.offProjectStats.ahead > 0 ||
              stats.offProjectStats.late > 0 ||
              stats.offProjectStats.specialty > 0 ||
              stats.offProjectStats.validated > 0 ||
              stats.offProjectStats.notValidated > 0) && (
              <div className="p-4 bg-muted/20 rounded-xl border">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Répartition des étudiants hors projet
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  <OffProjectTile
                    show={stats.offProjectStats.ahead > 0}
                    label="En avance"
                    value={stats.offProjectStats.ahead}
                    icon={TrendingUp}
                    tone="bg-blue-500/10 text-blue-700 dark:text-blue-400"
                  />
                  <OffProjectTile
                    show={stats.offProjectStats.late > 0}
                    label="En retard"
                    value={stats.offProjectStats.late}
                    icon={TrendingDown}
                    tone="bg-red-500/10 text-red-700 dark:text-red-400"
                  />
                  <OffProjectTile
                    show={stats.offProjectStats.specialty > 0}
                    label="Spécialité"
                    value={stats.offProjectStats.specialty}
                    icon={Zap}
                    tone="bg-orange-500/10 text-orange-700 dark:text-orange-400"
                  />
                  <OffProjectTile
                    show={stats.offProjectStats.validated > 0}
                    label="Validé"
                    value={stats.offProjectStats.validated}
                    icon={CheckCircle2}
                    tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  />
                  <OffProjectTile
                    show={stats.offProjectStats.notValidated > 0}
                    label="Non validé"
                    value={stats.offProjectStats.notValidated}
                    icon={AlertCircle}
                    tone="bg-rose-500/10 text-rose-700 dark:text-rose-400"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Multi-choice (Rust/Java)
  if (typeof project === 'object' && project !== null) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Workflow className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold">Tronc Multi-choix</h3>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Rust ou Java
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Les étudiants choisissent leur spécialisation
            </p>
          </div>
        </div>

        {/* Track cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrackCard
            track="Rust"
            project={project.rust}
            stats={stats?.rustStats}
          />
          <TrackCard
            track="Java"
            project={project.java}
            stats={stats?.javaStats}
          />
        </div>

        {/* Global progress */}
        {stats && (
          <div className="p-4 bg-muted/30 rounded-xl border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progression globale</span>
              <Badge
                variant="outline"
                className={cn('font-bold', percentageBadgeClass(stats.percentage))}
              >
                {stats.percentage}%
              </Badge>
            </div>
            <Progress value={stats.percentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.onExpectedProject} étudiants sur leur projet attendu sur {stats.totalStudents} au total
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border-2 border-dashed">
      <Code2 className="h-8 w-8 text-muted-foreground" />
      <p className="text-muted-foreground">
        Aucune information disponible pour cette promotion.
      </p>
    </div>
  );
}

// All promos view component
function AllPromosView({
  statusData,
  allStats,
  isLoading
}: {
  statusData: Record<string, any>;
  allStats: Record<string, ProgressStats>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <PromoStatusSkeleton isAllPromos={true} />;
  }

  const promos = Object.entries(statusData);

  return (
    <div className="space-y-2">
      {promos.map(([promoKey, project]) => {
        const stats = allStats[promoKey];
        const isFin = typeof project === 'string' && project.toLowerCase() === 'fin';
        const isMultiChoice = typeof project === 'object' && project !== null;

        return (
          <div
            key={promoKey}
            className={cn(
              'flex items-center gap-4 p-3 rounded-xl border transition-colors hover:bg-muted/30',
              isFin && 'bg-emerald-500/10 border-emerald-500/30',
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'p-2 rounded-lg',
                isFin ? 'bg-emerald-500/15' : 'bg-primary/10',
              )}
            >
              {isFin ? (
                <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : isMultiChoice ? (
                <Workflow className="h-5 w-5 text-primary" />
              ) : (
                <Code2 className="h-5 w-5 text-primary" />
              )}
            </div>

            {/* Promo name */}
            <div className="w-20 shrink-0">
              <span className="font-bold text-sm">{promoKey}</span>
            </div>

            {/* Project info */}
            <div className="flex-1 min-w-0">
              {isFin ? (
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Formation Terminée
                </span>
              ) : isMultiChoice ? (
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className="font-medium truncate"
                    style={{ color: trackAccent('Rust') }}
                  >
                    {project.rust}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span
                    className="font-medium truncate"
                    style={{ color: trackAccent('Java') }}
                  >
                    {project.java}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-medium truncate block">
                  {project}
                </span>
              )}
            </div>

            {/* Progress */}
            {!isFin && stats && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:block w-32">
                  <Progress value={stats.percentage} className="h-2" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {stats.onExpectedProject}/{stats.totalStudents}
                  </span>
                </div>
              </div>
            )}

            {/* Percentage badge */}
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 w-14 justify-center font-bold',
                isFin
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : stats
                    ? percentageBadgeClass(stats.percentage)
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {isFin ? '100%' : stats ? `${stats.percentage}%` : '-'}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

// Main component
const PromoStatusDisplay = ({ selectedPromo }: PromoStatusDisplayProps) => {
  const [statusData, setStatusData] = useState<Record<string, any>>({});
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [allProgressStats, setAllProgressStats] = useState<Record<string, ProgressStats>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadStatusData = async () => {
      try {
        const res = await fetch('/api/promos/status');
        const data = await res.json();
        if (data.success) {
          const map: Record<string, any> = {};
          for (const p of data.promos) {
            let project = p.currentProject;
            if (project) {
              try { project = JSON.parse(project); } catch { /* keep as string */ }
            }
            map[p.promoKey] = project;
          }
          setStatusData(map);
        }
      } catch { /* ignore */ }
    };
    loadStatusData();
  }, []);

  useEffect(() => {
    const fetchProgressStats = async () => {
      if (selectedPromo === 'all') {
        setIsLoading(true);
        const statsMap: Record<string, ProgressStats> = {};

        await Promise.all(
          Object.entries(statusData).map(async ([promoKey, project]) => {
            if (!project || project === 'Fin') return;

            try {
              const projectParam =
                typeof project === 'string' ? project : JSON.stringify(project);
              const response = await fetch(
                `/api/project-progress-stats?promo=${encodeURIComponent(
                  promoKey
                )}&project=${encodeURIComponent(projectParam)}`
              );

              if (response.ok) {
                const data = await response.json();
                statsMap[promoKey] = data;
              }
            } catch (error) {
              console.error(
                `Erreur lors de la récupération des stats pour ${promoKey}:`,
                error
              );
            }
          })
        );

        setAllProgressStats(statsMap);
        setProgressStats(null);
        setIsLoading(false);
        return;
      }

      const project = statusData[selectedPromo];
      if (!project || project === 'Fin') {
        setProgressStats(null);
        return;
      }

      setIsLoading(true);
      try {
        const projectParam =
          typeof project === 'string' ? project : JSON.stringify(project);
        const response = await fetch(
          `/api/project-progress-stats?promo=${encodeURIComponent(
            selectedPromo
          )}&project=${encodeURIComponent(projectParam)}`
        );

        if (response.ok) {
          const data = await response.json();
          setProgressStats(data);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressStats();
  }, [selectedPromo, statusData]);

  return (
    <div>
      {selectedPromo === 'all' ? (
        <AllPromosView
          statusData={statusData}
          allStats={allProgressStats}
          isLoading={isLoading}
        />
      ) : (
        <SinglePromoView
          project={statusData[selectedPromo]}
          stats={progressStats}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default PromoStatusDisplay;
