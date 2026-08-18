/**
 * Analyse des journaux d'entretiens saisis à la main dans Notion.
 *
 * Le champ « Suivi entretiens Alternance » est du texte libre où plusieurs
 * visites s'accumulent sur une seule ligne :
 *
 *   « RDV alternance 25/09/24 RDV alternance 26/08/25 »
 *   « RDV du 10/06/2024 T. DUBOIS RDV 13/01/2025 ThéO Dubois »
 *
 * Un suivi = une visite datée : on découpe pour que l'historique du hub porte
 * une entrée par RDV (c'est ce qui est présenté en audit), au lieu d'un bloc
 * unique daté du premier rendez-vous.
 *
 * Logique PURE, sans accès base ni réseau — testée directement.
 */

/**
 * Libellés qui démarrent une nouvelle entrée dans le journal. Volontairement
 * spécifiques : un mot courant comme « point » découperait des phrases au
 * milieu (« faire le point sur… »).
 */
const ENTRY_MARKER = /\b(RDV|Rendez-vous|Entretien|Visite)\b/gi;

const DATE_PATTERN = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/;

/**
 * Première date d'un texte libre, format JJ/MM/AA(AA). Une année à deux
 * chiffres est lue comme 20xx : ces suivis datent tous des années 2020.
 */
export function dateInText(raw: string): Date | null {
  const m = raw.match(DATE_PATTERN);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
}

export interface LogEntry {
  /** Date du RDV, ou null si le texte n'en porte aucune. */
  date: Date | null;
  content: string;
}

/**
 * Découpe un journal en une entrée par RDV.
 *
 * On coupe AVANT le libellé (« RDV … »), pas avant la date : sinon le libellé
 * reste collé à l'entrée précédente et la nouvelle commence par une date nue.
 * Sans libellé répété, on retombe sur un découpage par date ; sans date du
 * tout, l'entrée reste entière (ex. « Rupture »).
 */
export function splitLogEntries(raw: string): LogEntry[] {
  const text = raw.trim();
  if (!text) return [];

  const markers = [...text.matchAll(ENTRY_MARKER)].map((m) => m.index!);
  const cuts = markers.length >= 2
    ? markers
    : [...text.matchAll(new RegExp(DATE_PATTERN, 'g'))].map((m) => m.index!);

  if (cuts.length <= 1) return [{ date: dateInText(text), content: text }];

  const entries: LogEntry[] = [];
  for (let i = 0; i < cuts.length; i++) {
    // La première entrée démarre au début du texte, pour ne rien perdre de ce
    // qui précéderait le premier libellé.
    const start = i === 0 ? 0 : cuts[i];
    const end = i + 1 < cuts.length ? cuts[i + 1] : text.length;
    const content = text.slice(start, end).trim();
    if (content) entries.push({ date: dateInText(content), content });
  }
  return entries;
}
