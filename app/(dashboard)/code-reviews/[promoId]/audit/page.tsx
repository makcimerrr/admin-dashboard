'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    ClipboardCheck,
    User,
    UserX,
    Save,
    AlertTriangle,
    Loader2,
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

            router.push(`/code-reviews/${promoId}`);
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
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                        <p className="text-red-700">Paramètres manquants. Veuillez sélectionner un groupe depuis la liste.</p>
                        <Button variant="outline" className="mt-4" asChild>
                            <Link href={`/code-reviews/${promoId}`}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Retour
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
                <div className="grid gap-6 lg:grid-cols-2">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (error || !groupData) {
        return (
            <div className="p-6">
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                        <p className="text-red-700">{error || 'Groupe non trouvé'}</p>
                        <Button variant="outline" className="mt-4" asChild>
                            <Link href={`/code-reviews/${promoId}`}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Retour
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const activeMembers = groupData.members.filter(m => !m.isDropout);

    return (
        <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/code-reviews/${promoId}`}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
                        <ClipboardCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                            Nouvel audit
                        </h1>
                        <p className="text-muted-foreground">
                            {groupData.projectName} • Groupe #{groupData.groupId}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{groupData.track}</Badge>
                    <Badge variant="outline">{groupData.promoName}</Badge>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Formulaire principal */}
                <Card>
                    <CardHeader>
                        <CardTitle>Compte rendu global</CardTitle>
                        <CardDescription>
                            Observations générales sur le groupe
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Résumé</Label>
                            <Textarea
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                placeholder="Observations générales sur le projet..."
                                className="mt-1"
                                rows={4}
                            />
                        </div>

                        <div>
                            <Label className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Warnings globaux
                            </Label>
                            <div className="space-y-2 mt-2">
                                {globalWarnings.map((w, i) => (
                                    <div key={i} className="flex gap-2">
                                        <Input
                                            value={w}
                                            onChange={(e) => {
                                                const newWarnings = [...globalWarnings];
                                                newWarnings[i] = e.target.value;
                                                setGlobalWarnings(newWarnings);
                                            }}
                                            placeholder="Warning..."
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setGlobalWarnings(prev => prev.filter((_, idx) => idx !== i))}
                                        >
                                            ×
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setGlobalWarnings(prev => [...prev, ''])}
                                >
                                    + Ajouter un warning
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Évaluation par membre */}
                <Card>
                    <CardHeader>
                        <CardTitle>Évaluation individuelle</CardTitle>
                        <CardDescription>
                            {activeMembers.length} membre(s) actif(s)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {memberResults.map((result) => {
                            const member = activeMembers.find(m => m.login === result.login);
                            if (!member) return null;

                            return (
                                <div key={result.login} className="p-4 rounded-lg border">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {result.absent ? (
                                                <UserX className="h-4 w-4 text-orange-500" />
                                            ) : (
                                                <User className="h-4 w-4" />
                                            )}
                                            <span className={`font-medium ${result.absent ? 'text-orange-600' : ''}`}>{result.login}</span>
                                            {member.firstName && (
                                                <span className="text-sm text-muted-foreground">
                                                    ({member.firstName})
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`absent-${result.login}`} className={`text-sm ${result.absent ? 'text-orange-600 font-medium' : ''}`}>
                                                    {result.absent ? 'Absent' : 'Présent'}
                                                </Label>
                                                <Switch
                                                    id={`absent-${result.login}`}
                                                    checked={result.absent}
                                                    onCheckedChange={(checked) => {
                                                        updateMemberResult(result.login, { absent: checked });
                                                        if (checked) {
                                                            updateMemberResult(result.login, { validated: false });
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`validated-${result.login}`} className={`text-sm ${result.absent ? 'opacity-50' : ''}`}>
                                                    {result.validated ? 'Validé' : 'Non validé'}
                                                </Label>
                                                <Switch
                                                    id={`validated-${result.login}`}
                                                    checked={result.validated}
                                                    disabled={result.absent}
                                                    onCheckedChange={(checked) =>
                                                        updateMemberResult(result.login, { validated: checked })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Textarea
                                        value={result.feedback}
                                        onChange={(e) =>
                                            updateMemberResult(result.login, { feedback: e.target.value })
                                        }
                                        placeholder="Feedback individuel (optionnel)..."
                                        rows={2}
                                    />
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Button variant="outline" asChild>
                    <Link href={`/code-reviews/${promoId}`}>
                        Annuler
                    </Link>
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enregistrement...
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
    );
}
