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

export default async function CodeReviewsPage() {
  const promotions = getActivePromotions();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  async function safeFetch(path: string): Promise<any[]> {
    try {
      const url = new URL(path, baseUrl).toString();
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const text = await res.text();
        console.error(`safeFetch failed: ${url} -> ${res.status}`, text);
        return [];
      }
      const data = await res.json();
      // Server-side debug: logs will appear in the Next.js server terminal
      /*try {
        console.log(
          `safeFetch success: ${url} ->`,
          Array.isArray(data) ? `array(${data.length})` : data
        );
      } catch (e) {
        /!* ignore logging errors *!/
      }*/
      return data;
    } catch (err) {
      console.error(`safeFetch error for ${path}:`, err);
      return [];
    }
  }

  const [recentReviews, urgentReviews] = await Promise.all([
    safeFetch('/api/code-reviews/recent'),
    safeFetch('/api/code-reviews/urgent')
  ]);

  // Server-side debug: these appear in the server terminal (not the browser console)
  /*console.log(
    'fetched recentReviews count:',
    Array.isArray(recentReviews) ? recentReviews.length : typeof recentReviews
  );
  console.log(
    'fetched urgentReviews count:',
    Array.isArray(urgentReviews) ? urgentReviews.length : typeof urgentReviews
  );*/

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

      {/* Aperçu des code reviews */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Derniers code reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Derniers code reviews réalisés</CardTitle>
            <CardDescription>
              Les audits pédagogiques les plus récents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!recentReviews || recentReviews.length === 0 ? (
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
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* Code reviews urgents */}
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
            {!urgentReviews || urgentReviews.length === 0 ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
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
                        {new Date(promo.dates.start).toLocaleDateString(
                          'fr-FR'
                        )}{' '}
                        -{' '}
                        {new Date(promo.dates.end).toLocaleDateString('fr-FR')}
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
