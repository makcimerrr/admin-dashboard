/**
 * Resilient HTTP fetch wrapper.
 *
 * Adds:
 *  - request timeout via AbortController (default 8s)
 *  - automatic retry on transient errors (network, 502/503/504, timeout)
 *  - structured logging on failure
 *
 * Use for outbound calls to third-party APIs (Discord, Gitea, Mistral, etc.).
 * Don't use for our own /api/* routes — those should rely on Next.js caching.
 */

export interface FetchWithRetryOptions extends RequestInit {
  /** Total timeout in ms before aborting (default 8000) */
  timeoutMs?: number;
  /** Number of retry attempts on transient failure (default 1, so total = 2 tries) */
  retries?: number;
  /** Delay between retries in ms (default 500). Doubles on each attempt. */
  retryDelayMs?: number;
  /** Tag used in logs to identify the integration (e.g. 'discord', 'gitea') */
  tag?: string;
}

const TRANSIENT_STATUS = new Set([408, 425, 429, 502, 503, 504]);

function isTransientError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  // Node 'fetch failed' network errors
  if (err instanceof TypeError) return true;
  return false;
}

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(input: string, init: FetchWithRetryOptions = {}): Promise<Response> {
  const {
    timeoutMs = 8_000,
    retries = 1,
    retryDelayMs = 500,
    tag = 'http',
    ...fetchInit
  } = init;

  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(input, { ...fetchInit, signal: controller.signal });
      clearTimeout(timer);

      if (!TRANSIENT_STATUS.has(res.status)) return res;
      lastResponse = res;
    } catch (err) {
      clearTimeout(timer);
      if (!isTransientError(err) || attempt === retries) {
        console.error(`[http:${tag}] non-retryable error for ${input}:`, err);
        throw err;
      }
      lastError = err;
    }

    if (attempt < retries) {
      const delay = retryDelayMs * Math.pow(2, attempt);
      console.warn(`[http:${tag}] retry ${attempt + 1}/${retries} for ${input} in ${delay}ms`);
      await sleep(delay);
    }
  }

  if (lastResponse) {
    console.error(`[http:${tag}] exhausted retries with status ${lastResponse.status} for ${input}`);
    return lastResponse;
  }
  throw lastError ?? new Error(`fetchWithRetry exhausted for ${input}`);
}

/**
 * Convenience wrapper that throws on non-2xx and parses JSON.
 */
export async function fetchJson<T = unknown>(input: string, init: FetchWithRetryOptions = {}): Promise<T> {
  const res = await fetchWithRetry(input, init);
  if (!res.ok) {
    throw new Error(`[http:${init.tag ?? 'http'}] ${res.status} ${res.statusText} on ${input}`);
  }
  return res.json() as Promise<T>;
}
