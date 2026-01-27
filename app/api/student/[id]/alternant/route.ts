import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students } from '@/lib/db/schema/students';
import { eq } from 'drizzle-orm';

/**
 * POST /api/student/[id]/alternant
 * Marque un etudiant comme alternant
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);

    if (isNaN(studentId)) {
      return NextResponse.json(
        { success: false, error: 'ID etudiant invalide' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { companyName, companyContact, companyEmail, companyPhone, notes, startDate, endDate } = body;

    await db
      .update(students)
      .set({
        isAlternant: true,
        alternantStartDate: startDate ? new Date(startDate) : new Date(),
        alternantEndDate: endDate ? new Date(endDate) : null,
        companyName: companyName || null,
        companyContact: companyContact || null,
        companyEmail: companyEmail || null,
        companyPhone: companyPhone || null,
        alternantNotes: notes || null
      })
      .where(eq(students.id, studentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting alternant status:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise a jour' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student/[id]/alternant
 * Retire le statut alternant d'un etudiant
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);

    if (isNaN(studentId)) {
      return NextResponse.json(
        { success: false, error: 'ID etudiant invalide' },
        { status: 400 }
      );
    }

    await db
      .update(students)
      .set({
        isAlternant: false,
        alternantStartDate: null,
        alternantEndDate: null,
        companyName: null,
        companyContact: null,
        companyEmail: null,
        companyPhone: null,
        alternantNotes: null
      })
      .where(eq(students.id, studentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing alternant status:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise a jour' },
      { status: 500 }
    );
  }
}
