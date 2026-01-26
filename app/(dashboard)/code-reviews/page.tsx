'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, ArrowRight, Calendar, Users } from 'lucide-react';
import { getActivePromotions } from '@/lib/config/promotions';

async function safeFetch(path: string): Promise<any[]> {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      console.error(`safeFetch failed: ${path} -> ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error(`safeFetch error for ${path}:`, err);
    return [];
  }
}

export default function CodeReviewsPage() {
  const [recentReviews, setRecentReviews] = useState<any[] | null>(null);
  const [urgentReviews, setUrgentReviews] = useState<any[] | null>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [recent, urgent] = await Promise.all([
          safeFetch('/api/code-reviews/recent'),
          safeFetch('/api/code-reviews/urgent')
        ]);
        if (!mounted) return;
        setRecentReviews(recent);
        setUrgentReviews(urgent);
      } catch (e) {
        if (!mounted) return;
        setError('Erreur lors du chargement des données.');
        setRecentReviews([]);
        setUrgentReviews([]);
      }
    }

    // load promotions (local config)
    try {
      const promos = getActivePromotions();
      setPromotions(promos);
    } catch (e) {
      // if promotions fail, keep empty
      console.error('Failed to load promotions', e);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const isLoading = recentReviews === null || urgentReviews === null;

  return (
    <div className="flex flex-col gap-6 p-6">
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Derniers code reviews réalisés</CardTitle>
            <CardDescription>
              Les audits pédagogiques les plus récents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">{error}</div>
            ) : recentReviews && recentReviews.length > 0 ? (
              <ul className="space-y-3">
                {recentReviews.map((review: any) => (
                  <li key={review.id}>
                    <Link
                      href={`/code-reviews/${review.promoId}/group/${review.groupName}`}
                      className="flex items-center justify-between p-3 hover:bg-muted/40 rounded-md transition group cursor-pointer"
                      aria-label={`Open code review for ${review.projectName}`}
                    >
                      <div>
                        <p className="font-medium">{review.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {review.promotionName} ·{' '}
                          {new Date(review.reviewedAt).toLocaleDateString(
                            'fr-FR'
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {review.groupMembers.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{review.status}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-70 transform transition group-hover:translate-x-1" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                <p className="font-medium">Aucun code review trouvé</p>
                <p className="text-xs">Aucune entrée récente disponible.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Code reviews urgents
            </CardTitle>
            <CardDescription>
              Groupes nécessitant une intervention rapide
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">{error}</div>
            ) : urgentReviews && urgentReviews.length > 0 ? (
              <ul className="space-y-3">
                {urgentReviews.map((review: any) => (
                  <li
                    key={review.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{review.groupName}</p>
                      <p className="text-xs text-muted-foreground">
                        Promotion {review.promotion} · {review.reason}
                      </p>
                    </div>
                    <Badge variant="destructive">Urgent</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                <p className="font-medium">Aucun code review urgent</p>
                <p className="text-xs">
                  Aucun groupe n'est actuellement marqué comme urgent.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
            {promotions.length === 0
              ? [...Array(3)].map((_, i) => (
                  <div key={i} className="block">
                    <Card className="h-full">
                      <CardContent className="p-4">
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </CardContent>
                    </Card>
                  </div>
                ))
              : promotions.map((promo) => (
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
                            {new Date(promo.dates.start).toLocaleDateString(
                              'fr-FR'
                            )}{' '}
                            -{' '}
                            {new Date(promo.dates.end).toLocaleDateString(
                              'fr-FR'
                            )}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Les audits ne peuvent être effectués que sur
            les groupes dont le projet a le statut{' '}
            <Badge variant="outline">finished</Badge>. Les étudiants en
            perdition sont marqués mais exclus des statistiques.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
