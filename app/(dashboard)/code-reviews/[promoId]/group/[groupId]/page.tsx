import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Users,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ClipboardCheck,
    User,
    Calendar,
    Edit,
} from 'lucide-react';
import { parsePromoId } from '@/lib/config/promotions';
import { fetchPromotionProgressions } from '@/lib/services/zone01';
import { getAuditById } from '@/lib/db/services/audits';
import { getDropoutLogins } from '@/lib/db/services/dropouts';
import { getTrackByProjectName } from '@/lib/config/projects';
import { db } from '@/lib/db/config';
import { audits } from '@/lib/db/schema/audits';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PageProps {
    params: Promise<{ promoId: string; groupId: string }>;
}

export default async function GroupDetailPage({ params }: PageProps) {
    const { promoId, groupId } = await params;
    const promo = parsePromoId(promoId);

    if (!promo) {
        notFound();
    }

    // Trouver l'audit pour ce groupe
    const audit = await db.query.audits.findFirst({
        where: eq(audits.groupId, groupId),
        with: { results: true },
    });

    if (!audit) {
        notFound();
    }

    const track = audit.track;
    const projectName = audit.projectName;

    // Récupérer les données Zone01 et dropouts
    const [progressions, dropoutLogins] = await Promise.all([
        fetchPromotionProgressions(String(promo.eventId)),
        getDropoutLogins(),
    ]);

    // Trouver le groupe dans les progressions
    const groupProgressions = progressions.filter(
        p => String(p.group.id) === groupId && p.object.name.toLowerCase() === projectName.toLowerCase()
    );

    const members = groupProgressions.map(p => ({
        login: p.user.login,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        grade: p.grade ?? null,
        isDropout: dropoutLogins.has(p.user.login.toLowerCase()),
    }));

    const resultsByLogin = new Map(
        audit.results.map((r) => [r.studentLogin.toLowerCase(), r])
    );

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/code-reviews/${promoId}`}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {projectName}
                        </h1>
                        <p className="text-muted-foreground">
                            Groupe #{groupId} • {promo.key} • {track}
                        </p>
                    </div>
                </div>
                <Button variant="outline" asChild>
                    <Link href={`/code-reviews/${promoId}/group/${groupId}/audit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Membres du groupe */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Membres du groupe
                        </CardTitle>
                        <CardDescription>
                            {members.length} membre(s)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {members.map((member) => {
                                const result = resultsByLogin.get(member.login.toLowerCase());

                                return (
                                    <div
                                        key={member.login}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${member.isDropout ? 'opacity-50 bg-muted/50' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded-full">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className={`font-medium ${member.isDropout ? 'line-through' : ''}`}>
                                                    {member.login}
                                                    {member.isDropout && (
                                                        <Badge variant="outline" className="ml-2 text-xs">
                                                            Perdition
                                                        </Badge>
                                                    )}
                                                </p>
                                                {(member.firstName || member.lastName) && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {member.firstName} {member.lastName}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {result && (
                                            <div className="flex items-center gap-2">
                                                {result.validated ? (
                                                    <Badge className="bg-green-100 text-green-800">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Validé
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive">
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Non validé
                                                    </Badge>
                                                )}
                                                {(result.warnings?.length ?? 0) > 0 && (
                                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Détails de l'audit */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardCheck className="h-5 w-5" />
                            Détails de l'audit
                        </CardTitle>
                        <CardDescription>
                            <div className="flex items-center gap-2 mt-1">
                                <User className="h-4 w-4" />
                                <span>par {audit.auditorName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    {format(new Date(audit.createdAt), 'PPP à HH:mm', { locale: fr })}
                                </span>
                            </div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Warnings globaux */}
                        {(audit.warnings?.length ?? 0) > 0 && (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <p className="font-medium text-amber-800 flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Warnings globaux
                                </p>
                                <ul className="list-disc list-inside text-sm text-amber-700">
                                    {audit.warnings?.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Compte rendu */}
                        {audit.summary && (
                            <div>
                                <p className="font-medium mb-2">Compte rendu</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {audit.summary}
                                </p>
                            </div>
                        )}

                        {/* Résultats individuels */}
                        <div>
                            <p className="font-medium mb-2">Résultats ({audit.results.length})</p>
                            <div className="space-y-2">
                                {audit.results.map((result) => (
                                    <div
                                        key={result.id}
                                        className="p-3 rounded-lg border bg-muted/30"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">{result.studentLogin}</span>
                                            {result.validated ? (
                                                <Badge className="bg-green-100 text-green-800">
                                                    Validé
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">Non validé</Badge>
                                            )}
                                        </div>
                                        {result.feedback && (
                                            <p className="text-sm text-muted-foreground mb-2">
                                                {result.feedback}
                                            </p>
                                        )}
                                        {(result.warnings?.length ?? 0) > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {result.warnings?.map((w, i) => (
                                                    <Badge
                                                        key={i}
                                                        variant="outline"
                                                        className="text-xs bg-amber-50 text-amber-700"
                                                    >
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        {w}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
