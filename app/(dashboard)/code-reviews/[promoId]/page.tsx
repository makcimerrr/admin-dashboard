import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft,
    ClipboardCheck,
    Users,
    BarChart3,
} from 'lucide-react';
import { parsePromoId } from '@/lib/config/promotions';
import { fetchPromotionProgressions, buildProjectGroups } from '@/lib/services/zone01';
import { getAuditsByPromoAndTrack } from '@/lib/db/services/audits';
import { getDropoutLogins } from '@/lib/db/services/dropouts';
import { getProjectNamesByTrack } from '@/lib/config/projects';
import { GroupsTable } from '@/components/code-reviews/groups-table';
import { evaluatePendingPriorities } from '@/lib/services/pending-priority';
import type { Track } from '@/lib/db/schema/audits';

interface PageProps {
    params: Promise<{ promoId: string }>;
}

const TRACKS: Track[] = ['Golang', 'Javascript', 'Rust', 'Java'];

async function PromoContent({ promoId }: { promoId: string }) {
    const promo = parsePromoId(promoId);

    if (!promo) {
        notFound();
    }

    // Récupérer les données en parallèle
    const [progressions, dropoutLogins, ...auditsPerTrack] = await Promise.all([
        fetchPromotionProgressions(String(promo.eventId)),
        getDropoutLogins(),
        ...TRACKS.map(track => getAuditsByPromoAndTrack(String(promo.eventId), track)),
    ]);

    // Construire les audits par track
    const auditsByTrack = Object.fromEntries(
        TRACKS.map((track, i) => [track, auditsPerTrack[i]])
    ) as Record<Track, typeof auditsPerTrack[0]>;

    // Construire tous les groupes finished
    const allGroups: {
        groupId: string;
        projectName: string;
        track: Track;
        status: string;
        members: {
            login: string;
            firstName?: string;
            lastName?: string;
            grade: number | null;
            isDropout: boolean;
        }[];
        isAudited: boolean;
        auditId?: number;
        auditorName?: string;
        auditDate?: string;
        activeMembers: number;
        // Nouveaux champs
        hasWarnings?: boolean;
        warningsCount?: number;
        validatedCount?: number;
        priority?: 'urgent' | 'warning' | 'normal';
    }[] = [];

    for (const track of TRACKS) {
        const projectNames = getProjectNamesByTrack(track);
        const audits = auditsByTrack[track];
        const auditsByGroupId = new Map(audits.map(a => [a.groupId, a]));

        for (const projectName of projectNames) {
            const groups = buildProjectGroups(progressions, projectName);

            for (const group of groups) {
                if (group.status !== 'finished') continue;

                const audit = auditsByGroupId.get(group.groupId);
                const membersWithDropout = group.members.map(m => ({
                    ...m,
                    isDropout: dropoutLogins.has(m.login.toLowerCase()),
                }));
                const activeMembers = membersWithDropout.filter(m => !m.isDropout).length;

                // Ignorer les groupes où tous les membres sont en perdition
                if (activeMembers === 0) continue;

                // Calculer les stats de validation si audité
                let hasWarnings = false;
                let warningsCount = 0;
                let validatedCount = 0;
                let priority: 'urgent' | 'warning' | 'normal' = 'normal';

                if (audit) {
                    const globalWarnings = audit.warnings?.length || 0;
                    const memberWarnings = audit.results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);
                    warningsCount = globalWarnings + memberWarnings;
                    hasWarnings = warningsCount > 0;
                    validatedCount = audit.results.filter(r => r.validated).length;

                    const validationRate = activeMembers > 0 ? (validatedCount / activeMembers) * 100 : 100;

                    if (hasWarnings || validationRate < 30) {
                        priority = 'urgent';
                    } else if (validationRate < 50) {
                        priority = 'warning';
                    }
                }

                allGroups.push({
                    groupId: group.groupId,
                    projectName,
                    track,
                    status: group.status,
                    members: membersWithDropout,
                    isAudited: !!audit,
                    auditId: audit?.id,
                    auditorName: audit?.auditorName,
                    auditDate: audit?.createdAt.toISOString(),
                    activeMembers,
                    hasWarnings,
                    warningsCount,
                    validatedCount,
                    priority,
                });
            }
        }
    }

    // Calculer les stats
    const stats = {
        totalGroups: allGroups.length,
        auditedGroups: allGroups.filter(g => g.isAudited).length,
        pendingGroups: allGroups.filter(g => !g.isAudited).length,
        byTrack: {} as Record<Track, { total: number; audited: number }>,
    };

    for (const track of TRACKS) {
        const trackGroups = allGroups.filter(g => g.track === track);
        stats.byTrack[track] = {
            total: trackGroups.length,
            audited: trackGroups.filter(g => g.isAudited).length,
        };
    }

    // Évaluer les priorités des groupes en attente
    const pendingGroups = allGroups.filter(g => !g.isAudited);
    const pendingEvaluation = await evaluatePendingPriorities(
        String(promo.eventId),
        pendingGroups.map(g => ({
            groupId: g.groupId,
            projectName: g.projectName,
            track: g.track,
            members: g.members.map(m => ({ login: m.login, isDropout: m.isDropout })),
            activeMembers: g.activeMembers,
        }))
    );

    // Créer un map des priorités évaluées
    const pendingPriorityMap = new Map(
        pendingEvaluation.groups.map(g => [g.groupId, g])
    );

    // Mettre à jour les groupes en attente avec leurs priorités évaluées
    for (const group of allGroups) {
        if (!group.isAudited) {
            const evalData = pendingPriorityMap.get(group.groupId);
            if (evalData) {
                group.priority = evalData.priority;
                // Stocker les raisons dans un champ temporaire pour affichage
                (group as any).priorityReasons = evalData.reasons;
                (group as any).priorityScore = evalData.priorityScore;
            }
        }
    }

    // Trier: par priorité d'abord (urgent > warning > normal), puis non audités, puis par projet
    const priorityOrder = { urgent: 0, warning: 1, normal: 2 };
    allGroups.sort((a, b) => {
        // D'abord par statut audité
        if (a.isAudited !== b.isAudited) return a.isAudited ? 1 : -1;
        // Ensuite par priorité
        const priorityA = priorityOrder[a.priority || 'normal'];
        const priorityB = priorityOrder[b.priority || 'normal'];
        if (priorityA !== priorityB) return priorityA - priorityB;
        // Enfin par nom de projet
        return a.projectName.localeCompare(b.projectName);
    });

    return (
        <Tabs defaultValue="table" className="space-y-4">
            <div className="flex items-center justify-between">
                <TabsList>
                    <TabsTrigger value="table" className="gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Groupes
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Statistiques
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="table" className="mt-0">
                <GroupsTable
                    promoId={String(promo.eventId)}
                    groups={allGroups}
                    stats={stats}
                />
            </TabsContent>

            <TabsContent value="stats" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {TRACKS.map(track => {
                        const trackStats = stats.byTrack[track];
                        const percentage = trackStats.total > 0
                            ? Math.round((trackStats.audited / trackStats.total) * 100)
                            : 0;

                        return (
                            <Card key={track}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center justify-between">
                                        {track}
                                        <Badge variant="outline">
                                            {trackStats.audited}/{trackStats.total}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Progression</span>
                                            <span className="font-medium">{percentage}%</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>{trackStats.audited} audités</span>
                                            <span>{trackStats.total - trackStats.audited} en attente</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Résumé global */}
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Résumé global
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="text-center p-4 rounded-lg bg-muted/50">
                                <p className="text-3xl font-bold">{stats.totalGroups}</p>
                                <p className="text-sm text-muted-foreground">Groupes finished</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-green-50">
                                <p className="text-3xl font-bold text-green-700">{stats.auditedGroups}</p>
                                <p className="text-sm text-green-600">Groupes audités</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-amber-50">
                                <p className="text-3xl font-bold text-amber-700">{stats.pendingGroups}</p>
                                <p className="text-sm text-amber-600">En attente d'audit</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

export default async function PromoCodeReviewsPage({ params }: PageProps) {
    const { promoId } = await params;
    const promo = parsePromoId(promoId);

    if (!promo) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6">
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
                        <h1 className="text-2xl font-bold tracking-tight">
                            Code Reviews - {promo.key}
                        </h1>
                        <p className="text-muted-foreground">
                            {promo.title}
                        </p>
                    </div>
                </div>
            </div>

            <Suspense
                fallback={
                    <div className="space-y-4">
                        <div className="grid grid-cols-5 gap-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Skeleton key={i} className="h-20" />
                            ))}
                        </div>
                        <Skeleton className="h-12" />
                        <Skeleton className="h-96" />
                    </div>
                }
            >
                <PromoContent promoId={promoId} />
            </Suspense>
        </div>
    );
}
