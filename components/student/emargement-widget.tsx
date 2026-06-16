'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ExternalLink, CalendarDays } from 'lucide-react';
import { Donut } from './donut';

const EMARGEMENT_URL = 'https://emargement.zone01normandie.org/';

interface EmargementData {
  found: boolean;
  week: { doneHours: number; targetHours: number };
  month: { label: string; doneHours: number; targetHours: number; workingDays: number };
  logs: { date: string; in: string | null; out: string | null }[];
}

function formatHM(hours: number): string {
  const sign = hours < 0 ? '-' : '';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${sign}${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function logTotal(inT: string | null, outT: string | null): string {
  if (!inT || !outT) return '—';
  const [ih, im] = inT.split(':').map(Number);
  const [oh, om] = outT.split(':').map(Number);
  let mins = oh * 60 + om - (ih * 60 + im);
  if (mins < 0) mins += 24 * 60;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function PeriodBlock({
  label,
  target,
  done,
  color,
  badges,
}: {
  label: string;
  target: number;
  done: number;
  color: string;
  badges?: React.ReactNode;
}) {
  const ratio = target > 0 ? Math.round((done / target) * 100) : 0;
  const remaining = target - done;
  return (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <Donut value={ratio} label={`${ratio}%`} sublabel="Ratio" size={110} stroke={12} color={color} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold truncate">{label}</span>
          <div className="flex gap-1 shrink-0">{badges}</div>
        </div>
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Effectué</span>
            <span className="font-medium font-mono">{formatHM(done)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Objectif</span>
            <span className="font-medium font-mono">{target}h00</span>
          </div>
          <div className="flex justify-between border-t pt-0.5">
            <span className="text-muted-foreground">{remaining >= 0 ? 'Reste dû' : 'En avance'}</span>
            <span
              className="font-semibold font-mono"
              style={{ color: remaining >= 0 ? 'var(--warning)' : 'var(--chart-2)' }}
            >
              {formatHM(remaining)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4" style={{ color: 'var(--chart-1)' }} />
          Émargement
        </CardTitle>
        <a
          href={EMARGEMENT_URL}
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

export function EmargementWidget({ asLogin }: { asLogin?: string }) {
  const [data, setData] = useState<EmargementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/me/emargement${asLogin ? `?login=${encodeURIComponent(asLogin)}` : ''}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setData(d?.success ? d : ({ found: false } as EmargementData));
      })
      .catch(() => active && setData({ found: false } as EmargementData))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [asLogin]);

  if (loading) {
    return (
      <Shell>
        <CardContent className="flex-1 min-h-0 flex items-center gap-4 px-4 pb-3">
          <Skeleton className="h-[110px] w-[110px] rounded-full" />
          <Skeleton className="h-20 flex-1" />
          <Skeleton className="h-20 flex-1 hidden lg:block" />
        </CardContent>
      </Shell>
    );
  }

  if (!data?.found) {
    return (
      <Shell>
        <CardContent className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-1.5 px-4 pb-3">
          <p className="text-xs text-muted-foreground">Aucune donnée d&apos;émargement trouvée pour ton compte.</p>
          <a href={EMARGEMENT_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            Ouvrir l&apos;émargement →
          </a>
        </CardContent>
      </Shell>
    );
  }

  return (
    <Shell>
      <CardContent className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-4 px-4 pb-3 items-center">
        <PeriodBlock
          label="Cette semaine"
          target={data.week.targetHours}
          done={data.week.doneHours}
          color="var(--chart-1)"
          badges={<Badge variant="secondary" className="text-[9px] h-4 px-1.5">Hebdo</Badge>}
        />

        <div className="lg:border-l lg:pl-4">
          <PeriodBlock
            label={data.month.label}
            target={data.month.targetHours}
            done={data.month.doneHours}
            color="var(--chart-2)"
            badges={
              <>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{data.month.workingDays}j</Badge>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Mensuel</Badge>
              </>
            }
          />
        </div>

        <div className="hidden lg:block lg:border-l lg:pl-4 w-56 self-stretch">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Derniers pointages
          </p>
          <div className="space-y-0.5">
            {data.logs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Aucun pointage récent.</p>
            ) : (
              data.logs.map((log, i) => (
                <div key={`${log.date}-${i}`} className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground w-10">{shortDate(log.date)}</span>
                  <span>
                    <span className="text-success">{log.in ?? '—'}</span>
                    <span className="text-muted-foreground/40 mx-1">→</span>
                    <span className="text-destructive">{log.out ?? '…'}</span>
                  </span>
                  <span className="font-semibold w-10 text-right">{logTotal(log.in, log.out)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Shell>
  );
}
