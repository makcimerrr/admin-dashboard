import { NextRequest, NextResponse } from 'next/server';
import { getAuditsByStudentLogin } from '@/lib/db/services/audits';
import { db } from '@/lib/db/config';
import { students } from '@/lib/db/schema/students';
import { eq } from 'drizzle-orm';

/**
 * GET /api/student/[id]/audits
 *
 * Récupère tous les audits d'un étudiant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentIdNum = parseInt(id, 10);

    if (isNaN(studentIdNum)) {
      return NextResponse.json(
        { error: 'ID étudiant invalide' },
        { status: 400 }
      );
    }

    // Récupérer le login de l'étudiant
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentIdNum)
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Étudiant introuvable' },
        { status: 404 }
      );
    }

    // Récupérer tous les audits de cet étudiant
    const audits = await getAuditsByStudentLogin(student.login);

    return NextResponse.json({
      success: true,
      audits,
      studentLogin: student.login
    });
  } catch (error) {
    console.error('Error fetching student audits:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des audits' },
      { status: 500 }
    );
  }
}
