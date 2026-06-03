import type { WeeklyRecap } from '@/lib/db/services/crCockpit';
import {
  buildAdaptiveCard,
  textBlock,
  openUrlAction,
  type AdaptiveElement,
} from './teams';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://admin-dashboard-blue-one.vercel.app';

function frDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

/**
 * Adaptive Card du recap hebdo (semaine écoulée).
 * Contenu : nb de CR de la semaine passée + liste des chefs de groupe contactés
 * qui n'ont pas pris de CR, avec leur promo entre parenthèses. Pas d'analyse
 * par promo.
 */
export function buildRecapCard(recap: WeeklyRecap): object {
  const body: AdaptiveElement[] = [
    textBlock('📊 Recap Code Reviews', { size: 'Large', weight: 'Bolder' }),
    textBlock(`Semaine du ${frDate(recap.weekStart)} au ${frDate(recap.weekEnd)}`, {
      isSubtle: true,
      spacing: 'None',
    }),
    textBlock(`**${recap.auditsLastWeek}** CR réalisée${recap.auditsLastWeek > 1 ? 's' : ''} la semaine passée.`, {
      spacing: 'Medium',
    }),
  ];

  if (recap.captains.length === 0) {
    body.push(textBlock('Tous les chefs contactés ont pris leur CR 🎉', { spacing: 'Medium' }));
  } else {
    body.push(
      textBlock(
        `Chefs de groupe contactés sans CR (${recap.captains.length}) :`,
        { weight: 'Bolder', spacing: 'Medium' },
      ),
    );
    for (const c of recap.captains) {
      body.push(textBlock(`• ${c.name} (${c.promo})`, { spacing: 'None' }));
    }
  }

  const actions: AdaptiveElement[] = [
    openUrlAction('Ouvrir le suivi', `${BASE_URL}/code-reviews/suivi`),
    openUrlAction('Cockpit CR', `${BASE_URL}/code-reviews/cockpit`),
  ];

  return buildAdaptiveCard(body, actions);
}
