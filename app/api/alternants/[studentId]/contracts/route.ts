import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/with-auth';
import {
  getContractsByStudentId,
  getActiveContract,
  createContract,
} from '@/lib/db/services/alternant-contracts';
import { reconcileMilestones } from '@/lib/db/services/followUps';

/**
 * GET /api/alternants/[studentId]/contracts
 * Récupère tous les contrats d'un étudiant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    // Données sensibles (coordonnées des tuteurs entreprise) : la page est
    // admin-only, l'API doit l'être aussi — une route se garde elle-même.
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

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
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const user = auth;

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

    // Les échéances de suivi en entreprise (3 mois, 6 mois, 1 an…) se posent
    // automatiquement dès la création du contrat. Un échec ici ne doit pas
    // invalider la création elle-même.
    const milestones = await reconcileMilestones({ contractIds: [contract.id] }).catch(
      (e) => {
        console.error('Réconciliation des échéances échouée :', e);
        return null;
      },
    );

    return NextResponse.json({
      success: true,
      contract,
      milestones,
      createdBy: user.name || user.email,
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du contrat' },
      { status: 500 }
    );
  }
}
