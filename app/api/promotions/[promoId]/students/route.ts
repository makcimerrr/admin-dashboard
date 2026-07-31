import { NextResponse } from 'next/server';
import { withAdmin, withErrorHandler } from '@/lib/api';
import { fetchPromotionProgressions } from '@/lib/services/zone01';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/promotions/[promoId]/students — proxy serveur des progressions Zone01.
 *
 * L'API Zone01 est auto-hébergée en INTERNE sur le VPS (http://zone01-api:8000,
 * non joignable depuis le navigateur). Le bouton « Mettre à jour » de /students
 * appelait l'API en direct côté client → CORS + URL morte. On passe désormais
 * par cette route same-origin qui relaie depuis le serveur (ZONE01_API_BASE).
 * Renvoie la forme brute `{ progress: [...] }` (drop-in pour le client).
 */
export const GET = withErrorHandler(
  withAdmin<{ params: Promise<{ promoId: string }> }>(async (_req, ctx) => {
    const { promoId } = await ctx.params;
    const progress = await fetchPromotionProgressions(promoId);
    return NextResponse.json({ progress });
  }),
);
