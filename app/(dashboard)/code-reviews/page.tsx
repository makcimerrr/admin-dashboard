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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardCheck,
  ArrowRight,
  Calendar,
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  User,
  Eye,
  ChevronRight,
  Info
} from 'lucide-react';
import { getActivePromotions } from '@/lib/config/promotions';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ReviewItemSkeleton, PromoCardSkeleton } from '@/components/code-reviews/skeletons';

interface RecentReview {
  id: number;
  projectName: string;
  groupId: string;
  groupMembers: string[];
  promotionName: string;
  promoId: string;
  track: string;
  reviewedAt: string;
  auditorName: string;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  priority: 'urgent' | 'warning' | 'normal';
  hasWarnings: boolean;
  warningsCount: number;
  validatedCount: number;
  totalMembers: number;
  validationRate: number;
  globalWarnings: string[];
  memberWarnings: { login: string; warnings: string[] }[];
}

interface UrgentReview {
  id: string;
  type: 'audit_warning' | 'low_validation' | 'pending_old' | 'pending_recent' | 'alert';
  groupId?: string;
  projectName?: string;
  promoId?: string;
  promotionName?: string;
  track?: string;
  reason: string;
  reasonDetail?: string;
  priority: 'urgent' | 'warning' | 'info';
  auditId?: number;
  validationRate?: number;
  warningsCount?: number;
  auditorName?: string;
  auditDate?: string;
  daysPending?: number;
  membersCount?: number;
}

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  promoKey?: string;
  count?: number;
  action?: string;
}

interface PendingStats {
  total: number;
  urgent: number;
  warning: number;
  normal: number;
  avgDaysPending: number;
}

interface PendingGroup {
  groupId: string;
  projectName: string;
  track: string;
  promoId: string;
  promoName: string;
  daysPending: number;
  priority: 'urgent' | 'warning' | 'normal';
}

const trackColors: Record<string, string> = {
  Golang: 'bg-cyan-500',
  Javascript: 'bg-yellow-500',
  Rust: 'bg-orange-500',
  Java: 'bg-red-500'
};

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      console.error(`safeFetch failed: ${path} -> ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`safeFetch error for ${path}:`, err);
    return null;
  }
}

export default function CodeReviewsPage() {
  const [recentReviews, setRecentReviews] = useState<RecentReview[] | null>(null);
  const [urgentReviews, setUrgentReviews] = useState<UrgentReview[] | null>(null);
  const [pendingStats, setPendingStats] = useState<PendingStats | null>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        // Fetch recent code reviews, alerts, and pending audits
        const [recent, alertsResponse, pendingResponse] = await Promise.all([
          safeFetch<RecentReview[]>('/api/code-reviews/recent'),
          safeFetch<{ success: boolean; alerts: Alert[] }>('/api/alerts'),
          safeFetch<{ success: boolean; pending: PendingGroup[]; stats: PendingStats }>('/api/code-reviews/pending')
        ]);
        if (!mounted) return;
        setRecentReviews(recent || []);

        // Set pending stats
        if (pendingResponse?.success) {
          setPendingStats(pendingResponse.stats);
        }

        // Combine alerts: code-review alerts from /api/alerts + pending audits
        const urgentItems: UrgentReview[] = [];

        // 1. Add code-review related alerts from main alerts
        if (alertsResponse?.success && alertsResponse.alerts) {
          const codeReviewAlerts = alertsResponse.alerts
            .filter(alert =>
              alert.id.startsWith('audit-') ||
              alert.title.toLowerCase().includes('code review') ||
              alert.title.toLowerCase().includes('audit') ||
              alert.title.toLowerCase().includes('validation')
            )
            .slice(0, 5)
            .map(alert => ({
              id: alert.id,
              type: 'alert' as const,
              reason: alert.title,
              reasonDetail: alert.description,
              priority: alert.severity === 'critical' || alert.severity === 'high'
                ? 'urgent' as const
                : alert.severity === 'medium'
                  ? 'warning' as const
                  : 'info' as const,
              promotionName: alert.promoKey,
              warningsCount: alert.count
            }));
          urgentItems.push(...codeReviewAlerts);
        }

        // 2. Add pending audits (urgent and warning only)
        if (pendingResponse?.success && pendingResponse.pending) {
          const pendingAlerts = pendingResponse.pending
            .filter(g => g.priority === 'urgent' || g.priority === 'warning')
            .slice(0, 5)
            .map(group => ({
              id: `pending-${group.promoId}-${group.groupId}`,
              type: 'pending_old' as const,
              groupId: group.groupId,
              projectName: group.projectName,
              promoId: group.promoId,
              promotionName: group.promoName,
              track: group.track,
              reason: group.priority === 'urgent' ? 'Audit urgent' : 'Audit à traiter',
              reasonDetail: `En attente depuis ${group.daysPending} jour(s)`,
              priority: group.priority === 'urgent' ? 'urgent' as const : 'warning' as const,
              daysPending: group.daysPending
            }));
          urgentItems.push(...pendingAlerts);
        }

        // Sort by priority
        const priorityOrder = { urgent: 0, warning: 1, info: 2 };
        urgentItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        setUrgentReviews(urgentItems.slice(0, 8));
      } catch (e) {
        if (!mounted) return;
        setError('Erreur lors du chargement des données.');
        setRecentReviews([]);
        setUrgentReviews([]);
      }
    }

    try {
      const promos = getActivePromotions();
      setPromotions(promos);
    } catch (e) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Code Reviews</h1>
            <p className="text-sm text-muted-foreground">
              Suivi des audits pédagogiques par promotion
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/code-reviews/all">
            <Eye className="h-4 w-4 mr-2" />
            Tous les audits
          </Link>
        </Button>
      </div>

      {/* Widgets */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reviews Widget */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Derniers audits
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {recentReviews?.length || 0} récent(s)
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? (
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ReviewItemSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">{error}</div>
            ) : recentReviews && recentReviews.length > 0 ? (
              <div className="space-y-1">
                {recentReviews.map((review) => (
                  <Link
                    key={review.id}
                    href={`/code-reviews/${review.promoId}/group/${review.groupId}`}
                    className="flex items-center gap-3 p-3 -mx-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    {/* Track indicator */}
                    <div className={`w-1 h-12 rounded-full ${trackColors[review.track] || 'bg-gray-400'}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{review.projectName}</span>
                        <span className="text-xs text-muted-foreground">#{review.groupId.slice(-6)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{review.promotionName}</span>
                        <span>·</span>
                        <span>{review.auditorName}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(review.reviewedAt), { addSuffix: true, locale: fr })}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {review.hasWarnings && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      <Badge
                        variant="outline"
                        className={
                          review.validationRate >= 80
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : review.validationRate >= 50
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                        }
                      >
                        {review.validatedCount}/{review.totalMembers}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun audit récent</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgent Reviews Widget */}
        <Card className={urgentReviews && urgentReviews.length > 0 ? 'border-amber-200' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Alertes
                {pendingStats && pendingStats.total > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({pendingStats.total} en attente)
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {urgentReviews && urgentReviews.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {urgentReviews.length}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                  <Link href="/code-reviews/all">
                    Tout voir
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? (
              <div className="space-y-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ReviewItemSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">{error}</div>
            ) : urgentReviews && urgentReviews.length > 0 ? (
              <div className="space-y-1">
                {urgentReviews.map((review) => (
                  <div
                    key={review.id}
                    className={`p-3 -mx-2 rounded-lg ${
                      review.priority === 'urgent'
                        ? 'bg-red-50 border border-red-100'
                        : review.priority === 'warning'
                          ? 'bg-amber-50 border border-amber-100'
                          : 'bg-blue-50 border border-blue-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {review.priority === 'urgent' ? (
                            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          ) : review.priority === 'warning' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          ) : (
                            <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            {review.projectName || review.reason}
                          </span>
                          {review.track && (
                            <div className={`w-2 h-2 rounded-full ${trackColors[review.track] || 'bg-gray-400'}`} />
                          )}
                          {review.warningsCount && review.warningsCount > 0 && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {review.warningsCount}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 ml-6">
                          {review.promotionName && <span>{review.promotionName}</span>}
                          {review.promotionName && (review.reason || review.reasonDetail) && <span> · </span>}
                          {review.projectName ? review.reason : review.reasonDetail}
                        </div>
                      </div>
                      {review.promoId && review.groupId ? (
                        <Button
                          variant={review.type === 'pending_old' ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 px-2"
                          asChild
                        >
                          <Link href={`/code-reviews/${review.promoId}/group/${review.groupId}`}>
                            {review.type === 'pending_old' ? (
                              <>Auditer</>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Voir
                              </>
                            )}
                          </Link>
                        </Button>
                      ) : review.auditId ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <Link href="/code-reviews/all">
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Voir
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                <p className="text-sm text-green-700">Aucune alerte</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Promotions Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Promotions
          </CardTitle>
          <CardDescription>
            Sélectionnez une promotion pour gérer les audits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <PromoCardSkeleton key={i} />
                ))
              : promotions.map((promo) => (
                  <Link
                    key={promo.eventId}
                    href={`/code-reviews/${promo.eventId}`}
                    className="block group"
                  >
                    <div className="p-4 rounded-lg border hover:border-primary hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold group-hover:text-primary transition-colors">
                            {promo.key}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {promo.title}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(promo.dates.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {new Date(promo.dates.end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="text-xs text-muted-foreground px-1">
        <span className="font-medium">Info:</span> Seuls les groupes avec statut <Badge variant="outline" className="text-[10px] px-1.5 py-0 mx-1">finished</Badge> peuvent être audités.
        Les étudiants en perdition sont marqués mais exclus des statistiques.
      </div>
    </div>
  );
}
