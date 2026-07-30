import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getLatestCoffeeDraw } from '@/lib/db/services/coffeeDraws';
import { CoffeeDrawButton } from './coffee-draw-button';

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
        <CoffeeDrawButton hasExisting={!!draw} />
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
              {draw.participants.length} apprenants tirés au sort · phase de test
              (aucun message envoyé)
            </p>
            <ul className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {draw.participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-background/50 px-3 py-2"
                >
                  <span className="text-sm font-medium truncate">
                    {p.firstName} {p.lastName}
                  </span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {p.promoName}
                  </Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
