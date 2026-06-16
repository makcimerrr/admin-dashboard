'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, ExternalLink, Zap, ArrowUpRight, Award } from 'lucide-react';

const INTRA_URL = 'https://zone01normandie.org/';
const INTRA_COLOR = 'var(--chart-5)';
const INTRA_COLOR_2 = 'var(--chart-6)';

interface IntraData {
  found: boolean;
  login: string;
  level: number;
  xp: number;
  audit: { up: number; down: number; ratio: number | null };
  skills: { name: string; level: number }[];
  projects: { name: string; type: string; updatedAt: string }[];
}

function formatBytes(b: number): string {
  if (b >= 1_000_000) return (b / 1_000_000).toFixed(2) + 'MB';
  if (b >= 1_000) return (b / 1_000).toFixed(1) + 'KB';
  return b + 'B';
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Globe className="h-4 w-4" style={{ color: INTRA_COLOR }} />
          Intra
        </CardTitle>
        <a
          href={INTRA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Ouvrir
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>
      {children}
    </Card>
  );
}

export function IntraWidget({ asLogin }: { asLogin?: string }) {
  const [data, setData] = useState<IntraData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/me/intra${asLogin ? `?login=${encodeURIComponent(asLogin)}` : ''}`)
      .then((r) => r.json())
      .then((d) => active && setData(d?.success ? d : ({ found: false } as IntraData)))
      .catch(() => active && setData({ found: false } as IntraData))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [asLogin]);

  if (loading) {
    return (
      <Shell>
        <CardContent className="flex-1 min-h-0 flex flex-col gap-3 px-4 pb-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Shell>
    );
  }

  if (!data?.found) {
    return (
      <Shell>
        <CardContent className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-1.5 px-4 pb-3">
          <p className="text-xs text-muted-foreground">Aucune donnée intra trouvée pour ton compte.</p>
          <a href={INTRA_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            Ouvrir l&apos;intra →
          </a>
        </CardContent>
      </Shell>
    );
  }

  const topSkill = data.skills[0];

  return (
    <Shell>
      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 px-4 pb-3">
        {/* Level + XP */}
        <div
          className="rounded-lg border p-3 flex items-center justify-between"
          style={{
            backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${INTRA_COLOR} 6%, transparent), transparent 60%)`,
          }}
        >
          <div>
            <p className="text-[10px] text-muted-foreground leading-tight">XP total</p>
            <p className="text-base font-bold leading-tight">{formatBytes(data.xp)}</p>
          </div>
          <div className="text-center shrink-0">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Niveau</p>
            <p className="text-2xl font-bold leading-none" style={{ color: INTRA_COLOR }}>{data.level}</p>
          </div>
        </div>

        {/* Top skill + audit */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Zap className="h-2.5 w-2.5" style={{ color: 'var(--chart-4)' }} />
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Meilleure compétence</p>
            </div>
            {topSkill ? (
              <p className="text-[11px] font-semibold leading-tight">
                {topSkill.name} <span className="text-muted-foreground">· {topSkill.level}%</span>
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">—</p>
            )}
          </div>
          <div className="rounded-lg border p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowUpRight className="h-2.5 w-2.5" style={{ color: 'var(--chart-2)' }} />
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Ratio d&apos;audit</p>
            </div>
            <p className="text-[11px] font-bold leading-tight">{data.audit.ratio ?? '—'}</p>
            <p className="text-[8px] text-muted-foreground">
              {formatBytes(data.audit.up)} / {formatBytes(data.audit.down)}
            </p>
          </div>
        </div>

        {/* Skills chips */}
        {data.skills.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {data.skills.slice(0, 6).map((s) => (
              <span
                key={s.name}
                className="text-[9px] px-1.5 py-0.5 rounded-full border"
                style={{
                  borderColor: `color-mix(in srgb, ${INTRA_COLOR_2} 30%, transparent)`,
                  color: INTRA_COLOR_2,
                }}
              >
                {s.name} {s.level}%
              </span>
            ))}
          </div>
        )}

        {/* En cours */}
        <div className="flex-1 min-h-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
            <Award className="h-3 w-3" />
            En cours
          </p>
          <div className="space-y-1">
            {data.projects.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Rien en cours.</p>
            ) : (
              data.projects.map((p, i) => (
                <div key={`${p.name}-${i}`} className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/30">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: INTRA_COLOR }} />
                    <span className="text-[11px] font-medium truncate">{p.name}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">{p.type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Shell>
  );
}
