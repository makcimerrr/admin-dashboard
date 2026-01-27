import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import {
  getContractsByStudentId,
  getActiveContract,
  createContract,
} from '@/lib/db/services/alternant-contracts';

/**
 * GET /api/alternants/[studentId]/contracts
 * Récupère tous les contrats d'un étudiant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const id = parseInt(studentId, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID étudiant invalide' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    if (activeOnly) {
      const contract = await getActiveContract(id);
      return NextResponse.json({ success: true, contract });
    }

    const contracts = await getContractsByStudentId(id);
    return NextResponse.json({ success: true, contracts });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des contrats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alternants/[studentId]/contracts
 * Crée un nouveau contrat pour un étudiant
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { studentId } = await params;
    const id = parseInt(studentId, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID étudiant invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      contractType,
      startDate,
      endDate,
      companyName,
      companyAddress,
      companySiret,
      tutorName,
      tutorEmail,
      tutorPhone,
      salary,
      workSchedule,
      notes,
    } = body;

    if (!contractType || !startDate || !endDate || !companyName) {
      return NextResponse.json(
        { success: false, error: 'Champs requis manquants (contractType, startDate, endDate, companyName)' },
        { status: 400 }
      );
    }

    const contract = await createContract({
      studentId: id,
      contractType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyName,
      companyAddress,
      companySiret,
      tutorName,
      tutorEmail,
      tutorPhone,
      salary,
      workSchedule,
      notes,
    });

    return NextResponse.json({
      success: true,
      contract,
      createdBy: user.displayName || user.primaryEmail,
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du contrat' },
      { status: 500 }
    );
  }
}
