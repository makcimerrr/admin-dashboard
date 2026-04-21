import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, ArrowUpRight, Zap, ShieldCheck, ExternalLink } from 'lucide-react';

// Mock data — would be fetched from https://intra.zone01rouennormandie.org/
const MOCK_INTRA = {
  cursus: {
    name: 'Cursus',
    status: 'IN_PROGRESS',
    cohort: 'P1 2023',
    joinedAt: '22/05/2023',
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
    { id: 2, name: 'forum-moderation', status: 'in_progress', deadline: null, updated: '18/02/2026' },
    { id: 3, name: 'netfix', status: 'waiting', deadline: null },
  ],
};

function formatBytes(b: number): string {
  if (b >= 1_000_000) return (b / 1_000_000).toFixed(2) + ' MB';
  if (b >= 1_000) return (b / 1_000).toFixed(1) + ' KB';
  return b + ' B';
}

export function IntraWidget() {
  const levelRatio = Math.round((MOCK_INTRA.level / MOCK_INTRA.expectedLevel) * 100);
  const auditRatio = (MOCK_INTRA.audit.doneBytes / MOCK_INTRA.audit.receivedBytes).toFixed(2);

  return (
    <Card className="border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Globe className="h-4 w-4 text-cyan-600" />
          Intra
        </CardTitle>
        <a
          href="https://intra.zone01rouennormandie.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Ouvrir l'intra
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current program + level */}
        <div className="rounded-xl border bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold">{MOCK_INTRA.cursus.name}</span>
                <Badge className="text-[9px] h-4 px-1.5 bg-cyan-500/15 text-cyan-700 hover:bg-cyan-500/20">
                  IN PROGRESS
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {MOCK_INTRA.cursus.cohort} · Depuis le {MOCK_INTRA.cursus.joinedAt}
              </p>
            </div>
            <div className="text-center shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Niveau</p>
              <p className="text-2xl font-bold text-cyan-600 leading-none">{MOCK_INTRA.level}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">attendu: {MOCK_INTRA.expectedLevel}</p>
            </div>
          </div>
          {/* Level progress */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Progression</span>
              <span>{levelRatio}% · prochain niveau {MOCK_INTRA.nextLevel}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                style={{ width: `${Math.min(100, levelRatio)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rank + last skill + audit */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-3 w-3 text-violet-500" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rang</p>
            </div>
            <p className="text-xs font-semibold leading-tight">{MOCK_INTRA.rank}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">dans {MOCK_INTRA.nextRankIn} niveau</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3 w-3 text-amber-500" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dernier skill</p>
            </div>
            <p className="text-xs font-semibold leading-tight">{MOCK_INTRA.lastSkill}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Audit ratio</p>
            </div>
            <p className="text-xs font-semibold leading-tight">{auditRatio}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {formatBytes(MOCK_INTRA.audit.doneBytes)} / {formatBytes(MOCK_INTRA.audit.receivedBytes)}
            </p>
          </div>
        </div>

        {/* What's up */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Projets en cours
          </p>
          <div className="space-y-1.5">
            {MOCK_INTRA.whatsUp.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                    p.status === 'in_progress' ? 'bg-cyan-500' : 'bg-amber-400'
                  }`} />
                  <span className="text-xs font-medium truncate">{p.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {p.deadline ? `fin ${p.deadline}` : p.updated ? `maj ${p.updated}` : 'en attente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
