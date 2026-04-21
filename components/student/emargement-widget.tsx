import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ExternalLink } from 'lucide-react';
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

function formatHM(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

export function EmargementWidget() {
  const weekRatio = Math.round((MOCK_WEEK.doneHours / MOCK_WEEK.targetHours) * 100);
  const monthRatio = Math.round((MOCK_MONTH.doneHours / MOCK_MONTH.targetHours) * 100);
  const weekRemaining = MOCK_WEEK.targetHours - MOCK_WEEK.doneHours;
  const monthRemaining = MOCK_MONTH.targetHours - MOCK_MONTH.doneHours;

  return (
    <Card className="border h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-violet-600" />
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
      <CardContent className="flex-1 min-h-0 grid grid-cols-2 gap-4 px-4 pb-3">
        {/* Weekly */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-medium text-muted-foreground truncate">{MOCK_WEEK.label}</span>
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{MOCK_WEEK.targetHours}h</Badge>
          </div>
          <Donut
            value={weekRatio}
            label={`${weekRatio}%`}
            sublabel="Hebdo"
            size={96}
            stroke={10}
            progressClassName="text-violet-500"
            trackClassName="text-violet-500/10"
          />
          <div className="w-full space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fait</span>
              <span className="font-medium font-mono">{formatHM(MOCK_WEEK.doneHours)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reste</span>
              <span className="font-medium font-mono text-amber-600">{formatHM(weekRemaining)}</span>
            </div>
          </div>
        </div>

        {/* Monthly */}
        <div className="flex flex-col items-center gap-1.5 border-l pl-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-medium text-muted-foreground truncate">{MOCK_MONTH.label}</span>
            <div className="flex gap-1">
              <Badge className="text-[9px] h-4 px-1.5 bg-blue-500/15 text-blue-700 hover:bg-blue-500/20">{MOCK_MONTH.workingDays}j</Badge>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{MOCK_MONTH.targetHours}h</Badge>
            </div>
          </div>
          <Donut
            value={monthRatio}
            label={`${monthRatio}%`}
            sublabel="Mensuel"
            size={96}
            stroke={10}
            progressClassName="text-blue-500"
            trackClassName="text-blue-500/10"
          />
          <div className="w-full space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fait</span>
              <span className="font-medium font-mono">{formatHM(MOCK_MONTH.doneHours)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reste</span>
              <span className="font-medium font-mono text-amber-600">{formatHM(monthRemaining)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
