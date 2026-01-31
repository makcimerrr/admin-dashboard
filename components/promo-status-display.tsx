'use client';

import React, { useEffect, useState } from 'react';
import promoStatus from '../config/promoStatus.json';
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

interface PromoStatusDisplayProps {
  selectedPromo: string;
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

  const getColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-500';
    if (pct >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

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
          className={cn('transition-all duration-500', getColor(percentage))}
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

// Stat item component
function StatItem({
  label,
  value,
  color,
  icon: Icon
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
}) {
  if (value === 0) return null;

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', color)} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <Badge variant="secondary" className="h-5 text-xs font-semibold">
        {value}
      </Badge>
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
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <div className="p-3 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            Formation Terminée
          </h3>
          <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
            Tous les projets ont été complétés avec succès
          </p>
        </div>
        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
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
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
            <Code2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold truncate">{project}</h3>
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
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
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs text-emerald-600 font-medium">Sur le projet</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {stats.onExpectedProject}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs text-amber-600 font-medium">Hors projet</span>
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
                  {stats.offProjectStats.ahead > 0 && (
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                      <TrendingUp className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-blue-700">{stats.offProjectStats.ahead}</p>
                      <p className="text-xs text-blue-600">En avance</p>
                    </div>
                  )}
                  {stats.offProjectStats.late > 0 && (
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-center">
                      <TrendingDown className="h-4 w-4 text-red-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-red-700">{stats.offProjectStats.late}</p>
                      <p className="text-xs text-red-600">En retard</p>
                    </div>
                  )}
                  {stats.offProjectStats.specialty > 0 && (
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-center">
                      <Zap className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-orange-700">{stats.offProjectStats.specialty}</p>
                      <p className="text-xs text-orange-600">Spécialité</p>
                    </div>
                  )}
                  {stats.offProjectStats.validated > 0 && (
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-emerald-700">{stats.offProjectStats.validated}</p>
                      <p className="text-xs text-emerald-600">Validé</p>
                    </div>
                  )}
                  {stats.offProjectStats.notValidated > 0 && (
                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-center">
                      <AlertCircle className="h-4 w-4 text-rose-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-rose-700">{stats.offProjectStats.notValidated}</p>
                      <p className="text-xs text-rose-600">Non validé</p>
                    </div>
                  )}
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
          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/20">
            <Workflow className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold">Tronc Multi-choix</h3>
              <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
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
          {/* Rust track */}
          <div className="relative overflow-hidden p-4 rounded-xl border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-transparent">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full -mr-8 -mt-8" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-cyan-500 rounded-full" />
                  <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                    Tronc Rust
                  </span>
                </div>
                {stats?.rustStats && (
                  <ProgressRing
                    percentage={Math.round(
                      (stats.rustStats.onProject / stats.rustStats.total) * 100
                    )}
                    size={40}
                    strokeWidth={3}
                  />
                )}
              </div>
              <h4 className="text-lg font-bold mb-2">{project.rust || 'N/A'}</h4>
              {stats?.rustStats && (
                <div className="space-y-2">
                  <Progress
                    value={Math.round(
                      (stats.rustStats.onProject / stats.rustStats.total) * 100
                    )}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {stats.rustStats.onProject} / {stats.rustStats.total} étudiants
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Java track */}
          <div className="relative overflow-hidden p-4 rounded-xl border-2 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-transparent">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-8 -mt-8" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-red-500 rounded-full" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                    Tronc Java
                  </span>
                </div>
                {stats?.javaStats && (
                  <ProgressRing
                    percentage={Math.round(
                      (stats.javaStats.onProject / stats.javaStats.total) * 100
                    )}
                    size={40}
                    strokeWidth={3}
                  />
                )}
              </div>
              <h4 className="text-lg font-bold mb-2">{project.java || 'N/A'}</h4>
              {stats?.javaStats && (
                <div className="space-y-2">
                  <Progress
                    value={Math.round(
                      (stats.javaStats.onProject / stats.javaStats.total) * 100
                    )}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {stats.javaStats.onProject} / {stats.javaStats.total} étudiants
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global progress */}
        {stats && (
          <div className="p-4 bg-muted/30 rounded-xl border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progression globale</span>
              <Badge
                variant="outline"
                className={cn(
                  'font-bold',
                  stats.percentage >= 80
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : stats.percentage >= 50
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                )}
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
              'flex items-center gap-4 p-3 rounded-xl border transition-all hover:shadow-md',
              isFin && 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'p-2 rounded-lg',
                isFin
                  ? 'bg-emerald-500'
                  : isMultiChoice
                  ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600'
              )}
            >
              {isFin ? (
                <Trophy className="h-5 w-5 text-white" />
              ) : isMultiChoice ? (
                <Workflow className="h-5 w-5 text-white" />
              ) : (
                <Code2 className="h-5 w-5 text-white" />
              )}
            </div>

            {/* Promo name */}
            <div className="w-20 shrink-0">
              <span className="font-bold text-sm">{promoKey}</span>
            </div>

            {/* Project info */}
            <div className="flex-1 min-w-0">
              {isFin ? (
                <span className="text-sm font-medium text-emerald-600">
                  Formation Terminée
                </span>
              ) : isMultiChoice ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-cyan-600 font-medium truncate">
                    {project.rust}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-red-600 font-medium truncate">
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
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : stats
                  ? stats.percentage >= 80
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : stats.percentage >= 50
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-muted text-muted-foreground'
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
  const statusData = promoStatus as Record<string, any>;
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [allProgressStats, setAllProgressStats] = useState<Record<string, ProgressStats>>({});
  const [isLoading, setIsLoading] = useState(false);

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
  }, [selectedPromo]);

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
