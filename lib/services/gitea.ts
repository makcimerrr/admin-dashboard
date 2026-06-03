/**
 * Chantier A — Client Gitea & calcul de l'activité (appétence).
 *
 * Palier 1 (dispo) : passe par l'API deno Zone01 (`gitea-info/{login}`) qui
 *   renvoie une heatmap de contributions + des infos user. On en dérive des
 *   métriques d'activité et un score d'engagement.
 * Palier 2 (à débloquer) : si GITEA_URL + GITEA_TOKEN sont configurés, on
 *   pourra lister les repos et leurs langages pour un vrai breakdown. Stub
 *   ci-dessous, renvoie null tant que non configuré.
 */

import type { AffinityLabel, GiteaLanguageBreakdown } from '@/lib/db/schema/studentSkills';

const DENO_API = 'https://api-zone01-rouen.deno.dev/api/v1';
// Côté serveur on préfère ACCESS_TOKEN ; fallback sur la variable publique
// utilisée par le front si besoin.
const ACCESS_TOKEN = process.env.ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_ACCESS_TOKEN;

// L'API deno proxifie déjà l'API Gitea de l'org en utilisant CE token : on peut
// donc l'appeler directement pour les repos/langages, sans secret dédié. Le
// token Gitea optionnel (GITEA_TOKEN) reste prioritaire s'il est fourni.
const GITEA_API_URL = process.env.GITEA_API_URL ?? 'https://zone01normandie.org/git/api/v1';
const GITEA_TOKEN = process.env.GITEA_TOKEN ?? ACCESS_TOKEN;

const DAY = 86_400; // secondes

export interface GiteaHeatmapEntry {
  /** epoch seconds */
  timestamp: number;
  /** nombre de contributions ce jour — le nom du champ varie selon l'API. */
  contributions?: number;
  count?: number;
  value?: number;
}

export interface GiteaInfo {
  heatmap?: GiteaHeatmapEntry[];
  user?: { last_login?: string | number | null };
}

export interface ActivityMetrics {
  totalContributions: number;
  activeDays: number;
  contributions30d: number;
  contributions90d: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActivityAt: Date | null;
  engagementScore: number; // 0–100
  affinityLabel: AffinityLabel;
}

function contribOf(e: GiteaHeatmapEntry): number {
  return e.contributions ?? e.count ?? e.value ?? 0;
}

/** Récupère les infos Gitea d'un étudiant via l'API deno (Palier 1). */
export async function fetchGiteaInfo(login: string, timeoutMs = 8_000): Promise<GiteaInfo | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${DENO_API}/gitea-info/${encodeURIComponent(login)}`, {
      headers: ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as GiteaInfo;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Dérive les métriques d'activité depuis la heatmap. `nowSec` est injectable
 * pour les tests (epoch seconds).
 */
export function computeActivityMetrics(
  info: GiteaInfo | null,
  nowSec: number,
): ActivityMetrics {
  const heatmap = (info?.heatmap ?? []).filter((e) => e && typeof e.timestamp === 'number');

  const empty: ActivityMetrics = {
    totalContributions: 0,
    activeDays: 0,
    contributions30d: 0,
    contributions90d: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastActivityAt: null,
    engagementScore: 0,
    affinityLabel: 'inactif',
  };
  if (heatmap.length === 0) return empty;

  // Normalise par jour (epoch jour → contributions cumulées).
  const byDay = new Map<number, number>();
  for (const e of heatmap) {
    const day = Math.floor(e.timestamp / DAY);
    byDay.set(day, (byDay.get(day) ?? 0) + contribOf(e));
  }

  const days = [...byDay.keys()].sort((a, b) => a - b);
  const today = Math.floor(nowSec / DAY);

  let total = 0;
  let c30 = 0;
  let c90 = 0;
  let activeDays = 0;
  let lastActiveDay = 0;
  for (const [day, count] of byDay) {
    if (count <= 0) continue;
    total += count;
    activeDays += 1;
    if (day > lastActiveDay) lastActiveDay = day;
    if (today - day < 30) c30 += count;
    if (today - day < 90) c90 += count;
  }

  // Streaks (jours consécutifs avec ≥1 contribution).
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of days) {
    if ((byDay.get(day) ?? 0) <= 0) continue;
    if (prev !== null && day === prev + 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = day;
  }
  // Streak courant : remonte depuis aujourd'hui (tolère "hier" si pas encore actif aujourd'hui).
  let current = 0;
  let cursor = byDay.get(today) && byDay.get(today)! > 0 ? today : today - 1;
  while (byDay.get(cursor) && byDay.get(cursor)! > 0) {
    current += 1;
    cursor -= 1;
  }

  // Score d'engagement 0–100 : pondère activité récente, régularité, récence.
  const recency = today - lastActiveDay; // jours depuis dernière activité
  const recencyScore = recency <= 2 ? 40 : recency <= 7 ? 28 : recency <= 30 ? 15 : recency <= 90 ? 5 : 0;
  const volumeScore = Math.min(35, Math.round(c30 * 0.7)); // ~50 contrib/30j → plafond
  const regularityScore = Math.min(25, Math.round((c90 > 0 ? activeDays : 0) * 0.4));
  const engagementScore = Math.max(0, Math.min(100, recencyScore + volumeScore + regularityScore));

  const affinityLabel: AffinityLabel =
    engagementScore >= 75 ? 'tres_actif'
    : engagementScore >= 50 ? 'actif'
    : engagementScore >= 25 ? 'modere'
    : engagementScore > 0 ? 'faible'
    : 'inactif';

  return {
    totalContributions: total,
    activeDays,
    contributions30d: c30,
    contributions90d: c90,
    currentStreakDays: current,
    longestStreakDays: longest,
    lastActivityAt: lastActiveDay > 0 ? new Date(lastActiveDay * DAY * 1000) : null,
    engagementScore,
    affinityLabel,
  };
}

// ─── Palier 2 — breakdown langages via l'API Gitea ────────────────────────────

export function isGiteaTokenConfigured(): boolean {
  return Boolean(GITEA_TOKEN);
}

interface GiteaRepo {
  name: string;
  owner?: { login?: string };
  empty?: boolean;
  fork?: boolean;
}

const REPO_PAGE_SIZE = 50;
const MAX_REPOS = 80; // garde-fou : on ne va pas chercher au-delà
const LANG_CONCURRENCY = 5;

async function giteaFetch(path: string, timeoutMs = 8_000): Promise<Response | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${GITEA_API_URL}${path}`, {
      headers: { Authorization: `Bearer ${GITEA_TOKEN}` },
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Palier 2 : agrège les langages (octets) sur les repos non vides / non forkés
 * d'un étudiant. Réutilise le token Zone01 existant (l'API Gitea de l'org
 * l'accepte). Renvoie null si aucun token n'est disponible.
 */
export async function fetchGiteaLanguages(
  login: string,
): Promise<{ languages: GiteaLanguageBreakdown; reposCount: number } | null> {
  if (!isGiteaTokenConfigured()) return null;

  // 1. Lister les repos (paginé, borné).
  const repos: GiteaRepo[] = [];
  for (let page = 1; repos.length < MAX_REPOS; page++) {
    const res = await giteaFetch(`/users/${encodeURIComponent(login)}/repos?limit=${REPO_PAGE_SIZE}&page=${page}`);
    if (!res || !res.ok) break;
    const batch = (await res.json()) as GiteaRepo[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < REPO_PAGE_SIZE) break;
  }

  const codeRepos = repos.filter((r) => !r.empty && !r.fork && r.owner?.login);
  if (codeRepos.length === 0) return { languages: {}, reposCount: 0 };

  // 2. Agréger les langages (octets) par lots concurrents.
  const languages: GiteaLanguageBreakdown = {};
  for (let i = 0; i < codeRepos.length; i += LANG_CONCURRENCY) {
    const chunk = codeRepos.slice(i, i + LANG_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (repo) => {
        const res = await giteaFetch(`/repos/${repo.owner!.login}/${encodeURIComponent(repo.name)}/languages`);
        if (!res || !res.ok) return null;
        return (await res.json()) as Record<string, number>;
      }),
    );
    for (const langMap of results) {
      if (!langMap) continue;
      for (const [lang, bytes] of Object.entries(langMap)) {
        languages[lang] = (languages[lang] ?? 0) + (Number(bytes) || 0);
      }
    }
  }

  return { languages, reposCount: codeRepos.length };
}

/** Langages à ignorer dans la dérivation de skills (config/markup/bruit). */
const NON_SKILL_LANGUAGES = new Set([
  'Makefile', 'Dockerfile', 'Shell', 'HTML', 'CSS', 'Roff', 'Batchfile',
  'Procfile', 'Text', 'JSON', 'YAML', 'TOML', 'Markdown',
]);

export interface DerivedSkill {
  category: string;
  name: string;
  level: number;
  affinity: number;
  evidence: string[];
  source: string;
}

/**
 * Dérive des skills "langage" déterministes depuis le breakdown Gitea.
 *  - level  : part du langage dans le code de l'étudiant (0–100).
 *  - affinity : engagement global pondéré par la part du langage.
 * Pas d'appel IA — explicable et gratuit. Une synthèse Claude pourra enrichir
 * plus tard (narratif, frameworks, domaines).
 */
export function deriveLanguageSkills(
  languages: GiteaLanguageBreakdown | null,
  engagementScore: number,
): DerivedSkill[] {
  if (!languages) return [];
  const entries = Object.entries(languages).filter(
    ([lang, bytes]) => bytes > 0 && !NON_SKILL_LANGUAGES.has(lang),
  );
  const total = entries.reduce((acc, [, b]) => acc + b, 0);
  if (total === 0) return [];

  return entries
    .map(([lang, bytes]) => {
      const share = bytes / total;
      const level = Math.max(1, Math.min(100, Math.round(share * 100)));
      const affinity = Math.round(engagementScore * (0.5 + 0.5 * share));
      return {
        category: 'language',
        name: lang,
        level,
        affinity,
        evidence: [`${bytes.toLocaleString('fr-FR')} octets sur Gitea`],
        source: 'gitea',
      };
    })
    // Filtre le bruit : ≥3 % du code, ou ≥2 ko, ou très peu de code au total.
    .filter((s) => {
      const bytes = languages[s.name] ?? 0;
      return s.level >= 3 || bytes >= 2048 || total < 4096;
    })
    .sort((a, b) => b.level - a.level);
}
