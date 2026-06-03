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

// ─── Palier 2 (token Gitea) — seam ────────────────────────────────────────────

export function isGiteaTokenConfigured(): boolean {
  return Boolean(process.env.GITEA_URL && process.env.GITEA_TOKEN);
}

/**
 * Palier 2 : breakdown langages par repo. Renvoie null tant que le token Gitea
 * n'est pas configuré (l'ingestion reste alors en Palier 1).
 * TODO(palier-2) : implémenter via GET {GITEA_URL}/api/v1/users/{login}/repos
 *   puis /repos/{owner}/{repo}/languages, agréger les octets par langage.
 */
export async function fetchGiteaLanguages(
  _login: string,
): Promise<{ languages: GiteaLanguageBreakdown; reposCount: number } | null> {
  if (!isGiteaTokenConfigured()) return null;
  return null;
}
