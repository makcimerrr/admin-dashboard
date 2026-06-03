/**
 * Intégration Teams via "Flux de travail" Power Automate.
 *
 * Le webhook O365 classique étant déprécié, on poste sur l'URL générée par un
 * flux Power Automate du type « Publier sur un canal quand une requête webhook
 * est reçue » (template Workflows). Ce flux attend le corps d'un message Teams
 * contenant une Adaptive Card :
 *
 *   { type: "message", attachments: [{
 *       contentType: "application/vnd.microsoft.card.adaptive",
 *       content: <adaptive card>
 *   }] }
 *
 * URL à mettre dans l'env TEAMS_WEBHOOK_URL.
 */

const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;

export function isTeamsConfigured(): boolean {
  return Boolean(TEAMS_WEBHOOK_URL);
}

// ─── Helpers Adaptive Card (sous-ensemble typé minimal) ──────────────────────

export type AdaptiveElement = Record<string, unknown>;

export function textBlock(
  text: string,
  opts: { size?: 'Small' | 'Default' | 'Medium' | 'Large' | 'ExtraLarge'; weight?: 'Lighter' | 'Default' | 'Bolder'; color?: 'Default' | 'Accent' | 'Good' | 'Warning' | 'Attention'; wrap?: boolean; isSubtle?: boolean; spacing?: string } = {},
): AdaptiveElement {
  return {
    type: 'TextBlock',
    text,
    wrap: opts.wrap ?? true,
    ...(opts.size ? { size: opts.size } : {}),
    ...(opts.weight ? { weight: opts.weight } : {}),
    ...(opts.color ? { color: opts.color } : {}),
    ...(opts.isSubtle ? { isSubtle: true } : {}),
    ...(opts.spacing ? { spacing: opts.spacing } : {}),
  };
}

export function factSet(facts: { title: string; value: string }[]): AdaptiveElement {
  return { type: 'FactSet', facts };
}

export function buildAdaptiveCard(body: AdaptiveElement[], actions: AdaptiveElement[] = []): object {
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body,
    ...(actions.length > 0 ? { actions } : {}),
  };
}

/** Bouton "Ouvrir l'URL". */
export function openUrlAction(title: string, url: string): AdaptiveElement {
  return { type: 'Action.OpenUrl', title, url };
}

/**
 * Poste une Adaptive Card sur le flux Teams. Renvoie false si non configuré
 * ou en cas d'échec (les flux Power Automate répondent souvent 202 Accepted).
 */
export async function sendTeamsCard(card: object): Promise<boolean> {
  if (!TEAMS_WEBHOOK_URL) return false;
  try {
    const res = await fetch(TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: card,
          },
        ],
      }),
    });
    return res.ok || res.status === 202;
  } catch (error) {
    console.error('sendTeamsCard failed:', error);
    return false;
  }
}

/** Raccourci texte simple (titre + lignes), pour les notifications ponctuelles. */
export async function sendTeamsMessage(title: string, lines: string[]): Promise<boolean> {
  const card = buildAdaptiveCard([
    textBlock(title, { size: 'Large', weight: 'Bolder' }),
    ...lines.map((l) => textBlock(l)),
  ]);
  return sendTeamsCard(card);
}
