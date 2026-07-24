'use client';

import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, TrendingUp } from 'lucide-react';

interface AuditPoint {
  auditDate: string;
  projectName: string;
  rating: number | null;
  strengths: string[];
  weaknesses: string[];
}

const chartConfig = {
  note: { label: 'Note', color: 'hsl(var(--primary))' },
  cumul: { label: 'Moyenne cumulée', color: 'hsl(var(--muted-foreground))' },
} satisfies ChartConfig;

/**
 * En-tête du profil étudiant : évolution des notes de CR dans le temps
 * (note par CR + moyenne cumulée) et récap des tags points forts / faibles
 * agrégés sur tous ses audits. Masqué tant qu'aucune note ni tag n'existe.
 */
export function StudentRatingOverview({ studentId }: { studentId: number }) {
  const [audits, setAudits] = useState<AuditPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/student/${studentId}/audits`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setAudits(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setAudits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const { points, average, ratedCount, strengths, weaknesses } = useMemo(() => {
    const list = audits ?? [];
    const rated = list
      .filter((a) => a.rating != null)
      .sort((a, b) => new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime());

    let sum = 0;
    const points = rated.map((a, i) => {
      sum += a.rating!;
      return {
        dateLabel: new Date(a.auditDate).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        fullDate: new Date(a.auditDate).toLocaleDateString('fr-FR'),
        project: a.projectName,
        note: a.rating!,
        cumul: Math.round((sum / (i + 1)) * 10) / 10,
      };
    });

    const sCounts = new Map<string, number>();
    const wCounts = new Map<string, number>();
    for (const a of list) {
      for (const t of a.strengths ?? []) sCounts.set(t, (sCounts.get(t) ?? 0) + 1);
      for (const t of a.weaknesses ?? []) wCounts.set(t, (wCounts.get(t) ?? 0) + 1);
    }
    const toSorted = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

    return {
      points,
      average: rated.length > 0 ? Math.round((sum / rated.length) * 10) / 10 : null,
      ratedCount: rated.length,
      strengths: toSorted(sCounts),
      weaknesses: toSorted(wCounts),
    };
  }, [audits]);

  if (audits === null) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  // Aucune note ni tag : rien à montrer, on n'encombre pas le profil.
  if (points.length === 0 && strengths.length === 0 && weaknesses.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
      {/* Courbe d'évolution des notes */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution des notes de CR
          </CardTitle>
          {average != null && (
            <CardDescription className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="font-semibold text-foreground tabular-nums">{average}/10</span>
              <span>
                de moyenne sur {ratedCount} CR notée{ratedCount > 1 ? 's' : ''}
              </span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {points.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucune CR notée pour le moment.
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <LineChart data={points} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeOpacity={0.3} />
                <XAxis
                  dataKey="dateLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  fontSize={11}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={46}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload;
                        return p ? `${p.project} — ${p.fullDate}` : '';
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey="cumul"
                  type="monotone"
                  stroke="var(--color-cumul)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="note"
                  type="monotone"
                  stroke="var(--color-note)"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 0, fill: 'var(--color-note)' }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Récap des tags */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Profil (tags de CR)</CardTitle>
          <CardDescription>Points forts et faibles cumulés sur ses audits</CardDescription>
        </CardHeader>
        <CardContent>
          {strengths.length === 0 && weaknesses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucun tag attribué pour le moment.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {strengths.map(({ tag, count }) => (
                <span
                  key={`s-${tag}`}
                  className="px-2 py-0.5 rounded-full border text-[11px] font-medium bg-success/15 text-success border-success/40"
                >
                  + {tag}
                  {count > 1 && <span className="opacity-70"> ×{count}</span>}
                </span>
              ))}
              {weaknesses.map(({ tag, count }) => (
                <span
                  key={`w-${tag}`}
                  className="px-2 py-0.5 rounded-full border text-[11px] font-medium bg-destructive/15 text-destructive border-destructive/40"
                >
                  − {tag}
                  {count > 1 && <span className="opacity-70"> ×{count}</span>}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
