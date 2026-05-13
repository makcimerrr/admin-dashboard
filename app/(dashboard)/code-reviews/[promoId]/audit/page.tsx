'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingCard } from '@/components/ui/loading-card';
import GlobalWarningsEditor from '@/components/code-reviews/global-warnings-editor';
import {
    ArrowLeft,
    ClipboardCheck,
    User,
    UserX,
    Save,
    AlertTriangle,
    Loader2,
    Crown,
} from 'lucide-react';

interface GroupMember {
    login: string;
    firstName?: string;
    lastName?: string;
    grade: number | null;
    isDropout: boolean;
}

interface GroupData {
    groupId: string;
    projectName: string;
    track: string;
    members: GroupMember[];
    promoId: string;
    promoName: string;
    captainLogin?: string;
}

interface MemberResult {
    login: string;
    validated: boolean;
    absent: boolean;
    feedback: string;
    warnings: string[];
}

export default function AuditPage({ params }: { params: Promise<{ promoId: string }> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [promoId, setPromoId] = useState<string>('');

    const groupId = searchParams.get('groupId');
    const projectName = searchParams.get('project');
    const track = searchParams.get('track');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [groupData, setGroupData] = useState<GroupData | null>(null);

    // Form state
    const [summary, setSummary] = useState('');
    const [globalWarnings, setGlobalWarnings] = useState<string[]>([]);
    const [memberResults, setMemberResults] = useState<MemberResult[]>([]);

    // Resolve params
    useEffect(() => {
        params.then(p => setPromoId(p.promoId));
    }, [params]);

    // Fetch group data
    useEffect(() => {
        if (!promoId || !groupId || !projectName || !track) return;

        async function fetchData() {
            try {
                setLoading(true);
                const res = await fetch(
                    `/api/code-reviews/groups?promoId=${promoId}&project=${encodeURIComponent(projectName!)}`
                );
                if (!res.ok) throw new Error('Erreur lors du chargement');

                const data = await res.json();
                const group = data.groups.find((g: GroupData) => g.groupId === groupId);

                if (!group) throw new Error('Groupe non trouvé');

                setGroupData({
                    ...group,
                    promoId: data.promoId,
                    promoName: data.promoName,
                });

                // Initialiser les résultats des membres
                setMemberResults(
                    group.members
                        .filter((m: GroupMember) => !m.isDropout)
                        .map((m: GroupMember) => ({
                            login: m.login,
                            validated: true,
                            absent: false,
                            feedback: '',
                            warnings: [],
                        }))
                );
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur inconnue');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [promoId, groupId, projectName, track]);

    const handleSubmit = async () => {
        if (!groupData) return;

        try {
            setSaving(true);
            const res = await fetch('/api/code-reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promoId: groupData.promoId,
                    track: groupData.track,
                    projectName: groupData.projectName,
                    groupId: groupData.groupId,
                    summary,
                    warnings: globalWarnings.filter(w => w.trim()),
                    results: memberResults.map(r => ({
                        studentLogin: r.login,
                        validated: r.validated,
                        absent: r.absent,
                        feedback: r.feedback || null,
                        warnings: r.warnings.filter(w => w.trim()),
                    })),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erreur lors de la sauvegarde');
            }

            router.push(`/code-reviews/${promoId}/group/${groupData.groupId}?saved=1`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setSaving(false);
        }
    };

    const updateMemberResult = (login: string, updates: Partial<MemberResult>) => {
        setMemberResults(prev =>
            prev.map(r => r.login === login ? { ...r, ...updates } : r)
        );
    };

    if (!groupId || !projectName || !track) {
        return (
            <div className="p-6">
                <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                        <p className="text-red-700 dark:text-red-400">Paramètres manquants. Veuillez sélectionner un groupe depuis la liste.</p>
                        <Button variant="outline" className="mt-4" asChild>
                            <Link href={`/code-reviews/${promoId}/group`}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Retour à la liste des groupes
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
                <Skeleton className="h-12 w-96" />
                <LoadingCard count={2} columns={2} height="lg" />
            </div>
        );
    }

    if (error || !groupData) {
        return (
            <div className="p-6">
                <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                        <p className="text-red-700 dark:text-red-400">{error || 'Groupe non trouvé'}</p>
                        <Button variant="outline" className="mt-4" asChild>
                            <Link href={`/code-reviews/${promoId}/group`}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Retour à la liste des groupes
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const activeMembers = groupData.members.filter(m => !m.isDropout);
    const validatedCount = memberResults.filter(r => r.validated && !r.absent).length;
    const absentCount = memberResults.filter(r => r.absent).length;

    return (
        <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link
                            href={`/code-reviews/${promoId}/group`}
                            aria-label="Retour à la liste des groupes"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <ClipboardCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                            Nouvel audit
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {groupData.projectName} • Groupe #{groupData.groupId}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{groupData.track}</Badge>
                    <Badge variant="outline">{groupData.promoName}</Badge>
                </div>
            </div>

            {/* Section 1 — Compte rendu */}
            <Card>
                <CardHeader>
                    <CardTitle>Compte rendu global</CardTitle>
                    <CardDescription>
                        Observations générales sur le groupe et warnings transverses.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div>
                        <Label htmlFor="audit-summary">Résumé</Label>
                        <Textarea
                            id="audit-summary"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Observations générales sur le projet…"
                            className="mt-1.5"
                            rows={5}
                        />
                    </div>

                    <div>
                        <Label className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Warnings globaux
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1 mb-2">
                            S'appliquent à l'ensemble du groupe (laisser vide si aucun).
                        </p>
                        <GlobalWarningsEditor
                            value={globalWarnings}
                            onChange={setGlobalWarnings}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Section 2 — Évaluation individuelle */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <CardTitle>Évaluation individuelle</CardTitle>
                            <CardDescription>
                                Statut, feedback et warnings par membre.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">
                                {validatedCount} validé{validatedCount > 1 ? 's' : ''}
                            </Badge>
                            {absentCount > 0 && (
                                <Badge variant="outline" className="text-orange-700 dark:text-orange-400 border-orange-500/30">
                                    {absentCount} absent{absentCount > 1 ? 's' : ''}
                                </Badge>
                            )}
                            <span className="tabular-nums">
                                / {activeMembers.length} membres
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {memberResults.map((result) => {
                        const member = activeMembers.find(m => m.login === result.login);
                        if (!member) return null;
                        const isCaptain = groupData?.captainLogin === result.login;

                        return (
                            <div
                                key={result.login}
                                className={`p-4 rounded-lg border space-y-3 transition-colors ${
                                    result.absent
                                        ? 'bg-orange-500/5 border-orange-500/20'
                                        : 'bg-card'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {result.absent ? (
                                            <UserX className="h-4 w-4 text-orange-500 shrink-0" />
                                        ) : (
                                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                        )}
                                        <span
                                            className={`font-medium truncate ${
                                                result.absent ? 'text-orange-700 dark:text-orange-400' : ''
                                            }`}
                                        >
                                            {result.login}
                                        </span>
                                        {isCaptain && (
                                            <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                        )}
                                        {member.firstName && (
                                            <span className="text-sm text-muted-foreground truncate">
                                                {member.firstName}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id={`absent-${result.login}`}
                                                checked={result.absent}
                                                onCheckedChange={(checked) => {
                                                    updateMemberResult(result.login, {
                                                        absent: checked,
                                                        ...(checked ? { validated: false } : {}),
                                                    });
                                                }}
                                            />
                                            <Label
                                                htmlFor={`absent-${result.login}`}
                                                className="text-sm cursor-pointer"
                                            >
                                                Absent
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id={`validated-${result.login}`}
                                                checked={result.validated}
                                                disabled={result.absent}
                                                onCheckedChange={(checked) =>
                                                    updateMemberResult(result.login, { validated: checked })
                                                }
                                            />
                                            <Label
                                                htmlFor={`validated-${result.login}`}
                                                className={`text-sm cursor-pointer ${
                                                    result.absent
                                                        ? 'text-muted-foreground/50'
                                                        : result.validated
                                                            ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                                            : ''
                                                }`}
                                            >
                                                {result.validated ? 'Validé' : 'Non validé'}
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                {!result.absent && (
                                    <Textarea
                                        value={result.feedback}
                                        onChange={(e) =>
                                            updateMemberResult(result.login, { feedback: e.target.value })
                                        }
                                        placeholder="Feedback individuel (optionnel)…"
                                        rows={2}
                                        className="text-sm"
                                    />
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Sticky save bar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t md:left-[var(--sidebar-width,0)]">
                <div className="page-container flex items-center justify-between gap-3 p-3 md:p-4">
                    <div className="text-xs text-muted-foreground hidden sm:block">
                        {validatedCount}/{activeMembers.length} validés
                        {absentCount > 0 && ` • ${absentCount} absent${absentCount > 1 ? 's' : ''}`}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/code-reviews/${promoId}/group`}>Annuler</Link>
                        </Button>
                        <Button size="sm" onClick={handleSubmit} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Enregistrement…
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Enregistrer l'audit
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
