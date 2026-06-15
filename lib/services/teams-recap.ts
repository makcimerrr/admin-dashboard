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
      const stack = c.track ? ` _${c.track}_` : '';
      const coach = c.coach ? ` · coach : ${c.coach}` : '';
      body.push(
        textBlock(`• **${c.name}** (${c.promo}) — ${c.project}${stack}${coach}`, { spacing: 'None' }),
      );
    }
  }

  const actions: AdaptiveElement[] = [
    openUrlAction('Ouvrir le suivi', `${BASE_URL}/code-reviews/suivi`),
    openUrlAction('Cockpit CR', `${BASE_URL}/code-reviews/cockpit`),
  ];

  return buildAdaptiveCard(body, actions);
}

// ─── Carte interactive (Bot Framework / Universal Actions) ───────────────────

/** Item ciblé par une case à cocher de la checklist (un groupe). */
export interface RecapItem {
  groupId: string;
  promoId: string;
  projectName: string;
  /** Libellé affiché : « Nom (promo) — projet · coach ». */
  label: string;
}

/** Construit le libellé d'un capitaine identique à la carte statique. */
function captainLabel(c: WeeklyRecap['captains'][number]): string {
  const stack = c.track ? ` ${c.track}` : '';
  const coach = c.coach ? ` · coach : ${c.coach}` : '';
  return `${c.name} (${c.promo}) — ${c.project}${stack}${coach}`;
}

/** Identifiant DOM/Input d'un item (Input.Toggle id). */
function toggleId(item: { groupId: string }): string {
  return `done-${item.groupId}`;
}

/**
 * Carte interactive du recap (Universal Action). Pour chaque capitaine sans CR,
 * un Input.Toggle (coché = « RDV pris »). Un bouton Action.Execute
 * (verb `recapUpdate`) applique les changements, et un bloc `refresh`
 * (verb `recapRefresh`) reconstruit la carte à l'ouverture/au survol.
 *
 * Le `data` des actions porte la liste des items (groupId/promoId/projectName)
 * pour que l'endpoint sache quels groupes mettre à jour / re-lire.
 */
export function buildInteractiveRecapCard(recap: WeeklyRecap): object {
  const items: RecapItem[] = recap.captains.map((c) => ({
    groupId: c.groupId,
    promoId: c.promoId,
    projectName: c.projectName,
    label: captainLabel(c),
  }));

  // État initial : aucune case cochée (les capitaines listés sont justement
  // ceux sans RDV pris).
  return buildRecapCardFromState(
    items,
    recap.auditsLastWeek,
    `Semaine du ${frDate(recap.weekStart)} au ${frDate(recap.weekEnd)}`,
    new Set<string>(),
  );
}

/** Clé canonique d'un item pour l'état coché. */
function itemKey(item: { groupId: string; promoId: string; projectName: string }): string {
  return `${item.groupId}:${item.promoId}:${item.projectName.toLowerCase()}`;
}

/**
 * Reconstruit la carte interactive à partir d'un état courant (set des clés
 * `groupId:promoId:lower(projectName)` actuellement cochées « RDV pris »).
 * Réutilisée par l'endpoint après un toggle.
 */
export function buildRecapCardFromState(
  items: RecapItem[],
  auditsLastWeek: number,
  weekLabel: string,
  confirmedKeys: Set<string>,
): object {
  const body: AdaptiveElement[] = [
    textBlock('📊 Recap Code Reviews', { size: 'Large', weight: 'Bolder' }),
    textBlock(weekLabel, { isSubtle: true, spacing: 'None' }),
    textBlock(
      `**${auditsLastWeek}** CR réalisée${auditsLastWeek > 1 ? 's' : ''} la semaine passée.`,
      { spacing: 'Medium' },
    ),
  ];

  if (items.length === 0) {
    body.push(
      textBlock('Tous les chefs contactés ont pris leur CR 🎉', { spacing: 'Medium' }),
    );
  } else {
    body.push(
      textBlock(`Chefs de groupe contactés sans CR (${items.length}) :`, {
        weight: 'Bolder',
        spacing: 'Medium',
      }),
    );
    body.push(
      textBlock('Cochez la case quand le RDV a été pris, puis « Mettre à jour ».', {
        isSubtle: true,
        spacing: 'None',
      }),
    );
    for (const item of items) {
      const checked = confirmedKeys.has(itemKey(item));
      body.push({
        type: 'Input.Toggle',
        id: toggleId(item),
        title: item.label,
        value: checked ? 'true' : 'false',
        valueOn: 'true',
        valueOff: 'false',
        wrap: true,
      });
    }
  }

  // Données partagées par les actions : les items à cibler + l'en-tête, pour
  // pouvoir reconstruire la carte à l'identique après un toggle/refresh.
  const data = {
    auditsLastWeek,
    weekLabel,
    items: items.map((i) => ({
      groupId: i.groupId,
      promoId: i.promoId,
      projectName: i.projectName,
      label: i.label,
    })),
  };

  const actions: AdaptiveElement[] =
    items.length > 0
      ? [
          {
            type: 'Action.Execute',
            title: 'Mettre à jour',
            verb: 'recapUpdate',
            data,
          },
          openUrlAction('Ouvrir le suivi', `${BASE_URL}/code-reviews/suivi`),
        ]
      : [openUrlAction('Ouvrir le suivi', `${BASE_URL}/code-reviews/suivi`)];

  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    msteams: { width: 'Full' },
    refresh: {
      action: { type: 'Action.Execute', verb: 'recapRefresh', data },
      userIds: [],
    },
    body,
    ...(actions.length > 0 ? { actions } : {}),
  };
}

/**
 * Extrait l'état coché à partir du payload d'une Universal Action :
 * - `action.data` porte les valeurs des Input.Toggle (clé `done-<groupId>`).
 * Retourne le set des clés `groupId:promoId:lower(projectName)` cochées et la
 * liste typée des items (depuis `action.data.items`).
 */
export function parseRecapAction(
  data: Record<string, unknown> | undefined | null,
): { items: RecapItem[]; checkedKeys: Set<string>; auditsLastWeek: number; weekLabel: string } {
  const rawItems = Array.isArray(data?.items) ? (data!.items as unknown[]) : [];
  const items: RecapItem[] = rawItems
    .map((raw) => {
      const o = (raw ?? {}) as Record<string, unknown>;
      const groupId = typeof o.groupId === 'string' ? o.groupId : '';
      const promoId = typeof o.promoId === 'string' ? o.promoId : '';
      const projectName = typeof o.projectName === 'string' ? o.projectName : '';
      const label = typeof o.label === 'string' ? o.label : projectName;
      return { groupId, promoId, projectName, label };
    })
    .filter((i) => i.groupId && i.promoId && i.projectName);

  const checkedKeys = new Set<string>();
  for (const item of items) {
    const v = data?.[toggleId(item)];
    if (v === 'true' || v === true) {
      checkedKeys.add(itemKey(item));
    }
  }

  const auditsLastWeek =
    typeof data?.auditsLastWeek === 'number' ? data.auditsLastWeek : 0;
  const weekLabel =
    typeof data?.weekLabel === 'string' ? data.weekLabel : 'Mise à jour';

  return { items, checkedKeys, auditsLastWeek, weekLabel };
}
