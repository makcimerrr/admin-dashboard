import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import {
  getMilestoneTypes,
  reconcileMilestones,
  upsertMilestoneType,
} from '@/lib/db/services/followUps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/follow-ups/milestone-types — jalons de suivi configurés.
 * Les périodes (3M, 6M, 1A…) vivent EN BASE, jamais dans le code.
 */
export const GET = withErrorHandler(
  withAdmin(async () => {
    return apiSuccess({ types: await getMilestoneTypes() });
  }),
);

/**
 * POST /api/follow-ups/milestone-types — crée ou met à jour un jalon.
 * Body : { code, label, offsetMonths, displayOrder?, isActive? }
 *
 * Toute modification relance la réconciliation : les échéances des contrats
 * existants sont recalculées immédiatement (création, décalage ou annulation).
 */
export const POST = withErrorHandler(
  withAdmin(async (req: NextRequest) => {
    const body = (await req.json()) as {
      code?: string;
      label?: string;
      offsetMonths?: number;
      displayOrder?: number;
      isActive?: boolean;
    };

    const code = body.code?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9_]{1,20}$/.test(code)) {
      return apiError('BAD_REQUEST', 'code requis (lettres/chiffres, 20 caractères max)');
    }
    if (!body.label?.trim()) {
      return apiError('BAD_REQUEST', 'label requis');
    }
    const offsetMonths = Number(body.offsetMonths);
    if (!Number.isInteger(offsetMonths) || offsetMonths < 1 || offsetMonths > 120) {
      return apiError('BAD_REQUEST', 'offsetMonths doit être un entier entre 1 et 120');
    }

    const type = await upsertMilestoneType({
      code,
      label: body.label.trim(),
      offsetMonths,
      displayOrder: body.displayOrder ?? offsetMonths,
      isActive: body.isActive ?? true,
    });

    const reconciled = await reconcileMilestones();
    return apiSuccess({ type, reconciled });
  }),
);
