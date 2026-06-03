/**
 * Client GraphQL Hasura de Zone01 (lecture).
 *
 * Auth : on échange l'ACCESS_TOKEN Zone01 contre un JWT Hasura via
 * `/api/auth/token?token=...`, mis en cache en mémoire (rafraîchi avant
 * expiration). Utilisé pour récupérer les audits (chantier D).
 */

const DOMAIN = process.env.ZONE01_DOMAIN ?? 'https://zone01normandie.org';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_ACCESS_TOKEN;

let cachedJwt: { token: string; expMs: number } | null = null;

function decodeExpMs(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function getJwt(): Promise<string> {
  const now = Date.now();
  if (cachedJwt && cachedJwt.expMs - 60_000 > now) return cachedJwt.token;
  if (!ACCESS_TOKEN) throw new Error('ACCESS_TOKEN manquant pour Zone01 GraphQL.');

  const res = await fetch(`${DOMAIN}/api/auth/token?token=${ACCESS_TOKEN}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Échec récupération JWT Zone01 (${res.status}).`);
  const token = (await res.text()).trim().replace(/^"|"$/g, '');
  cachedJwt = { token, expMs: decodeExpMs(token) || now + 30 * 60_000 };
  return token;
}

export async function zone01Graphql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const jwt = await getJwt();
  const res = await fetch(`${DOMAIN}/api/graphql-engine/v1/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Zone01 GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Zone01 GraphQL: ${json.errors[0]?.message ?? 'erreur'}`);
  return json.data as T;
}

export function isZone01Configured(): boolean {
  return Boolean(ACCESS_TOKEN);
}
