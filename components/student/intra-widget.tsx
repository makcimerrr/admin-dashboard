import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, ArrowUpRight, Zap, ShieldCheck, ExternalLink } from 'lucide-react';

// Mock data — would be fetched from https://intra.zone01rouennormandie.org/
const MOCK_INTRA = {
  cursus: {
    name: 'Cursus',
    status: 'IN_PROGRESS',
    cohort: 'P1 2023',
  },
  level: 54,
  expectedLevel: 59,
  nextLevel: 55,
  rank: 'Junior developer',
  nextRankIn: 1,
  lastSkill: 'Elementary algorithms',
  audit: {
    doneBytes: 5_270_000,
    receivedBytes: 10_020_000,
  },
  whatsUp: [
    { id: 1, name: 'Piscine Cybersecurity', status: 'in_progress', deadline: '13/11/2027' },
    { id: 2, name: 'forum-moderation', status: 'in_progress', updated: '18/02/2026' },
  ],
};

// Uses theme chart colors 5 & 6
const INTRA_COLOR = 'var(--chart-5)';
const INTRA_COLOR_2 = 'var(--chart-6)';

function formatBytes(b: number): string {
  if (b >= 1_000_000) return (b / 1_000_000).toFixed(2) + 'MB';
  if (b >= 1_000) return (b / 1_000).toFixed(1) + 'KB';
  return b + 'B';
}

export function IntraWidget() {
  const levelRatio = Math.round((MOCK_INTRA.level / MOCK_INTRA.expectedLevel) * 100);
  const auditRatio = (MOCK_INTRA.audit.doneBytes / MOCK_INTRA.audit.receivedBytes).toFixed(2);

  return (
    <Card className="border h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Globe className="h-4 w-4" style={{ color: INTRA_COLOR }} />
          Intra
        </CardTitle>
        <a
          href="https://intra.zone01rouennormandie.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Ouvrir
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 px-4 pb-3">
        {/* Current program + level */}
        <div
          className="rounded-lg border p-3"
          style={{
            backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${INTRA_COLOR} 6%, transparent), transparent 60%)`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-semibold">{MOCK_INTRA.cursus.name}</span>
                <Badge
                  className="text-[9px] h-4 px-1.5 border-0 hover:opacity-80"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${INTRA_COLOR} 15%, transparent)`,
                    color: INTRA_COLOR,
                  }}
                >
                  IN PROGRESS
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{MOCK_INTRA.cursus.cohort}</p>
            </div>
            <div className="text-center shrink-0">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Lvl</p>
              <p className="text-xl font-bold leading-none" style={{ color: INTRA_COLOR }}>{MOCK_INTRA.level}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">att: {MOCK_INTRA.expectedLevel}</p>
            </div>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="flex items-center justify-between text-[9px] text-muted-foreground">
              <span>Progression vers {MOCK_INTRA.nextLevel}</span>
              <span>{levelRatio}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, levelRatio)}%`,
                  backgroundImage: `linear-gradient(to right, ${INTRA_COLOR}, ${INTRA_COLOR_2})`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Rank + last skill + audit */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg border p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <ShieldCheck className="h-2.5 w-2.5" style={{ color: 'var(--chart-1)' }} />
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Rang</p>
            </div>
            <p className="text-[10px] font-semibold leading-tight">{MOCK_INTRA.rank}</p>
          </div>
          <div className="rounded-lg border p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Zap className="h-2.5 w-2.5" style={{ color: 'var(--chart-4)' }} />
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Skill</p>
            </div>
            <p className="text-[10px] font-semibold leading-tight">{MOCK_INTRA.lastSkill}</p>
          </div>
          <div className="rounded-lg border p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowUpRight className="h-2.5 w-2.5" style={{ color: 'var(--chart-2)' }} />
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Audit</p>
            </div>
            <p className="text-[11px] font-bold leading-tight">{auditRatio}</p>
            <p className="text-[8px] text-muted-foreground">{formatBytes(MOCK_INTRA.audit.doneBytes)} / {formatBytes(MOCK_INTRA.audit.receivedBytes)}</p>
          </div>
        </div>

        {/* What's up */}
        <div className="flex-1 min-h-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            En cours
          </p>
          <div className="space-y-1">
            {MOCK_INTRA.whatsUp.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/30">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: INTRA_COLOR }} />
                  <span className="text-[11px] font-medium truncate">{p.name}</span>
                </div>
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {p.deadline ? `fin ${p.deadline}` : p.updated ? `maj ${p.updated}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
