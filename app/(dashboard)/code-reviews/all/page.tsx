'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  CheckCircle2,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  Eye,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  BarChart3,
  Flag,
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  XCircle,
  FileWarning,
  Hourglass,
  ClipboardList,
  UserCheck,
  UserX,
  MessageSquareWarning
} from 'lucide-react';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import projectConfig from '../../../../config/projects.json';
import {
  StatCardSkeleton,
  AuditsTableSkeleton,
  PendingGroupsTableSkeleton
} from '@/components/code-reviews/skeletons';

type Track = 'Golang' | 'Javascript' | 'Rust' | 'Java';
type SortField =
  | 'project'
  | 'track'
  | 'promo'
  | 'date'
  | 'validation'
  | 'priority'
  | 'auditor'
  | 'members'
  | 'score';
type SortDirection = 'asc' | 'desc';

interface MemberDetail {
  login: string;
  validated: boolean;
  hasWarnings: boolean;
  warningsCount: number;
  warnings: string[];
}

interface AuditData {
  id: number;
  promoId: string;
  promoName: string;
  projectName: string;
  track: Track;
  groupId: string;
  auditorName: string;
  createdAt: string;
  updatedAt?: string;
  priority: 'urgent' | 'warning' | 'normal';
  validatedCount: number;
  totalMembers: number;
  hasWarnings: boolean;
  warningsCount: number;
  globalWarnings: string[];
  members: string[];
  memberDetails: MemberDetail[];
  summary?: string;
}

interface PendingGroup {
  groupId: string;
  projectName: string;
  track: Track;
  promoId: string;
  promoName: string;
  members: { login: string; isDropout: boolean }[];
  membersCount: number;
  activeMembers: number;
  status: string;
  priority: 'urgent' | 'warning' | 'normal';
  priorityScore: number;
  priorityReasons: string[];
  membersNeverAudited: number;
}

const trackColors: Record<Track, string> = {
  Golang: 'bg-cyan-500',
  Javascript: 'bg-yellow-500',
  Rust: 'bg-orange-500',
  Java: 'bg-red-500'
};

const trackBadgeColors: Record<Track, string> = {
  Golang: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Javascript: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Rust: 'bg-orange-100 text-orange-800 border-orange-200',
  Java: 'bg-red-100 text-red-800 border-red-200'
};

function SortButton({
  field,
  currentSort,
  currentDirection,
  onSort,
  children
}: {
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
    >
      {children}
      {isActive ? (
        currentDirection === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

function MembersList({
  members,
  memberDetails
}: {
  members: string[];
  memberDetails?: MemberDetail[];
}) {
  const [expanded, setExpanded] = useState(false);
  const displayCount = 3;
  const hasMore = members.length > displayCount;

  if (!memberDetails || memberDetails.length === 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {members.slice(0, displayCount).map((m) => (
          <Badge key={m} variant="outline" className="text-xs font-mono">
            {m}
          </Badge>
        ))}
        {hasMore && (
          <Badge variant="secondary" className="text-xs">
            +{members.length - displayCount}
          </Badge>
        )}
      </div>
    );
  }

  const displayMembers = expanded
    ? memberDetails
    : memberDetails.slice(0, displayCount);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {displayMembers.map((m) => (
          <TooltipProvider key={m.login}>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant="outline"
                  className={`text-xs font-mono ${
                    m.hasWarnings
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : m.validated
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                  }`}
                >
                  {m.hasWarnings && (
                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                  )}
                  {!m.hasWarnings && m.validated && (
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  )}
                  {!m.hasWarnings && !m.validated && (
                    <XCircle className="h-2.5 w-2.5 mr-1" />
                  )}
                  {m.login}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-medium">{m.login}</p>
                  <p>{m.validated ? 'Validé' : 'Non validé'}</p>
                  {m.hasWarnings && (
                    <p className="text-amber-600">
                      {m.warningsCount} warning(s)
                    </p>
                  )}
                  {m.warnings.length > 0 && (
                    <ul className="mt-1 text-amber-600">
                      {m.warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {hasMore && !expanded && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-xs"
            onClick={() => setExpanded(true)}
          >
            +{members.length - displayCount}
          </Button>
        )}
        {expanded && hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-xs"
            onClick={() => setExpanded(false)}
          >
            Réduire
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AllAuditsPage() {
  const [audits, setAudits] = useState<AuditData[]>([]);
  const [pendingGroups, setPendingGroups] = useState<PendingGroup[]>([]);
  const [pendingStats, setPendingStats] = useState({
    total: 0,
    urgent: 0,
    warning: 0,
    normal: 0,
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('completed');

  // Filtres
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState<'all' | Track>('all');
  const [promoFilter, setPromoFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [auditorFilter, setAuditorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [warningsFilter, setWarningsFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<string>('all');

  // Tri
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchAllAudits();
    fetchPendingAudits();
  }, []);

  const fetchAllAudits = async () => {
    try {
      const response = await fetch('/api/code-reviews/all');
      const data = await response.json();
      if (data.success) {
        setAudits(data.audits);
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAudits = async () => {
    try {
      const response = await fetch('/api/code-reviews/pending');
      const data = await response.json();
      if (data.success) {
        setPendingGroups(data.pending || []);
        setPendingStats(
          data.stats || {
            total: 0,
            urgent: 0,
            warning: 0,
            normal: 0,
            avgScore: 0
          }
        );
      }
    } catch (err) {
      console.error('Error fetching pending:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Listes uniques pour les filtres
  const uniquePromos = useMemo(() => {
    const promos = new Map<string, string>();
    audits.forEach((a) => promos.set(a.promoId, a.promoName));
    pendingGroups.forEach((g) => promos.set(g.promoId, g.promoName));
    return Array.from(promos.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [audits, pendingGroups]);

  const uniqueAuditors = useMemo(() => {
    const auditors = new Set(audits.map((a) => a.auditorName));
    return Array.from(auditors).sort();
  }, [audits]);

  // Filtrage et tri des audits complétés
  const filteredAndSortedAudits = useMemo(() => {
    let result = audits.filter((audit) => {
      // Recherche
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesProject = audit.projectName
          .toLowerCase()
          .includes(searchLower);
        const matchesGroupId = audit.groupId
          .toLowerCase()
          .includes(searchLower);
        const matchesAuditor = audit.auditorName
          .toLowerCase()
          .includes(searchLower);
        const matchesMember = audit.members.some((m) =>
          m.toLowerCase().includes(searchLower)
        );
        const matchesPromo = audit.promoName
          .toLowerCase()
          .includes(searchLower);
        if (
          !matchesProject &&
          !matchesGroupId &&
          !matchesAuditor &&
          !matchesMember &&
          !matchesPromo
        )
          return false;
      }

      if (trackFilter !== 'all' && audit.track !== trackFilter) return false;
      if (promoFilter !== 'all' && audit.promoId !== promoFilter) return false;
      if (priorityFilter !== 'all' && audit.priority !== priorityFilter)
        return false;
      if (auditorFilter !== 'all' && audit.auditorName !== auditorFilter)
        return false;

      // Filtre par warnings
      if (warningsFilter === 'with' && !audit.hasWarnings) return false;
      if (warningsFilter === 'without' && audit.hasWarnings) return false;

      // Filtre par validation
      if (validationFilter !== 'all') {
        const rate =
          audit.totalMembers > 0
            ? (audit.validatedCount / audit.totalMembers) * 100
            : 0;
        if (validationFilter === 'high' && rate < 80) return false;
        if (validationFilter === 'medium' && (rate < 50 || rate >= 80))
          return false;
        if (validationFilter === 'low' && rate >= 50) return false;
      }

      // Filtre par date
      if (dateFilter !== 'all') {
        const auditDate = new Date(audit.createdAt);
        const now = new Date();
        const daysDiff = Math.floor(
          (now.getTime() - auditDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dateFilter === 'today' && daysDiff > 0) return false;
        if (dateFilter === 'week' && daysDiff > 7) return false;
        if (dateFilter === 'month' && daysDiff > 30) return false;
      }

      return true;
    });

    // Tri
    // Always sort first by track (fixed order) then by project order from projectConfig,
    // then apply the selected tertiary sortField/direction for ties.
    const trackOrderArr: Track[] = ['Golang', 'Javascript', 'Rust', 'Java'];

    result.sort((a, b) => {
      // Primary: track order
      const trackComp =
        trackOrderArr.indexOf(a.track) - trackOrderArr.indexOf(b.track);
      if (trackComp !== 0) return trackComp;

      // Secondary: project order from projectConfig
      const projectsA = (projectConfig[a.track] ?? []) as {
        id: number;
        name: string;
        project_time_week: number;
      }[];
      const projectsB = (projectConfig[b.track] ?? []) as {
        id: number;
        name: string;
        project_time_week: number;
      }[];
      const orderA = projectsA.findIndex((p) => p.name === a.projectName);
      const orderB = projectsB.findIndex((p) => p.name === b.projectName);

      if (orderA !== -1 || orderB !== -1) {
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        if (orderA !== orderB) return orderA - orderB;
      } else {
        const projComp = a.projectName.localeCompare(b.projectName);
        if (projComp !== 0) return projComp;
      }

      // Tertiary: user-selected sort field (applies only when track+project are equal)
      let comparison = 0;

      switch (sortField) {
        case 'project':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'track':
          comparison = a.track.localeCompare(b.track);
          break;
        case 'promo':
          comparison = a.promoName.localeCompare(b.promoName);
          break;
        case 'date':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'validation':
          const rateA =
            a.totalMembers > 0 ? a.validatedCount / a.totalMembers : 0;
          const rateB =
            b.totalMembers > 0 ? b.validatedCount / b.totalMembers : 0;
          comparison = rateA - rateB;
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, warning: 1, normal: 2 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'auditor':
          comparison = a.auditorName.localeCompare(b.auditorName);
          break;
        case 'members':
          comparison = a.totalMembers - b.totalMembers;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [
    audits,
    search,
    trackFilter,
    promoFilter,
    priorityFilter,
    auditorFilter,
    dateFilter,
    warningsFilter,
    validationFilter,
    sortField,
    sortDirection
  ]);

  // Filtrage des audits en attente
  const filteredPendingGroups = useMemo(() => {
    return pendingGroups.filter((group) => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesProject = group.projectName
          .toLowerCase()
          .includes(searchLower);
        const matchesGroupId = group.groupId
          .toLowerCase()
          .includes(searchLower);
        const matchesMember = group.members.some((m) =>
          m.login.toLowerCase().includes(searchLower)
        );
        const matchesPromo = group.promoName
          .toLowerCase()
          .includes(searchLower);
        if (
          !matchesProject &&
          !matchesGroupId &&
          !matchesMember &&
          !matchesPromo
        )
          return false;
      }

      if (trackFilter !== 'all' && group.track !== trackFilter) return false;
      if (promoFilter !== 'all' && group.promoId !== promoFilter) return false;
      if (priorityFilter !== 'all' && group.priority !== priorityFilter)
        return false;

      return true;
    });
  }, [pendingGroups, search, trackFilter, promoFilter, priorityFilter]);

  const filteredAndSortedPendingGroups = useMemo(() => {
    const result = [...filteredPendingGroups];

    // Keep the same primary/secondary ordering as completed: track fixed order, then project order from config
    const trackOrderArr: Track[] = ['Golang', 'Javascript', 'Rust', 'Java'];

    result.sort((a, b) => {
      // Primary: track order (fixed)
      const trackComp =
        trackOrderArr.indexOf(a.track as Track) -
        trackOrderArr.indexOf(b.track as Track);
      if (trackComp !== 0) return trackComp;

      // Secondary: project order from projectConfig
      const projectsA = (projectConfig[a.track] ?? []) as {
        id: number;
        name: string;
        project_time_week: number;
      }[];
      const projectsB = (projectConfig[b.track] ?? []) as {
        id: number;
        name: string;
        project_time_week: number;
      }[];
      const orderA = projectsA.findIndex((p) => p.name === a.projectName);
      const orderB = projectsB.findIndex((p) => p.name === b.projectName);

      if (orderA !== -1 || orderB !== -1) {
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        if (orderA !== orderB) return orderA - orderB;
      } else {
        const projComp = a.projectName.localeCompare(b.projectName);
        if (projComp !== 0) return projComp;
      }

      // Tertiary: user-selected sort field
      let comparison = 0;
      switch (sortField) {
        case 'project':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'track':
          comparison = (a.track as string).localeCompare(b.track as string);
          break;
        case 'promo':
          comparison = a.promoName.localeCompare(b.promoName);
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, warning: 1, normal: 2 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'score':
          comparison = a.priorityScore - b.priorityScore;
          break;
        case 'members':
          comparison = a.membersCount - b.membersCount;
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [filteredPendingGroups, sortField, sortDirection]);

  // Stats des audits complétés
  const completedStats = useMemo(() => {
    const total = filteredAndSortedAudits.length;
    const withWarnings = filteredAndSortedAudits.filter(
      (a) => a.hasWarnings
    ).length;
    const urgent = filteredAndSortedAudits.filter(
      (a) => a.priority === 'urgent'
    ).length;
    const warning = filteredAndSortedAudits.filter(
      (a) => a.priority === 'warning'
    ).length;
    const totalWarnings = filteredAndSortedAudits.reduce(
      (sum, a) => sum + a.warningsCount,
      0
    );
    const avgValidation =
      total > 0
        ? Math.round(
            filteredAndSortedAudits.reduce((sum, a) => {
              return (
                sum +
                (a.totalMembers > 0
                  ? (a.validatedCount / a.totalMembers) * 100
                  : 0)
              );
            }, 0) / total
          )
        : 0;
    const totalStudents = filteredAndSortedAudits.reduce(
      (sum, a) => sum + a.totalMembers,
      0
    );
    const validatedStudents = filteredAndSortedAudits.reduce(
      (sum, a) => sum + a.validatedCount,
      0
    );

    return {
      total,
      withWarnings,
      urgent,
      warning,
      avgValidation,
      totalWarnings,
      totalStudents,
      validatedStudents
    };
  }, [filteredAndSortedAudits]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/code-reviews">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Centre de Suivi des Code Reviews
              </h1>
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>

          {/* Table Skeleton */}
          <AuditsTableSkeleton rows={8} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/code-reviews">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">Erreur</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-red-700">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/code-reviews">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Centre de Suivi des Code Reviews
            </h1>
            <p className="text-muted-foreground">
              {audits.length} audits réalisés · {pendingStats.total} en attente
            </p>
          </div>
        </div>
      </div>

      {/* Alertes globales */}
      {(completedStats.totalWarnings > 0 || pendingStats.urgent > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedStats.totalWarnings > 0 && (
            <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <MessageSquareWarning className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800">
                      Warnings détectés
                    </h3>
                    <p className="text-sm text-amber-700">
                      {completedStats.totalWarnings} warning(s) dans{' '}
                      {completedStats.withWarnings} audit(s)
                    </p>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-amber-700"
                      onClick={() => {
                        setWarningsFilter('with');
                        setActiveTab('completed');
                      }}
                    >
                      Voir les audits concernés →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {pendingStats.urgent > 0 && (
            <Card className="border-red-300 bg-gradient-to-r from-red-50 to-rose-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Hourglass className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800">
                      Audits urgents en attente
                    </h3>
                    <p className="text-sm text-red-700">
                      {pendingStats.urgent} groupe(s) marqués comme urgents (score ≥ 50)
                    </p>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-red-700"
                      onClick={() => {
                        setPriorityFilter('urgent');
                        setActiveTab('pending');
                      }}
                    >
                      Voir les groupes urgents →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Audités</span>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{completedStats.total}</p>
        </Card>
        <Card className="p-3 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-600">En attente</span>
            <Hourglass className="h-4 w-4 text-blue-600" />
          </div>
          {loadingPending ? (
            <div className="mt-1">
              <div className="h-8 w-20 bg-blue-100 rounded animate-pulse" />
            </div>
          ) : (
            <p className="text-2xl font-bold mt-1 text-blue-700">
              {pendingStats.total}
            </p>
          )}
        </Card>
        <Card className="p-3 border-rose-200 bg-rose-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-600">Urgent</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold mt-1 text-rose-700">
            {completedStats.urgent + pendingStats.urgent}
          </p>
        </Card>
        <Card className="p-3 border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-600">Warnings</span>
            <FileWarning className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-700">
            {completedStats.totalWarnings}
          </p>
        </Card>
        <Card className="p-3 border-green-200 bg-green-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-600">Validés</span>
            <UserCheck className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold mt-1 text-green-700">
            {completedStats.validatedStudents}
          </p>
        </Card>
        <Card className="p-3 border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-600">Non validés</span>
            <UserX className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold mt-1 text-red-700">
            {completedStats.totalStudents - completedStats.validatedStudents}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Étudiants</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">
            {completedStats.totalStudents}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Valid. moy.</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">
            {completedStats.avgValidation}%
          </p>
        </Card>
      </div>

      {/* Filtres avancés */}
      <div className="flex flex-wrap gap-3 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher projet, groupe, membre, auditeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>

        <Select value={promoFilter} onValueChange={setPromoFilter}>
          <SelectTrigger className="w-[150px] h-8">
            <SelectValue placeholder="Promotion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes promos</SelectItem>
            {uniquePromos.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={trackFilter}
          onValueChange={(value: string) =>
            setTrackFilter(value as 'all' | Track)
          }
        >
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue placeholder="Tronc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous troncs</SelectItem>
            {(['Golang', 'Javascript', 'Rust', 'Java'] as Track[]).map(
              (track) => (
                <SelectItem key={track} value={track}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${trackColors[track]}`}
                    />
                    {track}
                  </div>
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="urgent">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-rose-500" />
                Urgent
              </div>
            </SelectItem>
            <SelectItem value="warning">
              <div className="flex items-center gap-2">
                <Flag className="h-3 w-3 text-amber-500" />
                Warning
              </div>
            </SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>

        {activeTab === 'completed' && (
          <>
            <Select value={auditorFilter} onValueChange={setAuditorFilter}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Auditeur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous auditeurs</SelectItem>
                {uniqueAuditors.map((auditor) => (
                  <SelectItem key={auditor} value={auditor}>
                    {auditor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={warningsFilter} onValueChange={setWarningsFilter}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Warnings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="with">Avec warnings</SelectItem>
                <SelectItem value="without">Sans warnings</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={validationFilter}
              onValueChange={setValidationFilter}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Validation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="high">≥ 80%</SelectItem>
                <SelectItem value="medium">50-79%</SelectItem>
                <SelectItem value="low">&lt; 50%</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes dates</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">7 derniers jours</SelectItem>
                <SelectItem value="month">30 derniers jours</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-2">
          <Filter className="h-3.5 w-3.5" />
          <span>
            {activeTab === 'completed'
              ? `${filteredAndSortedAudits.length} audits`
              : `${filteredAndSortedPendingGroups.length} en attente`}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="completed" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Audits réalisés
            <Badge variant="secondary" className="ml-1">
              {filteredAndSortedAudits.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
              <Hourglass className="h-4 w-4" />
              En attente
              {loadingPending ? (
                <div className="ml-1 h-4 w-8 rounded bg-gray-200 animate-pulse" aria-hidden />
              ) : pendingStats.urgent > 0 ? (
                <Badge variant="destructive" className="ml-1">
                  {filteredAndSortedPendingGroups.length}
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-1">
                  {filteredAndSortedPendingGroups.length}
                </Badge>
              )}
            </TabsTrigger>
        </TabsList>

        {/* Tab: Audits réalisés */}
        <TabsContent value="completed" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>
                    <SortButton
                      field="promo"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Promotion
                    </SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton
                      field="project"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Projet
                    </SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton
                      field="members"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Membres du groupe
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <SortButton
                      field="track"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Tronc
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-[90px]">
                    <SortButton
                      field="validation"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Valid.
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-[90px]">
                    <SortButton
                      field="priority"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Statut
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <SortButton
                      field="auditor"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Auditeur
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortButton
                      field="date"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Date
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-[60px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedAudits.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Aucun audit trouvé</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedAudits.map((audit) => {
                    const validationRate =
                      audit.totalMembers > 0
                        ? Math.round(
                            (audit.validatedCount / audit.totalMembers) * 100
                          )
                        : 0;

                    const configList = (projectConfig[audit.track] ??
                      []) as unknown as string[];
                    const projectList = (projectConfig[audit.track] ?? []) as {
                      id: number;
                      name: string;
                      project_time_week: number;
                    }[];
                    const projectIndex = projectList.findIndex(
                      (p) => p.name === audit.projectName
                    );
                    const positionText =
                      projectIndex !== -1
                        ? `${projectIndex + 1}/${projectList.length}`
                        : null;

                    return (
                      <TableRow
                        key={audit.id}
                        className={`transition-colors ${
                          audit.hasWarnings
                            ? 'bg-amber-50/50 hover:bg-amber-100/60'
                            : audit.priority === 'urgent'
                              ? 'bg-rose-50/50 hover:bg-rose-100/60'
                              : audit.priority === 'warning'
                                ? 'bg-orange-50/50 hover:bg-orange-100/60'
                                : 'hover:bg-muted/50'
                        }`}
                      >
                        <TableCell>
                          <Link
                            href={`/code-reviews/${audit.promoId}`}
                            className="text-sm font-medium hover:text-primary hover:underline"
                          >
                            {audit.promoName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {audit.projectName}
                              {positionText && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs ml-2"
                                >
                                  {positionText}
                                </Badge>
                              )}
                              {audit.hasWarnings && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs">
                                        <p className="font-medium">
                                          {audit.warningsCount} warning(s)
                                        </p>
                                        {audit.globalWarnings.length > 0 && (
                                          <ul className="mt-1">
                                            {audit.globalWarnings.map(
                                              (w, i) => (
                                                <li key={i}>• {w}</li>
                                              )
                                            )}
                                          </ul>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              #{audit.groupId.slice(-8)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <MembersList
                            members={audit.members}
                            memberDetails={audit.memberDetails}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={trackBadgeColors[audit.track]}
                          >
                            {audit.track}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              validationRate >= 80
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : validationRate >= 50
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                            }
                          >
                            {audit.validatedCount}/{audit.totalMembers}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {audit.hasWarnings ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {audit.warningsCount}W
                            </Badge>
                          ) : audit.priority === 'urgent' ? (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-700 border-rose-200"
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Urgent
                            </Badge>
                          ) : audit.priority === 'warning' ? (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200"
                            >
                              <Flag className="h-3 w-3 mr-1" />
                              Warning
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-600 border-green-200"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[80px]">
                              {audit.auditorName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="text-sm text-muted-foreground text-left">
                                {formatDistanceToNow(
                                  new Date(audit.createdAt),
                                  { addSuffix: true, locale: fr }
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                {format(
                                  new Date(audit.createdAt),
                                  'dd MMM yyyy à HH:mm',
                                  { locale: fr }
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            asChild
                          >
                            <Link
                              href={`/code-reviews/${audit.promoId}/group/${audit.groupId}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab: Audits en attente */}
        <TabsContent value="pending" className="mt-4">
          {loadingPending ? (
            <PendingGroupsTableSkeleton rows={8} />
          ) : filteredPendingGroups.length === 0 ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold text-green-800">
                  Tous les groupes ont été audités
                </h3>
                <p className="text-green-700 mt-1">
                  Aucun groupe terminé en attente d'audit
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>
                      <SortButton
                        field="promo"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Promotion
                      </SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton
                        field="project"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Projet
                      </SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton
                        field="members"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Membres du groupe
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <SortButton
                        field="track"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Tronc
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <SortButton
                        field="score"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Score
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <SortButton
                        field="priority"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Priorité
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[80px] text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPendingGroups.map((group) => {
                    const projectList = (projectConfig[group.track] ?? []) as {
                      id: number;
                      name: string;
                      project_time_week: number;
                    }[];
                    const projectIndex = projectList.findIndex(
                      (p) => p.name === group.projectName
                    );
                    const positionText =
                      projectIndex !== -1
                        ? `${projectIndex + 1}/${projectList.length}`
                        : null;

                    return (
                      <TableRow
                        key={`${group.promoId}-${group.groupId}`}
                        className={`transition-colors ${
                          group.priority === 'urgent'
                            ? 'bg-rose-50/50 hover:bg-rose-100/60'
                            : group.priority === 'warning'
                              ? 'bg-amber-50/50 hover:bg-amber-100/60'
                              : 'hover:bg-muted/50'
                        }`}
                      >
                        <TableCell>
                          <Link
                            href={`/code-reviews/${group.promoId}`}
                            className="text-sm font-medium hover:text-primary hover:underline"
                          >
                            {group.promoName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {group.projectName}
                              {positionText && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs ml-2"
                                >
                                  {positionText}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              #{group.groupId.slice(-8)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.members.slice(0, 4).map((m, i) => (
                              <Badge
                                key={`${m.login}-${i}`}
                                variant="outline"
                                className="text-xs font-mono"
                              >
                                {m.login}
                              </Badge>
                            ))}
                            {group.members.length > 4 && (
                              <Badge
                                key={`more-${group.groupId}`}
                                variant="secondary"
                                className="text-xs"
                              >
                                +{group.members.length - 4}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              trackBadgeColors[group.track as Track] ||
                              'bg-gray-100'
                            }
                          >
                            {group.track}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 text-sm cursor-help">
                                  <span
                                    className={`font-mono font-medium ${
                                      group.priorityScore >= 50
                                        ? 'text-red-600'
                                        : group.priorityScore >= 25
                                          ? 'text-amber-600'
                                          : 'text-blue-600'
                                    }`}
                                  >
                                    {group.priorityScore}
                                  </span>
                                  {group.membersNeverAudited > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-rose-50 text-rose-700 border-rose-200"
                                    >
                                      {group.membersNeverAudited} jamais audités
                                    </Badge>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium">Raisons de priorité:</p>
                                  <ul className="text-xs space-y-0.5 list-disc pl-4">
                                    {group.priorityReasons.map((reason, i) => (
                                      <li key={i}>{reason}</li>
                                    ))}
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {group.priority === 'urgent' ? (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-700 border-rose-200"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Urgent
                            </Badge>
                          ) : group.priority === 'warning' ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200"
                            >
                              <Flag className="h-3 w-3 mr-1" />À traiter
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-600 border-blue-200"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Récent
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7"
                            asChild
                          >
                            <Link
                              href={`/code-reviews/${group.promoId}/group/${group.groupId}`}
                            >
                              Auditer
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
