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

/** Échappe le HTML et rend les URLs cliquables, en conservant les sauts de ligne. */
export function textToHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#2563eb">$1</a>',
  );
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.6;color:#111">${linked
    .split('\n')
    .join('<br>')}</div>`;
}

// ─── Calcul des échéances ────────────────────────────────────────────────────

/** Date d'échéance d'un jalon : début de contrat + N mois. */
export function computeDueDate(contractStart: Date, offsetMonths: number): Date {
  return addMonths(contractStart, offsetMonths);
}

/**
 * Un jalon n'est posé que s'il est actif ET tombe avant la fin du contrat :
 * relancer une entreprise pour un point « 2 ans » sur un contrat de 12 mois
 * n'a pas de sens.
 */
export function isMilestoneRelevant(
  due: Date,
  contractEnd: Date,
  isActive: boolean,
): boolean {
  return isActive && due.getTime() <= contractEnd.getTime();
}

/** Compare deux dates au jour près (les échéances n'ont pas d'heure utile). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
