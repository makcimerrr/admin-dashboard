import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';
import {
  parsePromoId,
  getAllPromotions,
  eventIdToString
} from '@/lib/config/promotions';
import {
  fetchPromotionProgressions,
  buildProjectGroups
} from '@/lib/services/zone01';
import { getDropoutLogins } from '@/lib/db/services/dropouts';
import { getAuditsByPromoAndTrack } from '@/lib/db/services/audits';
import { getProjectNamesByTrack } from '@/lib/config/projects';
import { evaluatePendingPriorities } from '@/lib/services/pending-priority';
import { BarChart3, ArrowLeft, ChevronRight } from 'lucide-react';
import { db } from '@/lib/db/config';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import GroupCard from '@/components/code-reviews/group-card';
import GroupFilters from '@/components/code-reviews/group-filters';

const TRACKS = ['Golang', 'Javascript', 'Rust', 'Java'] as const;

export default async function PromoGroupsIndexPage({
  params
}: {
  params: { promoId: string };
}) {
  const { promoId } = params;
  const promo = parsePromoId(promoId);
  if (!promo) notFound();

  // compute prev/next promos from config order
  const allPromos = getAllPromotions();
  const promoIndex = allPromos.findIndex(
    (p) => p.eventId === Number(promo.eventId)
  );
  const prevPromo = promoIndex > 0 ? allPromos[promoIndex - 1] : undefined;
  const nextPromo =
    promoIndex >= 0 && promoIndex < allPromos.length - 1
      ? allPromos[promoIndex + 1]
      : undefined;

  // Fetch data in parallel
  const [progressions, dropoutLogins, ...auditsPerTrack] = await Promise.all([
    fetchPromotionProgressions(String(promo.eventId)),
    getDropoutLogins(),
    ...TRACKS.map((track) =>
      getAuditsByPromoAndTrack(String(promo.eventId), track)
    )
  ]);

  const auditsByTrack = Object.fromEntries(
    TRACKS.map((t, i) => [t, auditsPerTrack[i]])
  );

  // Build finished groups across tracks/projects
  const allGroups: any[] = [];

  for (const track of TRACKS) {
    const projectNames = getProjectNamesByTrack(track as any);
    const audits = auditsByTrack[track as any] || [];
    const auditsByGroupId = new Map(audits.map((a: any) => [a.groupId, a]));

    for (const projectName of projectNames) {
      const groups = buildProjectGroups(progressions, projectName);
      for (const group of groups) {
        if (group.status !== 'finished') continue;

        const audit = auditsByGroupId.get(group.groupId);
        const membersWithDropout = group.members.map((m: any) => ({
          ...m,
          isDropout: dropoutLogins.has(m.login.toLowerCase())
        }));

        const activeMembers = membersWithDropout.filter(
          (m: any) => !m.isDropout
        ).length;
        if (activeMembers === 0) continue; // skip groups with no active members

        let hasWarnings = false;
        let warningsCount = 0;
        let validatedCount = 0;
        let priority: 'urgent' | 'warning' | 'normal' = 'normal';

        if (audit) {
          const globalWarnings = audit.warnings?.length || 0;
          const memberWarnings =
            audit.results?.reduce(
              (sum: number, r: any) => sum + (r.warnings?.length || 0),
              0
            ) || 0;
          warningsCount = globalWarnings + memberWarnings;
          hasWarnings = warningsCount > 0;
          validatedCount =
            audit.results?.filter((r: any) => r.validated).length || 0;
          const validationRate =
            activeMembers > 0 ? (validatedCount / activeMembers) * 100 : 100;
          if (hasWarnings || validationRate < 30) priority = 'urgent';
          else if (validationRate < 50) priority = 'warning';
        }

        const notValidatedCount = activeMembers - validatedCount;

        allGroups.push({
          groupId: group.groupId,
          projectName,
          track,
          status: group.status,
          members: membersWithDropout,
          isAudited: !!audit,
          auditId: audit?.id,
          auditorName: audit?.auditorName,
          auditDate: audit?.createdAt?.toISOString?.(),
          activeMembers,
          hasWarnings,
          warningsCount,
          validatedCount,
          notValidatedCount,
          priority
        });
      }
    }
  }

  // Enrich members with studentId from our DB so we can link to the student page
  const memberLoginSet = new Set<string>();
  for (const g of allGroups) {
    for (const m of g.members) memberLoginSet.add(m.login.toLowerCase());
  }
  const memberLogins = Array.from(memberLoginSet);
  let studentIdByLogin = new Map<string, number>();
  if (memberLogins.length > 0) {
    const studentsData = await db.query.students.findMany({
      where: (students, { sql }) =>
        sql`LOWER(${students.login}) IN (${sql.join(
          memberLogins.map((l) => sql.raw(`'${l}'`)),
          sql`, `
        )})`
    });
    studentIdByLogin = new Map(
      studentsData.map((s: any) => [s.login.toLowerCase(), s.id])
    );
  }

  for (const g of allGroups) {
    for (const m of g.members) {
      m.studentId = studentIdByLogin.get(m.login.toLowerCase());
    }
  }

  // Stats
  const stats: any = {
    totalGroups: allGroups.length,
    auditedGroups: allGroups.filter((g) => g.isAudited).length,
    pendingGroups: allGroups.filter((g) => !g.isAudited).length,
    byTrack: {}
  };

  for (const track of TRACKS) {
    const trackGroups = allGroups.filter((g) => g.track === track);
    stats.byTrack[track] = {
      total: trackGroups.length,
      audited: trackGroups.filter((g) => g.isAudited).length
    };
  }

  // Evaluate pending priorities
  const pendingGroups = allGroups.filter((g) => !g.isAudited);
  const pendingEvaluation = await evaluatePendingPriorities(
    String(promo.eventId),
    pendingGroups.map((g) => ({
      groupId: g.groupId,
      projectName: g.projectName,
      track: g.track,
      members: g.members.map((m: any) => ({
        login: m.login,
        isDropout: m.isDropout
      })),
      activeMembers: g.activeMembers
    }))
  );

  const pendingPriorityMap = new Map(
    (pendingEvaluation.groups || []).map((g: any) => [g.groupId, g])
  );
  for (const group of allGroups) {
    if (!group.isAudited) {
      const evalData = pendingPriorityMap.get(group.groupId);
      if (evalData) {
        group.priority = evalData.priority;
        group.priorityReasons = evalData.reasons;
        group.priorityScore = evalData.priorityScore;
      }
    }
  }

  // Sort: non-audited first, then priority
  const priorityOrder = { urgent: 0, warning: 1, normal: 2 } as const;
  allGroups.sort((a, b) => {
    if (a.isAudited !== b.isAudited) return a.isAudited ? 1 : -1;
    const pa =
      priorityOrder[(a.priority ?? 'normal') as keyof typeof priorityOrder];
    const pb =
      priorityOrder[(b.priority ?? 'normal') as keyof typeof priorityOrder];
    if (pa !== pb) return pa - pb;
    return a.projectName.localeCompare(b.projectName);
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header: grouped navigation (left), title (center), actions (right) */}
      <div className="flex items-center justify-between">
        {/* Left: navigation group */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border bg-muted/5 px-2 py-1">
            <Button variant="ghost" asChild>
              <Link
                href="/code-reviews"
                className="flex items-center gap-2 px-3 py-2"
                aria-label="Retour à Code Reviews"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">
                  Code Reviews
                </span>
              </Link>
            </Button>

            <div className="hidden sm:flex items-center h-8 ml-1">
              <div className="w-px h-6 bg-border/40" />
            </div>

            {/* Prev promo with tooltip */}
            {prevPromo ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" asChild className="px-2 py-2">
                    <Link
                      href={`/code-reviews/${eventIdToString(prevPromo.eventId)}/group`}
                      className="flex items-center gap-2 px-3 py-2"
                      aria-label={`Aller à ${prevPromo.key}`}
                    >
                      <ArrowLeft className="h-4 w-4 rotate-90" />
                      <span className="hidden md:inline text-sm">Précéd.</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {prevPromo.key} — {prevPromo.title}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                disabled
                className="px-3 py-2 opacity-60"
                aria-label="Aucune promotion précédente"
              >
                <ArrowLeft className="h-4 w-4 rotate-90 opacity-40" />
              </Button>
            )}

            {/* Next promo with tooltip */}
            {nextPromo ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" asChild className="px-2 py-2">
                    <Link
                      href={`/code-reviews/${eventIdToString(nextPromo.eventId)}/group`}
                      className="flex items-center gap-2 px-3 py-2"
                      aria-label={`Aller à ${nextPromo.key}`}
                    >
                      <ArrowLeft className="h-4 w-4 -rotate-90" />
                      <span className="hidden md:inline text-sm">Suiv.</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {nextPromo.key} — {nextPromo.title}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                disabled
                className="px-3 py-2 opacity-60"
                aria-label="Aucune promotion suivante"
              >
                <ArrowLeft className="h-4 w-4 -rotate-90 opacity-40" />
              </Button>
            )}
          </div>
        </div>

        {/* Center: title (responsive) */}
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Groupes — {promo.key}
          </h1>
          <p className="text-sm text-muted-foreground">{promo.title}</p>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" asChild>
                <Link
                  href={`/code-reviews/${promoId}`}
                  className="flex items-center gap-2 px-3 py-2"
                  aria-label="Voir la promo"
                >
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="hidden sm:inline text-sm font-medium">
                    Voir la promo
                  </span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                Ouvrir la vue promo et ses statistiques
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div>
        <div className="mb-4 rounded-md border bg-card p-4">
          <h3 className="text-lg font-semibold">Vue des audits</h3>
          <p className="text-sm text-muted-foreground">
            Sépare les audits en attente et ceux déjà réalisés. Cliquez sur une
            carte pour ouvrir l'audit (ou créer si en attente). Les membres sont
            cliquables pour accéder à leur profil.
          </p>
        </div>

        <GroupFilters tracks={TRACKS as unknown as string[]} />

        {/* Grouped-by-track with Pending / Audited separation */}
        <div className="space-y-8">
          {TRACKS.map((track) => {
            const groupsForTrack = allGroups.filter((g) => g.track === track);
            const pending = groupsForTrack.filter((g) => !g.isAudited);
            const audited = groupsForTrack.filter((g) => g.isAudited);

            return (
              <section key={track}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{track}</h2>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      Total: {groupsForTrack.length}
                    </div>
                    <Badge variant="outline">Audités {audited.length}</Badge>
                    <Badge variant="outline" className="bg-muted/10">
                      En attente {pending.length}
                    </Badge>
                  </div>
                </div>

                {/* Pending first */}
                {pending.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium mb-2">En attente</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {pending.map((g) => (
                        <GroupCard
                          key={g.groupId}
                          data-group-card
                          data-track={g.track}
                          data-status="pending"
                          className="relative block p-4 border rounded-lg bg-background hover:shadow-lg transition cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">
                                {g.projectName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Groupe #{g.groupId} — Priorité:{' '}
                                <span className="font-medium text-amber-700">
                                  {g.priority}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                {g.activeMembers} membre(s) • {g.warningsCount}{' '}
                                warnings
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <div className="text-xs text-muted-foreground">
                                En attente
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {g.priority === 'urgent' ? (
                                  <span className="text-red-600 font-semibold">
                                    Urgent
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                              {g.members.slice(0, 3).map((m: any) => {
                                const studentHref = m.studentId
                                  ? `/student?id=${m.studentId}`
                                  : undefined;
                                return (
                                  <div
                                    key={m.login}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    {studentHref ? (
                                      <Link
                                        href={studentHref}
                                        data-prevent-card
                                        className="truncate max-w-[8rem] text-xs px-2 py-1 rounded-md hover:bg-primary/5 transition"
                                        aria-label={`Voir la fiche de ${m.login}`}
                                      >
                                        {m.firstName
                                          ? `${m.firstName}`
                                          : m.login}
                                      </Link>
                                    ) : (
                                      <span className="truncate max-w-[8rem] text-xs">
                                        {m.firstName
                                          ? `${m.firstName}`
                                          : m.login}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                              {g.members.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{g.members.length - 3}
                                </div>
                              )}
                            </div>

                            <Link
                              href={`/code-reviews/${promoId}/group/${g.groupId}`}
                              data-prevent-card
                              className="flex items-center gap-2 text-sm text-primary group"
                              aria-label={`Créer l'audit du groupe ${g.groupId}`}
                            >
                              <span className="hidden sm:inline transition-transform group-hover:translate-x-1">
                                Créer l'audit
                              </span>
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                          </div>
                        </GroupCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audited */}
                {audited.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Audités</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {audited.map((g) => (
                        <GroupCard
                          key={g.groupId}
                          data-group-card
                          data-track={g.track}
                          data-status="audited"
                          className="relative block p-4 border rounded-lg bg-white hover:shadow-lg transition cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">
                                {g.projectName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Groupe #{g.groupId} • Auditeur:{' '}
                                {g.auditorName ?? '—'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                {g.validatedCount} validé(s) • {g.warningsCount}{' '}
                                warnings
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <div className="text-xs text-green-600 font-medium">
                                Audité
                              </div>
                              {g.auditDate ? (
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(g.auditDate), 'PPP', {
                                    locale: fr
                                  })}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                              {g.members.slice(0, 4).map((m: any) => {
                                const studentHref = m.studentId
                                  ? `/student?id=${m.studentId}`
                                  : undefined;
                                return (
                                  <div
                                    key={m.login}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    {studentHref ? (
                                      <Link
                                        href={studentHref}
                                        data-prevent-card
                                        className="text-primary truncate max-w-[8rem] text-xs px-2 py-1 rounded-md hover:bg-primary/5 transition"
                                        aria-label={`Voir la fiche de ${m.login}`}
                                      >
                                        {m.firstName
                                          ? `${m.firstName}`
                                          : m.login}
                                      </Link>
                                    ) : (
                                      <span className="text-primary truncate max-w-[8rem] text-xs">
                                        {m.firstName
                                          ? `${m.firstName}`
                                          : m.login}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <Link
                              href={`/code-reviews/${promoId}/group/${g.groupId}`}
                              className="flex items-center gap-2 text-sm text-primary group"
                              aria-label={`Ouvrir l'audit du groupe ${g.groupId}`}
                            >
                              <span className="hidden sm:inline transition-transform group-hover:translate-x-1">
                                Ouvrir l'audit
                              </span>
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                          </div>
                        </GroupCard>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
