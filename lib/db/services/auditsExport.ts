import { db } from '@/lib/db/config';
import { audits, auditResults } from '@/lib/db/schema/audits';
import { eq, desc } from 'drizzle-orm';
import { getAllPromotions } from '@/lib/config/promotions';

export interface AuditResultExport {
  studentLogin: string;
  validated: boolean;
  absent: boolean;
  feedback: string | null;
  warnings: string[];
}

export interface AuditExport {
  id: number;
  groupId: string;
  projectName: string;
  track: string;
  auditorName: string;
  createdAt: Date;
  summary: string;
  totalMembers: number;
  validatedCount: number;
  results: AuditResultExport[];
}

export interface TrackExport {
  track: string;
  audits: AuditExport[];
  totalAudits: number;
  totalStudents: number;
  validatedStudents: number;
  validationRate: number;
}

export interface PromoExport {
  promoId: string;
  promoTitle: string;
  tracks: TrackExport[];
  totalAudits: number;
  totalStudents: number;
  validatedStudents: number;
  validationRate: number;
  topAuditors: { name: string; count: number }[];
}

export interface FullExportData {
  generatedAt: Date;
  promos: PromoExport[];
  globalStats: {
    totalPromos: number;
    totalAudits: number;
    totalStudents: number;
    validatedStudents: number;
    validationRate: number;
  };
}

function parseWarnings(warnings: unknown): string[] {
  if (Array.isArray(warnings)) return warnings;
  if (typeof warnings === 'string') {
    try {
      const parsed = JSON.parse(warnings);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export async function getAllAuditsForExport(): Promise<FullExportData> {
  const [allAudits, allResults, promoConfigs] = await Promise.all([
    db.select().from(audits).orderBy(desc(audits.createdAt)),
    db.select().from(auditResults),
    getAllPromotions(),
  ]);

  // Build results lookup: auditId → results
  const resultsByAudit = new Map<number, typeof allResults>();
  for (const r of allResults) {
    if (!resultsByAudit.has(r.auditId)) resultsByAudit.set(r.auditId, []);
    resultsByAudit.get(r.auditId)!.push(r);
  }

  // Build promo title lookup
  const promoTitles = new Map<string, string>();
  for (const p of promoConfigs) {
    promoTitles.set(String(p.eventId), p.title ?? p.key);
  }

  // Group audits by promoId → track
  const promoMap = new Map<string, Map<string, typeof allAudits>>();
  for (const audit of allAudits) {
    if (!promoMap.has(audit.promoId)) promoMap.set(audit.promoId, new Map());
    const trackMap = promoMap.get(audit.promoId)!;
    if (!trackMap.has(audit.track)) trackMap.set(audit.track, []);
    trackMap.get(audit.track)!.push(audit);
  }

  // Sort promos by eventId descending (most recent first)
  const sortedPromoIds = [...promoMap.keys()].sort((a, b) => Number(b) - Number(a));

  const promos: PromoExport[] = sortedPromoIds.map((promoId) => {
    const trackMap = promoMap.get(promoId)!;
    const trackOrder = ['Golang', 'Javascript', 'Rust', 'Java'];

    // Auditor counts for this promo
    const auditorCounts = new Map<string, number>();

    const tracks: TrackExport[] = trackOrder
      .filter((t) => trackMap.has(t))
      .map((track) => {
        const rawAudits = trackMap.get(track)!.sort(
          (a, b) => a.projectName.localeCompare(b.projectName) || a.createdAt.getTime() - b.createdAt.getTime()
        );

        const auditExports: AuditExport[] = rawAudits.map((a) => {
          const results = resultsByAudit.get(a.id) ?? [];
          const validated = results.filter((r) => r.validated).length;

          // Count auditor
          auditorCounts.set(a.auditorName, (auditorCounts.get(a.auditorName) ?? 0) + 1);

          return {
            id: a.id,
            groupId: a.groupId,
            projectName: a.projectName,
            track: a.track,
            auditorName: a.auditorName,
            createdAt: a.createdAt,
            summary: a.summary ?? '',
            totalMembers: results.length,
            validatedCount: validated,
            results: results.map((r) => ({
              studentLogin: r.studentLogin,
              validated: r.validated,
              absent: r.absent,
              feedback: r.feedback ?? null,
              warnings: parseWarnings(r.warnings),
            })),
          };
        });

        const totalStudents = auditExports.reduce((s, a) => s + a.totalMembers, 0);
        const validatedStudents = auditExports.reduce((s, a) => s + a.validatedCount, 0);

        return {
          track,
          audits: auditExports,
          totalAudits: auditExports.length,
          totalStudents,
          validatedStudents,
          validationRate: totalStudents > 0 ? Math.round((validatedStudents / totalStudents) * 100) : 0,
        };
      });

    const totalAudits = tracks.reduce((s, t) => s + t.totalAudits, 0);
    const totalStudents = tracks.reduce((s, t) => s + t.totalStudents, 0);
    const validatedStudents = tracks.reduce((s, t) => s + t.validatedStudents, 0);
    const topAuditors = [...auditorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      promoId,
      promoTitle: promoTitles.get(promoId) ?? `Promotion ${promoId}`,
      tracks,
      totalAudits,
      totalStudents,
      validatedStudents,
      validationRate: totalStudents > 0 ? Math.round((validatedStudents / totalStudents) * 100) : 0,
      topAuditors,
    };
  });

  const globalTotalAudits = promos.reduce((s, p) => s + p.totalAudits, 0);
  const globalTotalStudents = promos.reduce((s, p) => s + p.totalStudents, 0);
  const globalValidated = promos.reduce((s, p) => s + p.validatedStudents, 0);

  return {
    generatedAt: new Date(),
    promos,
    globalStats: {
      totalPromos: promos.length,
      totalAudits: globalTotalAudits,
      totalStudents: globalTotalStudents,
      validatedStudents: globalValidated,
      validationRate: globalTotalStudents > 0 ? Math.round((globalValidated / globalTotalStudents) * 100) : 0,
    },
  };
}
