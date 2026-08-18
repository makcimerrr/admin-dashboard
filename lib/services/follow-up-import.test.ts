import { describe, expect, it } from 'vitest';
import { dateInText, splitLogEntries } from './follow-up-import';

/** Minuit UTC — la convention de stockage des dates de suivi. */
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe('dateInText', () => {
  it('construit la date en UTC, pas en heure locale', () => {
    // Sinon, stockée dans une colonne `timestamp`, elle recule d'un jour.
    const d = dateInText('RDV 13/11/25')!;
    expect(d.toISOString()).toBe('2025-11-13T00:00:00.000Z');
  });

  it('lit une année à deux chiffres comme 20xx', () => {
    expect(dateInText('RDV alternance 13/11/25')).toEqual(utc(2025, 11, 13));
  });

  it('lit une année à quatre chiffres', () => {
    expect(dateInText('RDV du 10/06/2024 T. DUBOIS')).toEqual(utc(2024, 6, 10));
  });

  it('accepte les séparateurs . et -', () => {
    expect(dateInText('visite 05-03-26')).toEqual(utc(2026, 3, 5));
    expect(dateInText('visite 05.03.26')).toEqual(utc(2026, 3, 5));
  });

  it('renvoie null sans date', () => {
    expect(dateInText('Rupture')).toBeNull();
  });

  it('rejette un mois impossible plutôt que de fabriquer une date fausse', () => {
    expect(dateInText('ref 12/34/25')).toBeNull();
  });
});

describe('splitLogEntries', () => {
  it('ne découpe pas un journal à une seule visite', () => {
    const entries = splitLogEntries('RDV alternance 13/11/25');
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toEqual(utc(2025, 11, 13));
  });

  it('découpe deux visites en gardant le libellé avec sa date', () => {
    const entries = splitLogEntries('RDV alternance 25/09/24 RDV alternance 26/08/25');
    expect(entries).toHaveLength(2);
    expect(entries[0].content).toBe('RDV alternance 25/09/24');
    expect(entries[0].date).toEqual(utc(2024, 9, 25));
    expect(entries[1].content).toBe('RDV alternance 26/08/25');
    expect(entries[1].date).toEqual(utc(2025, 8, 26));
  });

  it('conserve le nom de l’intervenant dans la bonne entrée', () => {
    const entries = splitLogEntries('RDV du 10/06/2024 T. DUBOIS RDV 13/01/2025 ThéO Dubois');
    expect(entries).toHaveLength(2);
    expect(entries[0].content).toBe('RDV du 10/06/2024 T. DUBOIS');
    expect(entries[1].content).toBe('RDV 13/01/2025 ThéO Dubois');
  });

  it('gère trois visites mêlant les formulations', () => {
    const entries = splitLogEntries(
      'RDV alternance 30/08/24 RDV du 06/03/25 Q.Boiteux RDV alternance 19/01/26',
    );
    expect(entries.map((e) => e.date)).toEqual([
      utc(2024, 8, 30),
      utc(2025, 3, 6),
      utc(2026, 1, 19),
    ]);
    expect(entries[1].content).toBe('RDV du 06/03/25 Q.Boiteux');
  });

  it('garde une entrée sans date intacte', () => {
    const entries = splitLogEntries('Rupture');
    expect(entries).toEqual([{ date: null, content: 'Rupture' }]);
  });

  it('renvoie une liste vide sur du vide', () => {
    expect(splitLogEntries('   ')).toEqual([]);
  });

  it('ne découpe pas sur un mot courant comme « point »', () => {
    const entries = splitLogEntries('RDV 12/05/25 : faire le point sur la montée en compétences');
    expect(entries).toHaveLength(1);
  });

  it('retombe sur un découpage par date sans libellé répété', () => {
    const entries = splitLogEntries('01/02/25 échange tel 03/04/25 second échange');
    expect(entries).toHaveLength(2);
    expect(entries[0].date).toEqual(utc(2025, 2, 1));
    expect(entries[1].date).toEqual(utc(2025, 4, 3));
  });
});
