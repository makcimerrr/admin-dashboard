import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarDays, ExternalLink } from 'lucide-react';
import { Donut } from './donut';

// Mock data — would be fetched from https://emargement.zone01rouennormandie.org/
const MOCK_WEEK = {
  label: 'Semaine du 20/04',
  targetHours: 35,
  doneHours: 22.5,
  logs: [
    { date: '21/04', in: '09:02', out: '17:45', total: '08:43' },
    { date: '22/04', in: '09:10', out: '18:05', total: '08:55' },
    { date: '23/04', in: '09:00', out: '13:52', total: '04:52' },
  ],
};

const MOCK_MONTH = {
  label: 'Avril 2026',
  targetHours: 154,
  doneHours: 112.75,
  workingDays: 22,
};

function formatHM(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function EmargementWidget() {
  const weekRatio = Math.round((MOCK_WEEK.doneHours / MOCK_WEEK.targetHours) * 100);
  const monthRatio = Math.round((MOCK_MONTH.doneHours / MOCK_MONTH.targetHours) * 100);
  const weekRemaining = MOCK_WEEK.targetHours - MOCK_WEEK.doneHours;
  const monthRemaining = MOCK_MONTH.targetHours - MOCK_MONTH.doneHours;

  return (
    <Card className="border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-violet-600" />
          Émargement
        </CardTitle>
        <a
          href="https://emargement.zone01rouennormandie.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Voir tout
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        {/* Weekly */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium text-muted-foreground">{MOCK_WEEK.label}</span>
            <Badge variant="secondary" className="text-[10px] h-5">{MOCK_WEEK.targetHours}h</Badge>
          </div>
          <Donut
            value={weekRatio}
            label={`${weekRatio}%`}
            sublabel="Ratio"
            progressClassName="text-violet-500"
            trackClassName="text-violet-500/10"
          />
          <div className="w-full space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Effectué</span>
              <span className="font-medium">{formatHM(MOCK_WEEK.doneHours)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reste dû</span>
              <span className="font-medium text-amber-600">{formatHM(weekRemaining)}</span>
            </div>
          </div>
        </div>

        {/* Monthly */}
        <div className="flex flex-col items-center gap-3 md:border-l md:pl-6">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" />
              {MOCK_MONTH.label}
            </span>
            <div className="flex gap-1">
              <Badge className="text-[10px] h-5 bg-blue-500/15 text-blue-700 hover:bg-blue-500/20">{MOCK_MONTH.workingDays}j</Badge>
              <Badge variant="secondary" className="text-[10px] h-5">{MOCK_MONTH.targetHours}h</Badge>
            </div>
          </div>
          <Donut
            value={monthRatio}
            label={`${monthRatio}%`}
            sublabel="Ratio"
            progressClassName="text-blue-500"
            trackClassName="text-blue-500/10"
          />
          <div className="w-full space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Effectué</span>
              <span className="font-medium">{formatHM(MOCK_MONTH.doneHours)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reste dû</span>
              <span className="font-medium text-amber-600">{formatHM(monthRemaining)}</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Logs preview */}
      <div className="border-t px-6 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Derniers pointages
        </p>
        <div className="space-y-1">
          {MOCK_WEEK.logs.map((log) => (
            <div key={log.date} className="flex items-center justify-between text-xs py-1">
              <span className="font-mono text-muted-foreground w-14">{log.date}</span>
              <span className="font-mono">
                <span className="text-emerald-600">{log.in}</span>
                <span className="text-muted-foreground/40 mx-1.5">→</span>
                <span className="text-red-500">{log.out}</span>
              </span>
              <span className="font-medium font-mono w-14 text-right">{log.total}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
