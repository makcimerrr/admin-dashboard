import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { audits } from '@/lib/db/schema/audits';
import { eq } from 'drizzle-orm';

/**
 * PATCH /api/code-reviews/audit/[auditId]/priority
 * Met a jour la priorite d'un audit (override manuel)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;
    const id = parseInt(auditId, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID audit invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { priority } = body;

    if (!priority || !['urgent', 'warning', 'normal'].includes(priority)) {
      return NextResponse.json(
        { success: false, error: 'Priorite invalide' },
        { status: 400 }
      );
    }

    await db
      .update(audits)
      .set({
        priority,
        updatedAt: new Date()
      })
      .where(eq(audits.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating audit priority:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise a jour' },
      { status: 500 }
    );
  }
}
