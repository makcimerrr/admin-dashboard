import type { CrCockpit } from '@/lib/db/services/crCockpit';
import {
  buildAdaptiveCard,
  textBlock,
  factSet,
  openUrlAction,
  type AdaptiveElement,
} from './teams';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://admin-dashboard-blue-one.vercel.app';

function arrow(delta: number): string {
  if (delta > 0) return `▲ +${delta}`;
  if (delta < 0) return `▼ ${delta}`;
  return '=';
}

/**
 * Construit l'Adaptive Card du recap hebdo des code-reviews.
 * Répond à « qui en est où / qui a répondu ou pas » via, par promo :
 *   CR faites cette semaine, en attente, notifiés sans réponse, bloqués ≥7j.
 */
export function buildRecapCard(cockpit: CrCockpit, dateLabel: string): object {
  const { totals } = cockpit;

  const body: AdaptiveElement[] = [
    textBlock('📊 Recap Code Reviews', { size: 'Large', weight: 'Bolder' }),
    textBlock(`Semaine du ${dateLabel}`, { isSubtle: true, spacing: 'None' }),
    factSet([
      { title: 'CR cette semaine', value: `${totals.auditsThisWeek}  (${arrow(totals.auditsThisWeek - totals.auditsLastWeek)} vs S-1)` },
      { title: 'En attente d’audit', value: String(totals.pending) },
      { title: 'Capitaines bloqués ≥7j', value: String(totals.stuck) },
      ...(totals.weeklyTarget > 0
        ? [{ title: 'Objectif hebdo (total)', value: String(totals.weeklyTarget) }]
        : []),
    ]),
  ];

  // Détail par promo (on saute les promos sans activité ni attente).
  const relevant = cockpit.promos.filter(
    (p) => p.auditsThisWeek > 0 || p.pending > 0 || p.stuck > 0,
  );

  if (relevant.length > 0) {
    body.push(textBlock('Par promotion', { weight: 'Bolder', spacing: 'Medium' }));
    for (const p of relevant) {
      const bits = [
        `**${p.auditsThisWeek}** CR cette sem.`,
        `${p.pending} en attente`,
      ];
      if (p.awaitingResponse > 0) bits.push(`${p.awaitingResponse} notifiés sans réponse`);
      if (p.stuck > 0) bits.push(`⚠️ ${p.stuck} bloqués ≥7j`);
      const blockers: string[] = [];
      if (p.noCaptain > 0) blockers.push(`${p.noCaptain} sans capitaine`);
      if (p.noDiscord > 0) blockers.push(`${p.noDiscord} sans Discord`);
      body.push(
        textBlock(`**${p.promoName}** — ${bits.join(' · ')}`, { spacing: 'Small' }),
      );
      if (blockers.length > 0) {
        body.push(textBlock(`   ↳ ${blockers.join(', ')}`, { isSubtle: true, size: 'Small', spacing: 'None' }));
      }
    }
  } else {
    body.push(textBlock('Rien en attente — tout est à jour 🎉', { spacing: 'Medium' }));
  }

  const actions: AdaptiveElement[] = [
    openUrlAction('Ouvrir le cockpit', `${BASE_URL}/code-reviews/cockpit`),
    openUrlAction('Voir le suivi', `${BASE_URL}/code-reviews/suivi`),
  ];

  return buildAdaptiveCard(body, actions);
}
