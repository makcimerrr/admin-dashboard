'use client';

/**
 * Cache client léger « stale-while-revalidate » (sans dépendance externe).
 *
 * Objectif (refonte front, levier #1) : éviter de re-fetcher les MÊMES endpoints
 * à chaque montage/navigation. On garde les appels `fetch` existants (mêmes URLs,
 * mêmes endpoints) — on ajoute juste un cache partagé + déduplication des
 * requêtes en vol + revalidation en arrière-plan.
 *
 * Usage :
 *   const { data, error, isLoading, mutate } = useData<MyType>('/api/students');
 *   // data = dernière valeur connue (instantanée si déjà en cache) ; revalidé en fond.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type Entry<T> = { data?: T; error?: unknown; ts: number; promise?: Promise<T> };

const cache = new Map<string, Entry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

/** Fetcher par défaut : GET JSON, throw si !ok. */
export async function defaultFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status}) on ${url}`);
  return res.json() as Promise<T>;
}

function revalidate<T>(key: string, fetcher: (k: string) => Promise<T>): Promise<T> {
  const existing = cache.get(key) as Entry<T> | undefined;
  if (existing?.promise) return existing.promise; // déduplication des requêtes en vol
  const p = fetcher(key)
    .then((data) => {
      cache.set(key, { data, ts: Date.now() });
      notify(key);
      return data;
    })
    .catch((error) => {
      const prev = (cache.get(key) as Entry<T> | undefined) ?? { ts: 0 };
      cache.set(key, { ...prev, error, promise: undefined });
      notify(key);
      throw error;
    });
  cache.set(key, { ...(existing ?? { ts: 0 }), promise: p });
  return p;
}

/** Invalide + revalide une clé depuis n'importe où (ex. après une mutation). */
export function mutateKey<T = unknown>(key: string, fetcher: (k: string) => Promise<T> = defaultFetcher) {
  return revalidate(key, fetcher);
}

export interface UseDataOptions<T> {
  fetcher?: (key: string) => Promise<T>;
  /** Fenêtre (ms) pendant laquelle une valeur en cache est considérée fraîche (pas de refetch). Défaut 30s. */
  dedupeMs?: number;
  /** Désactive le fetch (ex. clé pas encore prête). */
  enabled?: boolean;
}

export function useData<T = unknown>(key: string | null, options: UseDataOptions<T> = {}) {
  const { fetcher = defaultFetcher as (k: string) => Promise<T>, dedupeMs = 30_000, enabled = true } = options;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!key) return;
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(rerender);
    return () => {
      set?.delete(rerender);
    };
  }, [key, rerender]);

  useEffect(() => {
    if (!key || !enabled) return;
    const e = cache.get(key) as Entry<T> | undefined;
    const fresh = e && !e.error && Date.now() - e.ts < dedupeMs;
    if (!e || !fresh) {
      revalidate<T>(key, (k) => fetcherRef.current(k)).catch(() => {});
    }
  }, [key, enabled, dedupeMs]);

  const entry = key ? (cache.get(key) as Entry<T> | undefined) : undefined;
  const mutate = useCallback(() => {
    if (key) return revalidate<T>(key, (k) => fetcherRef.current(k));
  }, [key]);

  return {
    data: entry?.data,
    error: entry?.error,
    isLoading: enabled && !!key && entry?.data === undefined && entry?.error === undefined,
    isValidating: entry?.promise !== undefined,
    mutate,
  };
}
