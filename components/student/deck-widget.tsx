import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SquareStack, Trophy, Flame, Sparkles, ExternalLink } from 'lucide-react';

// Mock data — would be fetched from https://01deck.zone01rouennormandie.org/
const MOCK_DECK = {
  level: 12,
  xp: 8430,
  nextLevelXp: 10000,
  streak: 7,
  cardsUnlocked: 47,
  cardsTotal: 96,
  weeklyRank: 14,
  recent: [
    { id: 1, name: 'Algorithmes avancés', reward: '+250 XP', type: 'challenge' },
    { id: 2, name: 'Boss: Tri fusion', reward: 'Carte rare', type: 'boss' },
  ],
};

export function DeckWidget() {
  const xpRatio = Math.round((MOCK_DECK.xp / MOCK_DECK.nextLevelXp) * 100);
  const cardsRatio = Math.round((MOCK_DECK.cardsUnlocked / MOCK_DECK.cardsTotal) * 100);

  return (
    <Card className="border overflow-hidden h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <SquareStack className="h-4 w-4 text-fuchsia-600" />
          01 Deck
        </CardTitle>
        <a
          href="https://01deck.zone01rouennormandie.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Jouer
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 px-4 pb-3">
        {/* Level + XP bar */}
        <div className="rounded-lg border bg-gradient-to-br from-fuchsia-500/5 via-transparent to-transparent p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-fuchsia-500/10 text-fuchsia-600 border-2 border-fuchsia-500/30">
                <Sparkles className="h-4 w-4" />
                <span className="absolute -bottom-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-fuchsia-600 text-white text-[9px] font-bold shadow-sm">
                  {MOCK_DECK.level}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-tight">Niveau</p>
                <p className="text-xs font-semibold leading-tight">Apprenti du Deck</p>
              </div>
            </div>
            <Badge className="text-[9px] h-4 px-1.5 bg-orange-500/15 text-orange-700 hover:bg-orange-500/20 gap-0.5">
              <Flame className="h-2.5 w-2.5" />
              {MOCK_DECK.streak}j
            </Badge>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">XP</span>
              <span className="font-mono font-medium">
                {MOCK_DECK.xp.toLocaleString('fr-FR')} / {MOCK_DECK.nextLevelXp.toLocaleString('fr-FR')}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-700"
                style={{ width: `${xpRatio}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Cartes</p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold">{MOCK_DECK.cardsUnlocked}</span>
              <span className="text-[10px] text-muted-foreground">/ {MOCK_DECK.cardsTotal}</span>
            </div>
            <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-cyan-500" style={{ width: `${cardsRatio}%` }} />
            </div>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Classement</p>
            <div className="flex items-baseline gap-1">
              <Trophy className="h-3 w-3 text-amber-500" />
              <span className="text-sm font-bold">#{MOCK_DECK.weeklyRank}</span>
              <span className="text-[10px] text-muted-foreground">hebdo</span>
            </div>
          </div>
        </div>

        {/* Recent achievements */}
        <div className="flex-1 min-h-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Récents
          </p>
          <div className="space-y-1">
            {MOCK_DECK.recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/30">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs">
                    {a.type === 'boss' ? '⚔️' : a.type === 'achievement' ? '🏅' : '🎯'}
                  </span>
                  <span className="text-[11px] font-medium truncate">{a.name}</span>
                </div>
                <span className="text-[9px] font-mono text-fuchsia-600 shrink-0">{a.reward}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
