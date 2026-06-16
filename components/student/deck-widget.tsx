'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SquareStack, Trophy, Flame, Sparkles, ExternalLink, Swords } from 'lucide-react';

const DECK_URL = 'https://deck.zone01normandie.org/';
const DECK_COLOR = 'var(--chart-3)';
const DECK_COLOR_2 = 'var(--chart-4)';

interface DeckData {
  found: boolean;
  xp: number;
  xpThisWeek: number;
  rank: number;
  totalUsers: number;
  streak: number;
  longestStreak: number;
  competitive: { rating: number | null; wins: number; losses: number };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border overflow-hidden h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <SquareStack className="h-4 w-4" style={{ color: DECK_COLOR }} />
          01 Deck
        </CardTitle>
        <a
          href={DECK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Jouer
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>
      {children}
    </Card>
  );
}

export function DeckWidget() {
  const [data, setData] = useState<DeckData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/me/deck')
      .then((r) => r.json())
      .then((d) => active && setData(d?.success ? d : ({ found: false } as DeckData)))
      .catch(() => active && setData({ found: false } as DeckData))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

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
          <p className="text-xs text-muted-foreground">Aucune donnée 01deck trouvée pour ton compte.</p>
          <a href={DECK_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            Ouvrir 01deck →
          </a>
        </CardContent>
      </Shell>
    );
  }

  const elo = data.competitive.rating;

  return (
    <Shell>
      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 px-4 pb-3">
        {/* XP + streak */}
        <div
          className="rounded-lg border p-3"
          style={{
            backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${DECK_COLOR} 6%, transparent), transparent 60%)`,
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center h-10 w-10 rounded-full border-2"
                style={{
                  color: DECK_COLOR,
                  backgroundColor: `color-mix(in srgb, ${DECK_COLOR} 12%, transparent)`,
                  borderColor: `color-mix(in srgb, ${DECK_COLOR} 30%, transparent)`,
                }}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-tight">XP total</p>
                <p className="text-lg font-bold leading-tight" style={{ color: DECK_COLOR }}>
                  {data.xp.toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
            {data.streak > 0 && (
              <Badge className="text-[9px] h-4 px-1.5 bg-warning/15 text-warning hover:bg-warning/20 gap-0.5">
                <Flame className="h-2.5 w-2.5" />
                {data.streak}j
              </Badge>
            )}
          </div>
          {data.xpThisWeek > 0 && (
            <p className="text-[10px] text-muted-foreground">
              <span className="font-mono font-medium" style={{ color: DECK_COLOR_2 }}>
                +{data.xpThisWeek.toLocaleString('fr-FR')} XP
              </span>{' '}
              cette semaine
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Classement XP</p>
            <div className="flex items-baseline gap-1">
              <Trophy className="h-3 w-3 text-warning" />
              <span className="text-sm font-bold">#{data.rank}</span>
              <span className="text-[10px] text-muted-foreground">/ {data.totalUsers}</span>
            </div>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Compétitif</p>
            <div className="flex items-baseline gap-1">
              <Swords className="h-3 w-3" style={{ color: DECK_COLOR_2 }} />
              {elo != null ? (
                <>
                  <span className="text-sm font-bold">{elo}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {data.competitive.wins}V / {data.competitive.losses}D
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground">Pas encore joué</span>
              )}
            </div>
          </div>
        </div>

        {data.longestStreak > 0 && (
          <p className="text-[10px] text-muted-foreground mt-auto">
            Meilleure série : <span className="font-medium text-foreground">{data.longestStreak} jours</span>
          </p>
        )}
      </CardContent>
    </Shell>
  );
}
