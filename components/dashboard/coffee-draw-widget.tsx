import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getLatestCoffeeDraw } from '@/lib/db/services/coffeeDraws';
import { CoffeeDrawButton } from './coffee-draw-button';
import { CoffeeParticipantRow } from './coffee-participant-row';

function monthLabel(monthKey: string): string {
  // monthKey = 'YYYY-MM' → 'juillet 2026'
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return format(new Date(y, m - 1, 1), 'LLLL yyyy', { locale: fr });
}

export async function CoffeeDrawWidget() {
  const draw = await getLatestCoffeeDraw();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Coffee className="h-4 w-4 text-primary" />
          Café du mois
          {draw && (
            <span className="text-sm font-normal text-muted-foreground capitalize">
              — {monthLabel(draw.month)}
            </span>
          )}
        </CardTitle>
        <CoffeeDrawButton
          hasExisting={!!draw}
          defaultIncludeAlternants={draw?.includeAlternants ?? true}
        />
      </CardHeader>
      <CardContent>
        {!draw || draw.participants.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucun tirage pour le moment. Clique sur « Tirer au sort » pour inviter
            9–10 apprenants (toutes promos) à un café.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {draw.participants.length} apprenants tirés au sort · alternants{' '}
              {draw.includeAlternants ? 'inclus' : 'exclus'} · phase de test
              (aucun message envoyé) · re-tire un apprenant avec l’icône ↻
            </p>
            <ul className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {draw.participants.map((p) => (
                <CoffeeParticipantRow
                  key={p.id}
                  participant={{
                    id: p.id,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    promoName: p.promoName,
                    isAlternant: p.isAlternant,
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
