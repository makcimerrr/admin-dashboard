import type { NextRequest, NextResponse } from 'next/server';
import { apiError } from './response';

type Handler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<NextResponse>;

/**
 * Wraps a route handler with a top-level try/catch that returns a standard
 * 500 error envelope, and logs the original error on the server.
 *
 *     export const GET = withErrorHandler(async (req) => { ... });
 *
 * Composable with withAuth/withAdmin:
 *     export const GET = withErrorHandler(withAuth(async (req, { user }) => { ... }));
 */
export function withErrorHandler<Ctx = unknown>(handler: Handler<Ctx>) {
  return async (req: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error('[API] Unhandled error:', req.url, err);
      const message = err instanceof Error ? err.message : 'Erreur interne';
      return apiError('INTERNAL_ERROR', message);
    }
  };
}
