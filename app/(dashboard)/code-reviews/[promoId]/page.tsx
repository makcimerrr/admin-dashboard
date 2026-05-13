import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Users,
} from 'lucide-react';
import {
  fetchPromotionProgressions,
  buildProjectGroups,
} from '@/lib/services/zone01';
import { getAuditsByPromoAndTrack } from '@/lib/db/services/audits';
import { getDropoutLogins } from '@/lib/db/services/dropouts';
import { getProjectNamesByTrack } from '@/lib/config/projects';
import { trackAccent } from '@/lib/track-colors';
import { LoadingCard } from '@/components/ui/loading-card';
import type { Track } from '@/lib/db/schema/audits';

export const maxDuration = 60;

interface PageProps {
  params: Promise<{ promoId: string }>;
}

const TRACKS: Track[] = ['Golang', 'Javascript', 'Rust', 'Java'];

async function PromoOverview({ promoId }: { promoId: string }) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/promotions/parse?promoId=${promoId}`,
    { cache: 'no-store' },
  );

  if (!response.ok) notFound();
  const data = await response.json();
  if (!data.success || !data.promotion) notFound();
  const promo = data.promotion;

  const [progressions, dropoutLogins, projectNamesPerTrack, ...auditsPerTrack] =
    await Promise.all([
      fetchPromotionProgressions(String(promo.eventId)),
      getDropoutLogins(),
      Promise.all(TRACKS.map((track) => getProjectNamesByTrack(track))),
      ...TRACKS.map((track) =>
        getAuditsByPromoAndTrack(String(promo.eventId), track),
      ),
    ]);

  const projectNamesByTrack = Object.fromEntries(
    TRACKS.map((track, i) => [track, (projectNamesPerTrack as string[][])[i]]),
  ) as Record<Track, string[]>;

  const auditsByTrack = Object.fromEntries(
    TRACKS.map((track, i) => [track, auditsPerTrack[i]]),
  ) as Record<Track, (typeof auditsPerTrack)[0]>;

  // Compute per-track + global counts only (no heavy priority eval — that lives on /group)
  const byTrack: Record<Track, { total: number; audited: number }> = {
    Golang: { total: 0, audited: 0 },
    Javascript: { total: 0, audited: 0 },
    Rust: { total: 0, audited: 0 },
    Java: { total: 0, audited: 0 },
  };

  for (const track of TRACKS) {
    const projectNames = projectNamesByTrack[track];
    const audits = auditsByTrack[track];
    const auditedGroupIds = new Set(audits.map((a) => a.groupId));

    for (const projectName of projectNames) {
      const groups = buildProjectGroups(progressions, projectName);
      for (const group of groups) {
        if (group.status !== 'finished') continue;
        const activeMembers = group.members.filter(
          (m) => !dropoutLogins.has(m.login.toLowerCase()),
        ).length;
        if (activeMembers === 0) continue;

        byTrack[track].total += 1;
        if (auditedGroupIds.has(group.groupId)) byTrack[track].audited += 1;
      }
    }
  }

  const totalGroups = TRACKS.reduce((s, t) => s + byTrack[t].total, 0);
  const auditedGroups = TRACKS.reduce((s, t) => s + byTrack[t].audited, 0);
  const pendingGroups = totalGroups - auditedGroups;
  const globalProgress =
    totalGroups > 0 ? Math.round((auditedGroups / totalGroups) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Per-track progression (primary view) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Progression par tronc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {TRACKS.map((track) => {
              const t = byTrack[track];
              const pct =
                t.total > 0 ? Math.round((t.audited / t.total) * 100) : 0;
              const accent = trackAccent(track);
              return (
                <div key={track} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: accent }}
                    >
                      {track}
                    </span>
                    <Badge variant="outline">
                      {t.audited}/{t.total}
                    </Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{pct}%</span>
                    <span>{t.total - t.audited} en attente</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Global summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-4 w-4" />
            Vue d'ensemble
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="text-center p-4 rounded-lg bg-muted/40 border">
              <p className="text-2xl md:text-3xl font-bold tabular-nums">
                {totalGroups}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Groupes finished
              </p>
            </div>
            <div className="text-center p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <p className="text-2xl md:text-3xl font-bold tabular-nums">
                {auditedGroups}
              </p>
              <p className="text-xs opacity-80 mt-1">Audités</p>
            </div>
            <div className="text-center p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <p className="text-2xl md:text-3xl font-bold tabular-nums">
                {pendingGroups}
              </p>
              <p className="text-xs opacity-80 mt-1">En attente</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/30 text-primary">
              <p className="text-2xl md:text-3xl font-bold tabular-nums">
                {globalProgress}%
              </p>
              <p className="text-xs opacity-80 mt-1">Progression</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary CTA → operational page */}
      <Link
        href={`/code-reviews/${promo.eventId}/group`}
        className="block group"
      >
        <Card className="p-4 hover:border-primary hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold group-hover:text-primary transition-colors">
                Voir tous les groupes
              </p>
              <p className="text-sm text-muted-foreground">
                Liste complète des groupes, filtres, et création d'audit.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </Card>
      </Link>
    </div>
  );
}

export default async function PromoCodeReviewsPage({ params }: PageProps) {
  const { promoId } = await params;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/promotions/parse?promoId=${promoId}`,
    { cache: 'no-store' },
  );

  if (!response.ok) notFound();
  const data = await response.json();
  if (!data.success || !data.promotion) notFound();
  const promo = data.promotion;

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/code-reviews">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="p-3 bg-primary/10 rounded-xl">
          <ClipboardCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Code Reviews — {promo.key}
          </h1>
          <p className="text-muted-foreground">{promo.title}</p>
        </div>
      </div>

      <Suspense fallback={<LoadingCard count={3} height="lg" />}>
        <PromoOverview promoId={promoId} />
      </Suspense>
    </div>
  );
}
