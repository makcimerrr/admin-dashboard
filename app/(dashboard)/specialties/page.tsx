'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Search, GraduationCap, CheckCircle2, Users,
  TrendingUp, Activity, ArrowUpDown, ChevronDown, ChevronRight,
  Lock, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { PageSkeleton } from '@/components/page-skeleton';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SpecialtyDef {
  name: string;
  totalProjects: number;
  projects: string[];
}

interface StudentProject {
  name: string;
  grade: number | null;
  status: string;
}

interface Student {
  login: string;
  firstName: string | null;
  lastName: string | null;
  completedProjects: string[];
  currentProject: string | null;
  progression: { current: number; total: number };
  projects: StudentProject[];
}

interface PromoInfo {
  eventId: number;
  title: string;
  key: string;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'completed';
type SortKey = 'login' | 'lastName' | 'firstName' | 'progression';
type SortDir = 'asc' | 'desc';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStudentStatus(s: Student): 'active' | 'inactive' | 'completed' {
  if (s.progression.current >= s.progression.total && s.progression.total > 0) return 'completed';
  if (s.currentProject) return 'active';
  return 'inactive';
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; className: string }> = {
  active: { label: 'En cours', variant: 'default', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  inactive: { label: 'Inactif', variant: 'secondary', className: 'bg-muted text-muted-foreground' },
  completed: { label: 'Terminé', variant: 'default', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
};

function progressColor(pct: number): string {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SpecialtiesPage() {
  // Data
  const [specialties, setSpecialties] = useState<SpecialtyDef[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [projectsList, setProjectsList] = useState<string[]>([]);
  const [promos, setPromos] = useState<PromoInfo[]>([]);

  // Filters
  const [selectedSpec, setSelectedSpec] = useState<string>('');
  const [selectedPromo, setSelectedPromo] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('progression');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Expand
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Loading
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/specialties').then((r) => r.json()),
      fetch('/api/promotions').then((r) => r.json()),
    ])
      .then(([specData, promoData]) => {
        const specs: SpecialtyDef[] = Array.isArray(specData) ? specData : specData.specialties || [];
        setSpecialties(specs);
        if (specs.length > 0) setSelectedSpec(specs[0].name);
        setPromos(promoData.promotions || []);
      })
      .catch(() => toast.error('Impossible de charger les données'))
      .finally(() => setLoading(false));
  }, []);

  // ── Fetch students ────────────────────────────────────────────────────────

  const loadStudents = useCallback(async () => {
    if (!selectedSpec) return;
    setLoadingStudents(true);
    setExpandedRows(new Set());
    try {
      const params = new URLSearchParams();
      if (selectedPromo !== 'all') params.set('eventId', selectedPromo);
      const res = await fetch(`/api/specialties/${encodeURIComponent(selectedSpec)}/students?${params}`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setStudents(data.students || []);
      setProjectsList(data.projectsList || []);
    } catch {
      toast.error('Impossible de charger les étudiants');
      setStudents([]);
      setProjectsList([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedSpec, selectedPromo]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // ── Filter + Sort ─────────────────────────────────────────────────────────

  const filteredStudents = useMemo(() => {
    let list = students;

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((s) => getStudentStatus(s) === statusFilter);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.login.toLowerCase().includes(q) ||
          (s.firstName?.toLowerCase() || '').includes(q) ||
          (s.lastName?.toLowerCase() || '').includes(q)
      );
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'login':
          cmp = a.login.localeCompare(b.login);
          break;
        case 'lastName':
          cmp = (a.lastName || '').localeCompare(b.lastName || '');
          break;
        case 'firstName':
          cmp = (a.firstName || '').localeCompare(b.firstName || '');
          break;
        case 'progression':
          cmp = a.progression.current - b.progression.current;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [students, statusFilter, search, sortKey, sortDir]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = students.length;
    if (total === 0) return { total: 0, active: 0, completed: 0, avgPct: 0 };
    const active = students.filter((s) => s.currentProject !== null).length;
    const completed = students.filter(
      (s) => s.progression.current >= s.progression.total && s.progression.total > 0
    ).length;
    const avgPct =
      students.reduce((acc, s) => {
        return acc + (s.progression.total > 0 ? s.progression.current / s.progression.total : 0);
      }, 0) / total;
    return { total, active, completed, avgPct: Math.round(avgPct * 100) };
  }, [students]);

  // ── Sort handler ──────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'progression' ? 'desc' : 'asc');
    }
  };

  const toggleExpand = (login: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(login)) next.delete(login);
      else next.add(login);
      return next;
    });
  };

  // ── Current spec ──────────────────────────────────────────────────────────

  const currentSpec = specialties.find((s) => s.name === selectedSpec);

  // ── Sort header helper ────────────────────────────────────────────────────

  const SortHeader = ({ label, sortId, className }: { label: string; sortId: SortKey; className?: string }) => (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-muted/50 transition-colors', className)}
      onClick={() => handleSort(sortId)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn('h-3 w-3', sortKey === sortId ? 'text-foreground' : 'text-muted-foreground/40')} />
      </div>
    </TableHead>
  );

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return <PageSkeleton variant="table" />;
  }

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader icon={GraduationCap} title="Suivi des Spécialités" description="Progression des étudiants par spécialité" />

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedSpec} onValueChange={setSelectedSpec}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Spécialité" />
          </SelectTrigger>
          <SelectContent>
            {specialties.map((s) => (
              <SelectItem key={s.name} value={s.name}>
                {s.name.charAt(0).toUpperCase() + s.name.slice(1).replace(/-/g, ' ')} ({s.totalProjects} projets)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPromo} onValueChange={setSelectedPromo}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Promo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les promos</SelectItem>
            {promos.map((p) => (
              <SelectItem key={p.eventId} value={String(p.eventId)}>
                {p.title || p.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">En cours</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un étudiant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* ── Stats cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Total étudiants
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> En cours
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Terminé
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Progression moy.
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.avgPct}%</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loadingStudents ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {students.length === 0
                ? 'Aucun étudiant trouvé pour cette spécialité.'
                : 'Aucun résultat pour les filtres sélectionnés.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <SortHeader label="Login" sortId="login" />
                    <SortHeader label="Nom" sortId="lastName" className="hidden md:table-cell" />
                    <SortHeader label="Prénom" sortId="firstName" className="hidden md:table-cell" />
                    <SortHeader label="Progression" sortId="progression" className="min-w-[180px]" />
                    <TableHead className="hidden sm:table-cell">Projet actuel</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const status = getStudentStatus(student);
                    const badge = STATUS_BADGE[status];
                    const pct =
                      student.progression.total > 0
                        ? (student.progression.current / student.progression.total) * 100
                        : 0;
                    const isExpanded = expandedRows.has(student.login);

                    return (
                      <React.Fragment key={student.login}>
                        {/* ── Main row ── */}
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleExpand(student.login)}
                        >
                          <TableCell className="w-8 pr-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{student.login}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {student.lastName || '—'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {student.firstName || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[150px]">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all', progressColor(pct))}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold tabular-nums whitespace-nowrap min-w-[36px] text-right">
                                {student.progression.current}/{student.progression.total}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {student.currentProject || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={badge.variant}
                              className={cn('text-[10px] font-semibold', badge.className)}
                            >
                              {badge.label}
                            </Badge>
                          </TableCell>
                        </TableRow>

                        {/* ── Expanded detail ── */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={7} className="p-0">
                              <ExpandedProjectList
                                student={student}
                                projectsList={projectsList}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Count ──────────────────────────────────────────────────────────── */}
      {!loadingStudents && filteredStudents.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {filteredStudents.length} étudiant{filteredStudents.length > 1 ? 's' : ''} affiché{filteredStudents.length > 1 ? 's' : ''}
          {filteredStudents.length !== students.length && ` sur ${students.length}`}
        </p>
      )}
    </div>
  );
}

// ─── Expanded project detail ────────────────────────────────────────────────

function ExpandedProjectList({
  student,
  projectsList,
}: {
  student: Student;
  projectsList: string[];
}) {
  const projMap = new Map(student.projects.map((p) => [p.name.toLowerCase(), p]));

  return (
    <div className="px-6 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {projectsList.map((projName, idx) => {
          const proj = projMap.get(projName.toLowerCase());
          const isFinished = proj?.status === 'finished';
          const isWorking =
            proj && !isFinished && proj.status !== 'not_started';
          const notStarted = !proj || proj.status === 'not_started';

          return (
            <div
              key={projName}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                isFinished && 'bg-emerald-500/5 border-emerald-500/20',
                isWorking && 'bg-blue-500/5 border-blue-500/20',
                notStarted && 'bg-muted/30 border-border text-muted-foreground/60'
              )}
            >
              <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                {idx + 1}.
              </span>

              {isFinished && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
              {isWorking && <Circle className="h-4 w-4 text-blue-500 fill-blue-500/20 flex-shrink-0" />}
              {notStarted && <Lock className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />}

              <span className={cn('flex-1 truncate', notStarted && 'italic')}>
                {projName}
              </span>

              {isFinished && proj?.grade != null && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                  {proj.grade}
                </Badge>
              )}
              {isWorking && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-700 dark:text-blue-400">
                  En cours
                </Badge>
              )}
              {notStarted && (
                <span className="text-[10px] italic">À venir</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
