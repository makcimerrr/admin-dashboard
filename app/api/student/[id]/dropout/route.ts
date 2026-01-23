import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, DROPOUT_REASONS } from '@/lib/db/schema/students';
import { eq } from 'drizzle-orm';

// GET - Récupérer le status dropout d'un étudiant
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'ID étudiant invalide' },
        { status: 400 }
      );
    }

    const student = await db
      .select({
        id: students.id,
        login: students.login,
        firstName: students.first_name,
        lastName: students.last_name,
        promoName: students.promoName,
        isDropout: students.isDropout,
        dropoutAt: students.dropoutAt,
        dropoutReason: students.dropoutReason,
        dropoutNotes: students.dropoutNotes,
        previousPromo: students.previousPromo
      })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student || student.length === 0) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...student[0],
      dropoutReasons: DROPOUT_REASONS
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du status dropout:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST - Marquer un étudiant comme dropout
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'ID étudiant invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason, notes } = body;

    // Valider la raison si fournie
    if (reason && !DROPOUT_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: 'Raison de perdition invalide', validReasons: DROPOUT_REASONS },
        { status: 400 }
      );
    }

    // Récupérer la promo actuelle avant de marquer comme dropout
    const currentStudent = await db
      .select({ promoName: students.promoName })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!currentStudent || currentStudent.length === 0) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé' },
        { status: 404 }
      );
    }

    // Marquer l'étudiant comme dropout
    await db
      .update(students)
      .set({
        isDropout: true,
        dropoutAt: new Date(),
        dropoutReason: reason || null,
        dropoutNotes: notes || null,
        previousPromo: currentStudent[0].promoName
      })
      .where(eq(students.id, studentId));

    return NextResponse.json({
      success: true,
      message: 'Étudiant marqué comme en perdition'
    });
  } catch (error) {
    console.error('Erreur lors du marquage comme dropout:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT - Modifier les infos de perdition
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'ID étudiant invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason, notes } = body;

    // Valider la raison si fournie
    if (reason && !DROPOUT_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: 'Raison de perdition invalide', validReasons: DROPOUT_REASONS },
        { status: 400 }
      );
    }

    // Mettre à jour les infos de perdition
    await db
      .update(students)
      .set({
        dropoutReason: reason !== undefined ? reason : undefined,
        dropoutNotes: notes !== undefined ? notes : undefined
      })
      .where(eq(students.id, studentId));

    return NextResponse.json({
      success: true,
      message: 'Informations de perdition mises à jour'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE - Réactiver un étudiant (enlever le status dropout)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'ID étudiant invalide' },
        { status: 400 }
      );
    }

    // Réactiver l'étudiant
    await db
      .update(students)
      .set({
        isDropout: false,
        dropoutAt: null,
        dropoutReason: null,
        dropoutNotes: null
        // previousPromo reste pour l'historique
      })
      .where(eq(students.id, studentId));

    return NextResponse.json({
      success: true,
      message: 'Étudiant réactivé'
    });
  } catch (error) {
    console.error('Erreur lors de la réactivation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
