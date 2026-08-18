import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BODY_TEMPLATE,
  computeDueDate,
  isMilestoneRelevant,
  isSameDay,
  renderTemplate,
  textToHtml,
} from './follow-up-templates';

describe('renderTemplate', () => {
  it('remplace les variables connues', () => {
    expect(renderTemplate('Bonjour {{tuteur}}', { tuteur: 'M. Dupont' })).toBe(
      'Bonjour M. Dupont',
    );
  });

  it('tolère les espaces dans les accolades', () => {
    expect(renderTemplate('{{ apprenant }}', { apprenant: 'Lea' })).toBe('Lea');
  });

  it("laisse visible une variable inconnue plutôt que d'écrire un trou", () => {
    expect(renderTemplate('Lien : {{inconnue}}', {})).toBe('Lien : {{inconnue}}');
  });

  it('remplace toutes les occurrences', () => {
    expect(renderTemplate('{{x}}-{{x}}', { x: 'a' })).toBe('a-a');
  });

  it('rend le modèle par défaut sans laisser de variable non substituée', () => {
    const vars = {
      tuteur: 'M. Dupont',
      apprenant: 'Lea Martin',
      promo: 'P1 2024',
      entreprise: 'Acme',
      jalon: '6 mois',
      date_debut: '1 septembre 2025',
      date_fin: '31 août 2027',
      date_echeance: '1 mars 2026',
      lien_rdv: 'https://calendar.app.google/abc',
      expediteur: 'Bastien',
    };
    const rendered = renderTemplate(DEFAULT_BODY_TEMPLATE, vars);
    expect(rendered).not.toMatch(/\{\{/);
    expect(rendered).toContain('Lea Martin');
    expect(rendered).toContain('https://calendar.app.google/abc');
  });
});

describe('textToHtml', () => {
  it('échappe le HTML entrant', () => {
    expect(textToHtml('<script>alert(1)</script>')).toContain('&lt;script&gt;');
  });

  it('rend les URLs cliquables', () => {
    expect(textToHtml('Voir https://x.test/a')).toContain('<a href="https://x.test/a"');
  });

  it('conserve les sauts de ligne', () => {
    expect(textToHtml('a\nb')).toContain('a<br>b');
  });
});

describe('computeDueDate', () => {
  it('ajoute le nombre de mois du jalon à la date de début', () => {
    expect(computeDueDate(new Date(2025, 8, 1), 6)).toEqual(new Date(2026, 2, 1));
  });

  it('gère les fins de mois (31 janvier + 1 mois → 28/29 février)', () => {
    const due = computeDueDate(new Date(2025, 0, 31), 1);
    expect(due.getMonth()).toBe(1);
    expect(due.getDate()).toBe(28);
  });

  it('gère les jalons longs (2 ans)', () => {
    expect(computeDueDate(new Date(2024, 8, 2), 24)).toEqual(new Date(2026, 8, 2));
  });
});

describe('isMilestoneRelevant', () => {
  const end = new Date(2026, 7, 31);

  it('retient un jalon qui tombe avant la fin du contrat', () => {
    expect(isMilestoneRelevant(new Date(2026, 2, 1), end, true)).toBe(true);
  });

  it('retient un jalon qui tombe pile le jour de fin', () => {
    expect(isMilestoneRelevant(new Date(2026, 7, 31), end, true)).toBe(true);
  });

  it('écarte un jalon au-delà de la fin du contrat', () => {
    expect(isMilestoneRelevant(new Date(2026, 8, 1), end, true)).toBe(false);
  });

  it('écarte un jalon désactivé même dans la période', () => {
    expect(isMilestoneRelevant(new Date(2026, 2, 1), end, false)).toBe(false);
  });
});

describe('isSameDay', () => {
  it('ignore l’heure', () => {
    expect(isSameDay(new Date(2026, 2, 1, 8), new Date(2026, 2, 1, 23))).toBe(true);
  });

  it('distingue deux jours différents', () => {
    expect(isSameDay(new Date(2026, 2, 1), new Date(2026, 2, 2))).toBe(false);
  });
});
