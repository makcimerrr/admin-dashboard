/**
 * Base URL de l'API Zone01 (proxy Deno).
 *
 * Auto-hébergée sur le VPS depuis le sunset de Deno Deploy Classic (2026-07-20).
 * En prod : `http://zone01-api:8000/api/v1` (réseau Docker interne `nginx-network`,
 * partagé avec le dashboard), injectée via `ZONE01_API_BASE` dans `.env.production`.
 *
 * Le fallback est l'ancienne URL publique (désormais MORTE) : il ne sert qu'en
 * l'absence de la variable d'env (ex. dev local sans accès au réseau VPS).
 */
export const ZONE01_API_BASE =
  process.env.ZONE01_API_BASE ?? 'https://api-zone01-rouen.deno.dev/api/v1';
