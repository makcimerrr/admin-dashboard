import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import {
  createFollowUpReport,
  getMilestoneById,
  listFollowUpReports,
} from '@/lib/db/services/followUps';
import { FOLLOW_UP_MODES } from '@/lib/db/schema/followUps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/follow-ups/reports — historique des comptes rendus.
 * Query : studentId=42 | company=Acme (recherche par apprenant ou entreprise).
 */
export const GET = withErrorHandler(
  withAdmin(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const company = searchParams.get('company');

    const limit = Number(searchParams.get('limit') ?? 1000);
    const reports = await listFollowUpReports({
      ...(studentId ? { studentId: Number(studentId) } : {}),
      ...(company ? { company } : {}),
      limit: Number.isFinite(limit) ? Math.min(limit, 5000) : 1000,
    });
    return apiSuccess({ reports, count: reports.length });
  }),
);

/**
 * POST /api/follow-ups/reports — saisie d'un compte rendu de suivi.
 *
 * Body : { milestoneId?, studentId?, contractId?, performedAt, content,
 *          mode?, vigilancePoints?, documentId? }
 *
 * Avec `milestoneId`, l'apprenant / le contrat / l'entreprise sont déduits de
 * l'échéance et celle-ci passe en `realise`. Sans, on accepte un CR « hors
 * échéance » à condition d'avoir `studentId`.
 */
export const POST = withErrorHandler(
  withAdmin(async (req: NextRequest, { user }) => {
    const body = (await req.json()) as {
      milestoneId?: number;
      studentId?: number;
      contractId?: number;
      performedAt?: string;
      content?: string;
      mode?: string;
      vigilancePoints?: string;
      documentId?: number;
      author?: string;
    };

    if (!body.content?.trim()) {
      return apiError('BAD_REQUEST', 'Le contenu du compte rendu est requis');
    }
    if (body.mode && !(FOLLOW_UP_MODES as readonly string[]).includes(body.mode)) {
      return apiError('BAD_REQUEST', `mode invalide (${FOLLOW_UP_MODES.join(', ')})`);
    }

    let studentId = body.studentId;
    let contractId = body.contractId;
    let companyName: string | undefined;
    let tutorName: string | null | undefined;

    if (body.milestoneId) {
      const milestone = await getMilestoneById(body.milestoneId);
      if (!milestone) return apiError('NOT_FOUND', 'Échéance introuvable');
      studentId = milestone.studentId;
      contractId = milestone.contractId;
      companyName = milestone.companyName;
      tutorName = milestone.tutorName;
    }

    if (!studentId) {
      return apiError('BAD_REQUEST', 'studentId ou milestoneId est requis');
    }

    const report = await createFollowUpReport({
      milestoneId: body.milestoneId ?? null,
      studentId,
      contractId: contractId ?? null,
      companyName: companyName ?? null,
      tutorName: tutorName ?? null,
      performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
      author: body.author?.trim() || user.name || user.email,
      mode: body.mode ?? null,
      content: body.content.trim(),
      vigilancePoints: body.vigilancePoints?.trim() || null,
      documentId: body.documentId ?? null,
    });

    return apiSuccess({ report }, { status: 201 });
  }),
);
