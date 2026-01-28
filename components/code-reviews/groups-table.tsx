'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ClipboardCheck,
  AlertTriangle,
  Eye,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  BarChart3,
  Flag,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Track = 'Golang' | 'Javascript' | 'Rust' | 'Java';
type SortField = 'project' | 'track' | 'members' | 'status' | 'date' | 'validation' | 'priority';
type SortDirection = 'asc' | 'desc';

interface GroupMember {
  login: string;
  firstName?: string;
  lastName?: string;
  grade: number | null;
  isDropout: boolean;
}

interface GroupWithAuditStatus {
  groupId: string;
  projectName: string;
  track: Track;
  status: string;
  members: GroupMember[];
  isAudited: boolean;
  auditId?: number;
  auditorName?: string;
  auditDate?: string;
  activeMembers: number;
  hasWarnings?: boolean;
  warningsCount?: number;
  validatedCount?: number;
  priority?: 'urgent' | 'warning' | 'normal';
  // Champs pour les priorités calculées (groupes en attente)
  priorityReasons?: string[];
  priorityScore?: number;
}

interface GroupsTableProps {
  promoId: string;
  groups: GroupWithAuditStatus[];
  stats: {
    totalGroups: number;
    auditedGroups: number;
    pendingGroups: number;
    byTrack: Record<Track, { total: number; audited: number }>;
  };
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

export function GroupsTable({ promoId, groups, stats }: GroupsTableProps) {
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  // Override manuel des priorités pour les groupes en attente
  const [manualPriorities, setManualPriorities] = useState<Record<string, 'urgent' | 'warning' | 'normal'>>({});

  const handleSetManualPriority = (groupId: string, priority: 'urgent' | 'warning' | 'normal') => {
    setManualPriorities(prev => ({ ...prev, [groupId]: priority }));
    toast.success(`Priorité manuelle: ${priority}`);
  };

  // Obtenir la priorité effective (manuelle > calculée)
  const getEffectivePriority = (group: GroupWithAuditStatus) => {
    if (manualPriorities[group.groupId]) {
      return manualPriorities[group.groupId];
    }
    return group.priority || 'normal';
  };

  const uniqueProjects = useMemo(() => {
    const projects = new Set(groups.map((g) => g.projectName));
    return Array.from(projects).sort();
  }, [groups]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedGroups = useMemo(() => {
    let result = groups.filter((group) => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesLogin = group.members.some((m) =>
          m.login.toLowerCase().includes(searchLower)
        );
        const matchesProject = group.projectName.toLowerCase().includes(searchLower);
        const matchesGroupId = group.groupId.toLowerCase().includes(searchLower);
        const matchesAuditor = group.auditorName?.toLowerCase().includes(searchLower);
        if (!matchesLogin && !matchesProject && !matchesGroupId && !matchesAuditor) return false;
      }

      if (trackFilter !== 'all' && group.track !== trackFilter) return false;
      if (statusFilter === 'audited' && !group.isAudited) return false;
      if (statusFilter === 'pending' && group.isAudited) return false;
      if (statusFilter === 'warnings' && !group.hasWarnings) return false;
      if (projectFilter !== 'all' && group.projectName !== projectFilter) return false;

      // Filtre par priorité
      if (priorityFilter !== 'all') {
        const effectivePriority = getEffectivePriority(group);
        if (priorityFilter !== effectivePriority) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'project':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'track':
          comparison = a.track.localeCompare(b.track);
          break;
        case 'members':
          comparison = a.activeMembers - b.activeMembers;
          break;
        case 'status':
          comparison = (a.isAudited ? 1 : 0) - (b.isAudited ? 1 : 0);
          break;
        case 'date':
          const dateA = a.auditDate ? new Date(a.auditDate).getTime() : 0;
          const dateB = b.auditDate ? new Date(b.auditDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'validation':
          const rateA = a.activeMembers > 0 && a.validatedCount !== undefined
            ? a.validatedCount / a.activeMembers
            : -1;
          const rateB = b.activeMembers > 0 && b.validatedCount !== undefined
            ? b.validatedCount / b.activeMembers
            : -1;
          comparison = rateA - rateB;
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, warning: 1, normal: 2 };
          const priorityA = priorityOrder[getEffectivePriority(a)];
          const priorityB = priorityOrder[getEffectivePriority(b)];
          comparison = priorityA - priorityB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [groups, search, trackFilter, statusFilter, projectFilter, priorityFilter, sortField, sortDirection, manualPriorities]);

  const progressPercentage =
    stats.totalGroups > 0
      ? Math.round((stats.auditedGroups / stats.totalGroups) * 100)
      : 0;

  const withWarnings = groups.filter(g => g.hasWarnings).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="p-3 rounded-lg border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{stats.totalGroups}</p>
        </div>
        <div className="p-3 rounded-lg border border-green-200 bg-green-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-600">Audités</span>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold mt-1 text-green-700">{stats.auditedGroups}</p>
        </div>
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-600">En attente</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-700">{stats.pendingGroups}</p>
        </div>
        <div className="p-3 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-600">Warnings</span>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold mt-1 text-red-700">{withWarnings}</p>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Progression</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{progressPercentage}%</p>
          <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>

        <Select value={trackFilter} onValueChange={setTrackFilter}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue placeholder="Tronc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous troncs</SelectItem>
            {(['Golang', 'Javascript', 'Rust', 'Java'] as Track[]).map((track) => (
              <SelectItem key={track} value={track}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${trackColors[track]}`} />
                  {track}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="audited">Audités</SelectItem>
            <SelectItem value="warnings">Avec warnings</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue placeholder="Projet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous projets</SelectItem>
            {uniqueProjects.map((project) => (
              <SelectItem key={project} value={project}>
                {project}
              </SelectItem>
            ))}
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

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-2">
          <Filter className="h-3.5 w-3.5" />
          <span>{filteredAndSortedGroups.length} groupes</span>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[90px]">
                <SortButton field="status" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                  Statut
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="project" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                  Projet
                </SortButton>
              </TableHead>
              <TableHead className="w-[100px]">
                <SortButton field="track" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                  Tronc
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="members" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                  Membres
                </SortButton>
              </TableHead>
              <TableHead className="w-[90px]">
                <SortButton field="validation" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                  Valid.
                </SortButton>
              </TableHead>
              <TableHead className="w-[80px]">
                <SortButton field="priority" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                  Priorité
                </SortButton>
              </TableHead>
              <TableHead className="w-[100px]">Auditeur</TableHead>
              <TableHead className="w-[120px]">
                <SortButton field="date" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                  Date
                </SortButton>
              </TableHead>
              <TableHead className="w-[90px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Aucun groupe trouvé</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedGroups.map((group, idx) => {
                const validationRate = group.activeMembers > 0 && group.validatedCount !== undefined
                  ? Math.round((group.validatedCount / group.activeMembers) * 100)
                  : null;

                return (
                  <TableRow
                    key={`${group.track}-${group.projectName}-${group.groupId}-${idx}`}
                    className={`transition-colors ${
                      group.isAudited
                        ? group.priority === 'urgent'
                          ? 'bg-rose-50/50 hover:bg-rose-100/60'
                          : group.priority === 'warning'
                            ? 'bg-amber-50/50 hover:bg-amber-100/60'
                            : 'hover:bg-muted/50'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {group.isAudited ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Audité
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Attente
                          </Badge>
                        )}
                        {group.hasWarnings && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {group.warningsCount} warning(s)
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{group.projectName}</div>
                        <div className="text-xs text-muted-foreground font-mono">#{group.groupId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={trackBadgeColors[group.track]}>
                        {group.track}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {group.members.slice(0, 3).map((member, memberIdx) => (
                          <TooltipProvider key={`${group.groupId}-${member.login}-${memberIdx}`}>
                            <Tooltip>
                              <TooltipTrigger>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded bg-muted ${
                                    member.isDropout ? 'line-through opacity-50' : ''
                                  }`}
                                >
                                  {member.login}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {member.isDropout ? 'En perdition' : `${member.firstName || ''} ${member.lastName || ''}`}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                        {group.members.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{group.members.length - 3}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {group.activeMembers} actif(s)
                      </div>
                    </TableCell>
                    <TableCell>
                      {group.isAudited && validationRate !== null ? (
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
                          {group.validatedCount}/{group.activeMembers}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {group.isAudited ? (
                        group.priority === 'urgent' ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        ) : group.priority === 'warning' ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <Flag className="h-3 w-3 mr-1" />
                            Warning
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {(() => {
                                const effectivePriority = getEffectivePriority(group);
                                const isManual = !!manualPriorities[group.groupId];
                                if (effectivePriority === 'urgent') {
                                  return (
                                    <Badge variant="outline" className={`cursor-help ${isManual ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Urgent{isManual ? '*' : ''}
                                    </Badge>
                                  );
                                } else if (effectivePriority === 'warning') {
                                  return (
                                    <Badge variant="outline" className={`cursor-help ${isManual ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                      <Flag className="h-3 w-3 mr-1" />
                                      Warning{isManual ? '*' : ''}
                                    </Badge>
                                  );
                                } else {
                                  return (
                                    <Badge variant="outline" className={`cursor-help ${isManual ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                      Normal{isManual ? '*' : ''}
                                    </Badge>
                                  );
                                }
                              })()}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {manualPriorities[group.groupId] && (
                                <p className="text-xs text-blue-600 mb-1">* Priorité manuelle</p>
                              )}
                              <p className="font-medium mb-1">Score auto: {group.priorityScore ?? 0}</p>
                              {group.priorityReasons && group.priorityReasons.length > 0 ? (
                                <ul className="text-xs space-y-0.5">
                                  {group.priorityReasons.map((reason, i) => (
                                    <li key={i}>• {reason}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-muted-foreground">Aucun critère particulier</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell>
                      {group.auditorName ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[80px]">{group.auditorName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {group.auditDate ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="text-sm text-muted-foreground text-left">
                              {formatDistanceToNow(new Date(group.auditDate), { addSuffix: true, locale: fr })}
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(group.auditDate), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {group.isAudited ? (
                          <Button variant="ghost" size="sm" className="h-7" asChild>
                            <Link href={`/code-reviews/${promoId}/group/${group.groupId}`}>
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Voir
                            </Link>
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" className="h-7" asChild>
                              <Link
                                href={`/code-reviews/${promoId}/audit?groupId=${group.groupId}&project=${encodeURIComponent(group.projectName)}&track=${group.track}&priority=${getEffectivePriority(group)}`}
                              >
                                <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                                Auditer
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Modifier priorité</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleSetManualPriority(group.groupId, 'urgent')}
                                  className={getEffectivePriority(group) === 'urgent' ? 'bg-rose-50' : ''}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2 text-rose-500" />
                                  Urgent
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleSetManualPriority(group.groupId, 'warning')}
                                  className={getEffectivePriority(group) === 'warning' ? 'bg-amber-50' : ''}
                                >
                                  <Flag className="h-4 w-4 mr-2 text-amber-500" />
                                  Warning
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleSetManualPriority(group.groupId, 'normal')}
                                  className={getEffectivePriority(group) === 'normal' ? 'bg-muted' : ''}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                                  Normal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Priorités:</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] px-1.5 py-0">
            Urgent
          </Badge>
          <span>membres jamais audités</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
            Warning
          </Badge>
          <span>peu d'audits précédents</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-blue-600">*</span>
          <span>priorité manuelle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="line-through opacity-50">login</span>
          <span>En perdition</span>
        </div>
      </div>
    </div>
  );
}
