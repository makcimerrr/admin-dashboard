import type { GuildMember } from './discord';

/**
 * Rapprochement membres Discord ↔ apprenants, à partir des pseudos du serveur
 * (incohérents : login, « Prénom Nom », nom seul, etc.). Produit des suggestions
 * avec un niveau de confiance ; seules les « high » non ambiguës sont
 * pré-cochées côté UI (validation humaine avant liaison).
 */

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface MatchStudent {
  login: string;
  firstName: string;
  lastName: string;
  promoName: string | null;
}

export interface MatchSuggestion {
  login: string;
  name: string;
  promoName: string | null;
  discordId: string;
  /** Libellé du membre Discord (pseudo serveur / nom global / @handle). */
  memberLabel: string;
  /** Critère de correspondance (affiché). */
  matchedOn: string;
  confidence: MatchConfidence;
  /** Pré-coché dans l'UI (high + non ambigu). */
  preChecked: boolean;
}

/** Normalise : minuscules, sans accents, alphanumérique espacé. */
function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toks(s: string | null | undefined): string[] {
  return norm(s).split(' ').filter(Boolean);
}

interface MemberIdx {
  m: GuildMember;
  fields: string[]; // valeurs normalisées (nick, globalName, username)
  tokens: Set<string>; // union des tokens de tous les champs
}

const RANK: Record<MatchConfidence, number> = { high: 3, medium: 2, low: 1 };

/**
 * @param students apprenants NON liés (login, prénom, nom)
 * @param members  membres du serveur NON déjà liés à un autre apprenant
 */
export function matchMembersToStudents(
  students: MatchStudent[],
  members: GuildMember[],
): MatchSuggestion[] {
  const idx: MemberIdx[] = members.map((m) => {
    const fields = [m.nick, m.globalName, m.username].map(norm).filter(Boolean);
    const tokens = new Set<string>();
    for (const f of fields) for (const t of f.split(' ')) if (t) tokens.add(t);
    return { m, fields, tokens };
  });

  interface Best { member: MemberIdx; matchedOn: string; confidence: MatchConfidence }

  const results: { s: MatchStudent; best: Best | null }[] = [];

  for (const s of students) {
    const login = norm(s.login);
    const fTok = toks(s.firstName);
    const lTok = toks(s.lastName);
    const first = fTok.join(' ');
    const last = lTok.join(' ');
    const fullA = norm(`${s.firstName} ${s.lastName}`);
    const fullB = norm(`${s.lastName} ${s.firstName}`);

    let best: Best | null = null;
    const consider = (member: MemberIdx, confidence: MatchConfidence, matchedOn: string) => {
      if (!best || RANK[confidence] > RANK[best.confidence]) best = { member, confidence, matchedOn };
    };

    for (const mi of idx) {
      // HIGH — login exact (un champ entier == login) ou login présent comme token
      if (login && (mi.fields.includes(login) || mi.tokens.has(login))) {
        consider(mi, 'high', 'login exact');
        continue;
      }
      // HIGH — « prénom nom » ou « nom prénom » exact sur un champ
      if (fullA && (mi.fields.includes(fullA) || mi.fields.includes(fullB))) {
        consider(mi, 'high', 'prénom + nom');
        continue;
      }
      // MEDIUM — prénom ET nom présents comme tokens
      if (first && last && fTok.every((t) => mi.tokens.has(t)) && lTok.every((t) => mi.tokens.has(t))) {
        consider(mi, 'medium', 'prénom + nom (partiel)');
        continue;
      }
      // LOW — nom seul (≥4) ou prénom seul (≥3)
      if (last.length >= 4 && lTok.every((t) => mi.tokens.has(t))) {
        consider(mi, 'low', 'nom seul');
        continue;
      }
      if (first.length >= 3 && fTok.every((t) => mi.tokens.has(t))) {
        consider(mi, 'low', 'prénom seul');
      }
    }

    results.push({ s, best });
  }

  // Détection d'ambiguïté : un même membre proposé pour plusieurs apprenants
  // → on dé-coche (et on signale) tous les concernés.
  const memberClaims = new Map<string, number>();
  for (const r of results) {
    if (r.best) memberClaims.set(r.best.member.m.id, (memberClaims.get(r.best.member.m.id) ?? 0) + 1);
  }

  const out: MatchSuggestion[] = [];
  for (const { s, best } of results) {
    if (!best) continue;
    const m = best.member.m;
    const ambiguous = (memberClaims.get(m.id) ?? 0) > 1;
    const matchedOn = ambiguous ? `${best.matchedOn} · ambigu` : best.matchedOn;
    out.push({
      login: s.login,
      name: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.login,
      promoName: s.promoName,
      discordId: m.id,
      memberLabel: m.nick || m.globalName || m.username || m.id,
      matchedOn,
      confidence: best.confidence,
      preChecked: best.confidence === 'high' && !ambiguous,
    });
  }

  // Tri : pré-cochés d'abord, puis par confiance, puis par nom.
  out.sort((a, b) => {
    if (a.preChecked !== b.preChecked) return a.preChecked ? -1 : 1;
    if (RANK[a.confidence] !== RANK[b.confidence]) return RANK[b.confidence] - RANK[a.confidence];
    return a.name.localeCompare(b.name);
  });

  return out;
}
