'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ClipboardCheck,
    ArrowRight,
    Users,
    AlertCircle,
} from 'lucide-react';

type TrackStats = {
    track: string;
    pendingStudents: number;
    totalStudents: number;
    auditProgress: number;
};

type PromoStats = {
    promoId: string;
    promoName: string;
    totalPendingStudents: number;
    tracks: TrackStats[];
};

type CodeReviewsData = {
    promos: PromoStats[];
    totalPending: number;
    recentAuditsCount: number;
};

// Couleurs par tronc
const trackColors: Record<string, string> = {
    'Golang': 'bg-cyan-500',
    'Javascript': 'bg-yellow-500',
    'Rust': 'bg-orange-500',
    'Java': 'bg-red-500',
};

export default function CodeReviewsWidget() {
    const [data, setData] = useState<CodeReviewsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/widgets/code-reviews');
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                    setError(null);
                } else {
                    setError('Erreur de chargement');
                }
            } catch (err) {
                console.error('Error fetching code reviews data:', err);
                setError('Erreur de connexion');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 minutes
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-60" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((j) => (
                                    <Skeleton key={j} className="h-8" />
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5" />
                        Code Reviews
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{error || 'Aucune donnée disponible'}</p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" asChild className="w-full">
                        <Link href="/code-reviews">
                            Accéder aux Code Reviews
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5" />
                        Code Reviews
                    </CardTitle>
                    {data.totalPending > 0 && (
                        <Badge variant="destructive" className="font-normal">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {data.totalPending} en attente
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    Suivi des audits pédagogiques par promotion
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {data.promos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune promotion active
                    </p>
                ) : (
                    data.promos.map((promo) => (
                        <div key={promo.promoId} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{promo.promoName}</h4>
                                {promo.totalPendingStudents > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                        <Users className="h-3 w-3 mr-1" />
                                        {promo.totalPendingStudents} restant(s)
                                    </Badge>
                                )}
                            </div>

                            {/* Barres de progression par tronc */}
                            <div className="grid grid-cols-4 gap-2">
                                {promo.tracks.map((track) => (
                                    <div key={track.track} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground truncate">
                                                {track.track.slice(0, 2)}
                                            </span>
                                            <span className="font-medium">{track.auditProgress}%</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${trackColors[track.track] || 'bg-primary'}`}
                                                style={{ width: `${track.auditProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
            <CardFooter className="pt-2">
                <Button variant="outline" asChild className="w-full">
                    <Link href="/code-reviews">
                        Voir tous les code reviews
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
