/**
 * Vérification du JWT entrant du Bot Connector (Microsoft Bot Framework).
 *
 * Pas de dépendance externe (jose absent du repo) : on vérifie la signature
 * RS256 en natif via `crypto` + JWKS, et les claims standard (aud/iss/exp).
 *
 * JWKS : https://login.botframework.com/v1/.well-known/keys
 * Émetteur attendu : https://api.botframework.com
 * Audience attendue : BOT_FRAMEWORK_APP_ID
 */

import { createPublicKey, createVerify } from 'crypto';

const JWKS_URL = 'https://login.botframework.com/v1/.well-known/keys';
const EXPECTED_ISSUER = 'https://api.botframework.com';
const CLOCK_SKEW_SEC = 300;

interface Jwk {
  kty: string;
  kid: string;
  n?: string;
  e?: string;
  x5c?: string[];
  use?: string;
}

interface JwksCache {
  keys: Map<string, Jwk>;
  fetchedAt: number;
}

let jwksCache: JwksCache | null = null;
const JWKS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function base64UrlToJson<T>(input: string): T {
  return JSON.parse(base64UrlDecode(input).toString('utf8')) as T;
}

async function getJwks(forceRefresh = false): Promise<Map<string, Jwk>> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(JWKS_URL);
  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { keys?: Jwk[] };
  const keys = new Map<string, Jwk>();
  for (const k of data.keys ?? []) {
    if (k.kid) keys.set(k.kid, k);
  }
  jwksCache = { keys, fetchedAt: now };
  return keys;
}

/** Construit une clé publique PEM depuis un JWK RSA (n/e) ou un cert x5c. */
function jwkToPublicKeyPem(jwk: Jwk): string {
  if (jwk.x5c && jwk.x5c[0]) {
    const cert = jwk.x5c[0].match(/.{1,64}/g)?.join('\n') ?? jwk.x5c[0];
    const pem = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----\n`;
    return createPublicKey(pem).export({ type: 'spki', format: 'pem' }).toString();
  }
  if (jwk.n && jwk.e) {
    const keyObject = createPublicKey({
      key: { kty: 'RSA', n: jwk.n, e: jwk.e } as Record<string, string>,
      format: 'jwk',
    });
    return keyObject.export({ type: 'spki', format: 'pem' }).toString();
  }
  throw new Error('JWK invalide : ni x5c ni (n,e)');
}

export interface VerifiedToken {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

/**
 * Vérifie un JWT Bot Connector. Retourne le token décodé si valide, sinon null.
 * `audience` = BOT_FRAMEWORK_APP_ID attendu dans le claim `aud`.
 */
export async function verifyBotJwt(
  authorizationHeader: string | null,
  audience: string,
): Promise<VerifiedToken | null> {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = base64UrlToJson<Record<string, unknown>>(headerB64);
    payload = base64UrlToJson<Record<string, unknown>>(payloadB64);
  } catch {
    return null;
  }

  if (header.alg !== 'RS256') return null;
  const kid = typeof header.kid === 'string' ? header.kid : null;
  if (!kid) return null;

  // Claims standard.
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === 'number' ? payload.exp : null;
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : null;
  if (exp != null && nowSec > exp + CLOCK_SKEW_SEC) return null;
  if (nbf != null && nowSec < nbf - CLOCK_SKEW_SEC) return null;

  if (payload.iss !== EXPECTED_ISSUER) return null;

  const aud = payload.aud;
  const audOk = Array.isArray(aud) ? aud.includes(audience) : aud === audience;
  if (!audOk) return null;

  // Récupère la clé (refresh une fois si le kid est inconnu — rotation).
  let keys = await getJwks();
  let jwk = keys.get(kid);
  if (!jwk) {
    keys = await getJwks(true);
    jwk = keys.get(kid);
  }
  if (!jwk) return null;

  // Vérifie la signature RS256.
  let pem: string;
  try {
    pem = jwkToPublicKeyPem(jwk);
  } catch {
    return null;
  }

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const ok = verifier.verify(pem, base64UrlDecode(signatureB64));
  if (!ok) return null;

  return { header, payload };
}
