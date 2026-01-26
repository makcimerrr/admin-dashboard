'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    CheckCircle2,
    Clock,
    Search,
    Filter,
    ClipboardCheck,
    AlertTriangle,
    Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types client-safe (pas d'import drizzle)
type Track = 'Golang' | 'Javascript' | 'Rust' | 'Java';

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
    'Golang': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Javascript': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Rust': 'bg-orange-100 text-orange-800 border-orange-200',
    'Java': 'bg-red-100 text-red-800 border-red-200',
};

export function GroupsTable({ promoId, groups, stats }: GroupsTableProps) {
    const [search, setSearch] = useState('');
    const [trackFilter, setTrackFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');

    // Extraire les projets uniques
    const uniqueProjects = useMemo(() => {
        const projects = new Set(groups.map(g => g.projectName));
        return Array.from(projects).sort();
    }, [groups]);

    // Filtrer les groupes
    const filteredGroups = useMemo(() => {
        return groups.filter(group => {
            // Filtre recherche (login des membres)
            if (search) {
                const searchLower = search.toLowerCase();
                const matchesLogin = group.members.some(m =>
                    m.login.toLowerCase().includes(searchLower)
                );
                const matchesProject = group.projectName.toLowerCase().includes(searchLower);
                if (!matchesLogin && !matchesProject) return false;
            }

            // Filtre track
            if (trackFilter !== 'all' && group.track !== trackFilter) return false;

            // Filtre statut audit
            if (statusFilter === 'audited' && !group.isAudited) return false;
            if (statusFilter === 'pending' && group.isAudited) return false;

            // Filtre projet
            if (projectFilter !== 'all' && group.projectName !== projectFilter) return false;

            return true;
        });
    }, [groups, search, trackFilter, statusFilter, projectFilter]);

    return (
        <div className="space-y-4">
            {/* Stats rapides */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">{stats.totalGroups}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs text-green-600">Audités</p>
                    <p className="text-xl font-bold text-green-700">{stats.auditedGroups}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-600">En attente</p>
                    <p className="text-xl font-bold text-amber-700">{stats.pendingGroups}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 col-span-2 md:col-span-2">
                    <p className="text-xs text-blue-600 mb-1">Progression</p>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{
                                    width: `${stats.totalGroups > 0
                                        ? (stats.auditedGroups / stats.totalGroups) * 100
                                        : 0}%`
                                }}
                            />
                        </div>
                        <span className="text-sm font-medium text-blue-700">
                            {stats.totalGroups > 0
                                ? Math.round((stats.auditedGroups / stats.totalGroups) * 100)
                                : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un login ou projet..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8"
                    />
                </div>

                <Select value={trackFilter} onValueChange={setTrackFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Tronc" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les troncs</SelectItem>
                        <SelectItem value="Golang">Golang</SelectItem>
                        <SelectItem value="Javascript">Javascript</SelectItem>
                        <SelectItem value="Rust">Rust</SelectItem>
                        <SelectItem value="Java">Java</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="audited">Audités</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Projet" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les projets</SelectItem>
                        {uniqueProjects.map(project => (
                            <SelectItem key={project} value={project}>
                                {project}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground flex items-center">
                    <Filter className="h-4 w-4 mr-1" />
                    {filteredGroups.length} groupes
                </div>
            </div>

            {/* Tableau */}
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[100px]">Statut</TableHead>
                            <TableHead>Projet</TableHead>
                            <TableHead className="w-[100px]">Tronc</TableHead>
                            <TableHead>Membres</TableHead>
                            <TableHead className="w-[150px]">Auditeur</TableHead>
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredGroups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Aucun groupe trouvé
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredGroups.map((group, groupIndex) => (
                                <TableRow
                                    key={`${group.track}-${group.projectName}-${group.groupId}-${groupIndex}`}
                                    className={!group.isAudited ? 'bg-amber-50/50' : ''}
                                >
                                    <TableCell>
                                        {group.isAudited ? (
                                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Audité
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                <Clock className="h-3 w-3 mr-1" />
                                                En attente
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{group.projectName}</div>
                                        <div className="text-xs text-muted-foreground">
                                            #{group.groupId}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={trackColors[group.track]}>
                                            {group.track}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {group.members.map((member, idx) => (
                                                <Badge
                                                    key={`${group.projectName}-${group.groupId}-${member.login}-${idx}`}
                                                    variant="secondary"
                                                    className={`text-xs ${member.isDropout ? 'opacity-50 line-through' : ''}`}
                                                    title={member.isDropout ? 'En perdition' : undefined}
                                                >
                                                    {member.login}
                                                    {member.isDropout && (
                                                        <AlertTriangle className="h-3 w-3 ml-1 text-amber-500" />
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                        {group.activeMembers < group.members.length && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {group.activeMembers} actif(s) / {group.members.length}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {group.auditorName || (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {group.auditDate ? (
                                            <span className="text-sm">
                                                {formatDistanceToNow(new Date(group.auditDate), {
                                                    addSuffix: true,
                                                    locale: fr,
                                                })}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {group.isAudited ? (
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/code-reviews/${promoId}/group/${group.groupId}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button size="sm" asChild>
                                                <Link href={`/code-reviews/${promoId}/audit?groupId=${group.groupId}&project=${encodeURIComponent(group.projectName)}&track=${group.track}`}>
                                                    <ClipboardCheck className="h-4 w-4 mr-1" />
                                                    Auditer
                                                </Link>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
