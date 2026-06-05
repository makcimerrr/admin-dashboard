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
/** 2e flux Power Automate — canal dédié aux réponses de formulaire (modal du bot). */
const TEAMS_WEBHOOK_URL_FORMS = process.env.TEAMS_WEBHOOK_URL_FORMS;

export function isTeamsConfigured(): boolean {
  return Boolean(TEAMS_WEBHOOK_URL);
}

export function isTeamsFormsConfigured(): boolean {
  return Boolean(TEAMS_WEBHOOK_URL_FORMS);
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

/** Poste une Adaptive Card sur une URL de flux Power Automate donnée. */
async function postCardTo(url: string | undefined, card: object): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, {
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
    console.error('postCardTo failed:', error);
    return false;
  }
}

/**
 * Poste une Adaptive Card sur le flux Teams principal (recap, relances, escalade).
 * Renvoie false si non configuré ou en cas d'échec (les flux Power Automate
 * répondent souvent 202 Accepted).
 */
export async function sendTeamsCard(card: object): Promise<boolean> {
  return postCardTo(TEAMS_WEBHOOK_URL, card);
}

/** Poste une Adaptive Card sur le 2e flux Teams (réponses de formulaire / modal). */
export async function sendTeamsFormsCard(card: object): Promise<boolean> {
  return postCardTo(TEAMS_WEBHOOK_URL_FORMS, card);
}

/**
 * Carte « réponse de formulaire » (modal du bot : statut + commentaire).
 * Destinée au 2e canal Teams.
 */
export function buildReplyCard(opts: {
  source: string;       // type de relance (ex. « Code review », « Rapport d'audit »…)
  who: string;          // login/nom de la personne qui répond
  status: string;       // statut choisi dans le modal
  comment?: string;     // commentaire libre
  context?: { title: string; value: string }[]; // contexte (projet, promo…)
}): object {
  const facts = [
    { title: 'Type', value: opts.source },
    { title: 'De', value: opts.who },
    { title: 'Statut', value: opts.status },
    ...(opts.context ?? []),
  ];
  const body: AdaptiveElement[] = [
    textBlock('📨 Réponse reçue', { size: 'Large', weight: 'Bolder' }),
    factSet(facts),
  ];
  if (opts.comment && opts.comment.trim()) {
    body.push(textBlock('Commentaire', { weight: 'Bolder', spacing: 'Medium' }));
    body.push(textBlock(opts.comment.trim(), { wrap: true }));
  }
  return buildAdaptiveCard(body);
}

/**
 * Carte « relance » (Feature 5 — relance émise en parallèle du DM bot).
 * Titre + FactSet de contexte + lien optionnel (planning…).
 */
export function buildRelanceCard(opts: {
  title: string;
  facts: { title: string; value: string }[];
  url?: string;
  urlLabel?: string;
}): object {
  const body: AdaptiveElement[] = [
    textBlock(opts.title, { size: 'Large', weight: 'Bolder' }),
    factSet(opts.facts),
  ];
  const actions = opts.url ? [openUrlAction(opts.urlLabel ?? 'Ouvrir', opts.url)] : [];
  return buildAdaptiveCard(body, actions);
}

/** Carte d'escalade (Feature 7 — auditeur sans réponse après 2 jours ouvrés). */
export function buildEscalationCard(opts: {
  auditorLogin: string;
  projectName?: string | null;
  requestedAt: Date;
  suiviUrl?: string;
}): object {
  const facts = [
    { title: 'Auditeur', value: opts.auditorLogin },
    ...(opts.projectName ? [{ title: 'Projet', value: opts.projectName }] : []),
    { title: 'Demandé le', value: opts.requestedAt.toLocaleDateString('fr-FR') },
  ];
  const body: AdaptiveElement[] = [
    textBlock('⚠️ Rapport d\'audit sans réponse', { size: 'Large', weight: 'Bolder', color: 'Attention' }),
    textBlock('Aucune réponse de l\'auditeur après 2 jours ouvrés.', { isSubtle: true }),
    factSet(facts),
  ];
  const actions = opts.suiviUrl ? [openUrlAction('Ouvrir le suivi', opts.suiviUrl)] : [];
  return buildAdaptiveCard(body, actions);
}

/** Raccourci texte simple (titre + lignes), pour les notifications ponctuelles. */
export async function sendTeamsMessage(title: string, lines: string[]): Promise<boolean> {
  const card = buildAdaptiveCard([
    textBlock(title, { size: 'Large', weight: 'Bolder' }),
    ...lines.map((l) => textBlock(l)),
  ]);
  return sendTeamsCard(card);
}
