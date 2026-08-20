import { addMonths } from 'date-fns';

/**
 * Logique PURE du suivi en entreprise : calcul des échéances et rendu des
 * modèles de mail. Aucun accès base ni réseau — testable directement, et
 * importable côté client si besoin d'un aperçu.
 */

// ─── Modèles de mail ─────────────────────────────────────────────────────────

export const DEFAULT_SUBJECT_TEMPLATE =
  'Suivi en entreprise de {{apprenant}} — point {{jalon}}';

export const DEFAULT_BODY_TEMPLATE = `Bonjour {{tuteur}},

{{apprenant}} ({{promo}}) est accueilli(e) chez {{entreprise}} depuis le {{date_debut}}.
Dans le cadre de notre accompagnement, nous réalisons un point de suivi à {{jalon}}, prévu autour du {{date_echeance}}.

Pour convenir d'un créneau qui vous arrange, vous pouvez réserver directement ici :
{{lien_rdv}}

Ce point dure environ 45 minutes et permet de faire le bilan de la période écoulée, des missions confiées et des axes de progression.

Si aucun créneau ne vous convient, répondez simplement à ce mail et nous trouverons une autre date.

Bien cordialement,
{{expediteur}}
Zone01 Normandie`;

/** Variables disponibles dans les modèles (affichées dans l'écran de config). */
export const TEMPLATE_VARIABLES = [
  '{{tuteur}}',
  '{{apprenant}}',
  '{{promo}}',
  '{{entreprise}}',
  '{{jalon}}',
  '{{date_debut}}',
  '{{date_fin}}',
  '{{date_echeance}}',
  '{{lien_rdv}}',
  '{{expediteur}}',
] as const;

/**
 * Remplace les `{{variables}}`. Une variable inconnue est laissée TELLE QUELLE :
 * mieux vaut un `{{truc}}` visible dans l'aperçu qu'un trou silencieux dans un
 * mail parti chez une entreprise partenaire.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in vars ? vars[key] : match,
  );
}

// ─── Calcul des échéances ────────────────────────────────────────────────────

/** Date d'échéance d'un jalon : début de contrat + N mois. */
export function computeDueDate(contractStart: Date, offsetMonths: number): Date {
  return addMonths(contractStart, offsetMonths);
}

/**
 * Un jalon n'est posé que s'il est actif ET tombe suffisamment avant la fin du
 * contrat.
 *
 * Deux règles, pas une : relancer une entreprise pour un point « 18 mois » sur
 * un contrat de 12 mois n'a pas de sens ; mais planifier un point 3 jours avant
 * le départ de l'apprenant n'en a pas davantage — personne n'organisera une
 * visite en entreprise pour quelqu'un qui s'en va. D'où la marge minimale,
 * réglable (`follow_up_settings.min_days_before_contract_end`) parce que c'est
 * un arbitrage pédagogique, pas une constante technique.
 */
export function isMilestoneRelevant(
  due: Date,
  contractEnd: Date,
  isActive: boolean,
  minDaysBeforeEnd = 0,
): boolean {
  const latestUseful = contractEnd.getTime() - minDaysBeforeEnd * 86_400_000;
  return isActive && due.getTime() <= latestUseful;
}

/** Compare deux dates au jour près (les échéances n'ont pas d'heure utile). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
