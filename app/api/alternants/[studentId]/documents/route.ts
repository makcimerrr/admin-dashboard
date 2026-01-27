import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import {
  getDocumentsByStudentId,
  createDocument,
} from '@/lib/db/services/alternant-contracts';

/**
 * GET /api/alternants/[studentId]/documents
 * Récupère tous les documents d'un étudiant alternant
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

    const documents = await getDocumentsByStudentId(id);
    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alternants/[studentId]/documents
 * Ajoute un nouveau document pour un étudiant alternant
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
      contractId,
      documentType,
      title,
      description,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      validUntil,
    } = body;

    if (!documentType || !title) {
      return NextResponse.json(
        { success: false, error: 'Champs requis manquants (documentType, title)' },
        { status: 400 }
      );
    }

    const document = await createDocument({
      studentId: id,
      contractId: contractId || null,
      documentType,
      title,
      description,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      validUntil: validUntil ? new Date(validUntil) : null,
    });

    return NextResponse.json({
      success: true,
      document,
      createdBy: user.displayName || user.primaryEmail,
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du document' },
      { status: 500 }
    );
  }
}
