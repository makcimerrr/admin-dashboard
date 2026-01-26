import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ClipboardCheck,
    ArrowRight,
    Calendar,
    Users,
} from 'lucide-react';
import { getActivePromotions } from '@/lib/config/promotions';

export default function CodeReviewsPage() {
    const promotions = getActivePromotions();

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Code Reviews</h1>
                    <p className="text-muted-foreground">
                        Suivi des audits pédagogiques par promotion
                    </p>
                </div>
            </div>

            {/* Liste des promotions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Sélectionner une promotion
                    </CardTitle>
                    <CardDescription>
                        Choisissez une promotion pour gérer les code reviews
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {promotions.map((promo) => (
                            <Link
                                key={promo.eventId}
                                href={`/code-reviews/${promo.eventId}`}
                                className="block"
                            >
                                <Card className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/50 h-full">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-lg">{promo.key}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {promo.title}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                {new Date(promo.dates.start).toLocaleDateString('fr-FR')} - {new Date(promo.dates.end).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-muted/30">
                <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Les audits ne peuvent être effectués que sur les groupes
                        dont le projet a le statut <Badge variant="outline">finished</Badge>.
                        Les étudiants en perdition sont marqués mais exclus des statistiques.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
