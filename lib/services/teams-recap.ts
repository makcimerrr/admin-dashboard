import type { WeeklyRecap } from '@/lib/db/services/crCockpit';
import {
  buildAdaptiveCard,
  textBlock,
  openUrlAction,
  type AdaptiveElement,
} from './teams';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hub.zone01normandie.org';

function frDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

/** Lien direct vers la page des groupes d'une promo (pour agir sur un capitaine). */
function groupPageUrl(promoId: string): string {
  return `${BASE_URL}/code-reviews/${encodeURIComponent(promoId)}/group`;
}

/**
 * Adaptive Card du recap hebdo (semaine écoulée), postée via le Flux de travail
 * Power Automate (webhook à sens unique).
 *
 * Comme Teams ne permet pas de checklist interactive partagée sans bot, chaque
 * capitaine est rendu **cliquable** : le lien ouvre la page des groupes de sa
 * promo sur le dashboard, où l'on agit réellement (réservation / suivi). Le
 * dashboard reste la source de vérité partagée ; le recap n'est qu'un digest
 * actionnable. La liste exclut déjà les capitaines ayant pris RDV (bouton vert)
 * ou passé l'audit.
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
    body.push(
      textBlock('👉 Cliquez sur un nom pour ouvrir le suivi de sa promo et agir.', {
        isSubtle: true,
        spacing: 'None',
      }),
    );
    for (const c of recap.captains) {
      const stack = c.track ? ` _${c.track}_` : '';
      const coach = c.coach ? ` · coach : ${c.coach}` : '';
      const name = `[**${c.name}**](${groupPageUrl(c.promoId)})`;
      body.push(
        textBlock(`• ${name} (${c.promo}) — ${c.project}${stack}${coach}`, { spacing: 'None' }),
      );
    }
  }

  const actions: AdaptiveElement[] = [
    openUrlAction('Ouvrir le suivi', `${BASE_URL}/code-reviews/suivi`),
    openUrlAction('Cockpit CR', `${BASE_URL}/code-reviews/cockpit`),
  ];

  return buildAdaptiveCard(body, actions);
}
