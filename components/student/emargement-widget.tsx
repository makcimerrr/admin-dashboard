import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ExternalLink, CalendarDays } from 'lucide-react';
import { Donut } from './donut';

// Mock data — would be fetched from https://emargement.zone01rouennormandie.org/
const MOCK_WEEK = {
  label: 'Semaine du 20/04',
  targetHours: 35,
  doneHours: 22.5,
};

const MOCK_MONTH = {
  label: 'Avril 2026',
  targetHours: 154,
  doneHours: 112.75,
  workingDays: 22,
};

const MOCK_LOGS = [
  { date: '21/04', in: '09:02', out: '17:45', total: '08:43' },
  { date: '22/04', in: '09:10', out: '18:05', total: '08:55' },
  { date: '23/04', in: '09:00', out: '13:52', total: '04:52' },
];

function formatHM(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

function PeriodBlock({
  label,
  target,
  done,
  remaining,
  ratio,
  color,
  badges,
}: {
  label: string;
  target: number;
  done: number;
  remaining: number;
  ratio: number;
  color: string;
  badges?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <Donut
        value={ratio}
        label={`${ratio}%`}
        sublabel="Ratio"
        size={110}
        stroke={12}
        color={color}
      />
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
            <span className="text-muted-foreground">Reste dû</span>
            <span className="font-semibold font-mono text-amber-600 dark:text-amber-400">{formatHM(remaining)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmargementWidget() {
  const weekRatio = Math.round((MOCK_WEEK.doneHours / MOCK_WEEK.targetHours) * 100);
  const monthRatio = Math.round((MOCK_MONTH.doneHours / MOCK_MONTH.targetHours) * 100);
  const weekRemaining = MOCK_WEEK.targetHours - MOCK_WEEK.doneHours;
  const monthRemaining = MOCK_MONTH.targetHours - MOCK_MONTH.doneHours;

  return (
    <Card className="border h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4" style={{ color: 'var(--chart-1)' }} />
          Émargement
        </CardTitle>
        <a
          href="https://emargement.zone01rouennormandie.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Ouvrir
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-4 px-4 pb-3 items-center">
        <PeriodBlock
          label={MOCK_WEEK.label}
          target={MOCK_WEEK.targetHours}
          done={MOCK_WEEK.doneHours}
          remaining={weekRemaining}
          ratio={weekRatio}
          color="var(--chart-1)"
          badges={<Badge variant="secondary" className="text-[9px] h-4 px-1.5">Hebdo</Badge>}
        />

        <div className="lg:border-l lg:pl-4">
          <PeriodBlock
            label={MOCK_MONTH.label}
            target={MOCK_MONTH.targetHours}
            done={MOCK_MONTH.doneHours}
            remaining={monthRemaining}
            ratio={monthRatio}
            color="var(--chart-2)"
            badges={
              <>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{MOCK_MONTH.workingDays}j</Badge>
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
            {MOCK_LOGS.map((log) => (
              <div key={log.date} className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground w-10">{log.date}</span>
                <span>
                  <span className="text-emerald-600 dark:text-emerald-400">{log.in}</span>
                  <span className="text-muted-foreground/40 mx-1">→</span>
                  <span className="text-destructive">{log.out}</span>
                </span>
                <span className="font-semibold w-10 text-right">{log.total}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
