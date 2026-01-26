import { db } from '../config';
import {
  alternantContracts,
  alternantDocuments,
  alternantAttendanceReports,
  AlternantContract,
  NewAlternantContract,
  AlternantDocument,
  NewAlternantDocument,
  AlternantAttendanceReport,
  NewAlternantAttendanceReport
} from '../schema/alternants';
import { students } from '../schema/students';
import { eq, and, desc, asc } from 'drizzle-orm';

// ============== CONTRATS ==============

/**
 * Récupère tous les contrats d'un étudiant
 */
export async function getContractsByStudentId(studentId: number): Promise<AlternantContract[]> {
  return await db
    .select()
    .from(alternantContracts)
    .where(eq(alternantContracts.studentId, studentId))
    .orderBy(desc(alternantContracts.startDate))
    .execute();
}

/**
 * Récupère le contrat actif d'un étudiant
 */
export async function getActiveContract(studentId: number): Promise<AlternantContract | null> {
  const result = await db
    .select()
    .from(alternantContracts)
    .where(and(
      eq(alternantContracts.studentId, studentId),
      eq(alternantContracts.isActive, true)
    ))
    .limit(1)
    .execute();

  return result[0] || null;
}

/**
 * Crée un nouveau contrat
 */
export async function createContract(data: NewAlternantContract): Promise<AlternantContract> {
  // Désactiver les anciens contrats actifs
  await db
    .update(alternantContracts)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(alternantContracts.studentId, data.studentId),
      eq(alternantContracts.isActive, true)
    ))
    .execute();

  const result = await db
    .insert(alternantContracts)
    .values(data)
    .returning()
    .execute();

  // Mettre à jour le statut alternant de l'étudiant
  await db
    .update(students)
    .set({
      isAlternant: true,
      alternantStartDate: data.startDate,
      alternantEndDate: data.endDate,
      companyName: data.companyName,
      companyContact: data.tutorName,
      companyEmail: data.tutorEmail,
      companyPhone: data.tutorPhone
    })
    .where(eq(students.id, data.studentId))
    .execute();

  return result[0];
}

/**
 * Met à jour un contrat
 */
export async function updateContract(
  contractId: number,
  data: Partial<NewAlternantContract>
): Promise<AlternantContract | null> {
  const result = await db
    .update(alternantContracts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(alternantContracts.id, contractId))
    .returning()
    .execute();

  return result[0] || null;
}

/**
 * Supprime un contrat
 */
export async function deleteContract(contractId: number): Promise<boolean> {
  const result = await db
    .delete(alternantContracts)
    .where(eq(alternantContracts.id, contractId))
    .returning()
    .execute();

  return result.length > 0;
}

// ============== DOCUMENTS ==============

/**
 * Récupère tous les documents d'un étudiant
 */
export async function getDocumentsByStudentId(studentId: number): Promise<AlternantDocument[]> {
  return await db
    .select()
    .from(alternantDocuments)
    .where(eq(alternantDocuments.studentId, studentId))
    .orderBy(desc(alternantDocuments.uploadedAt))
    .execute();
}

/**
 * Récupère les documents d'un contrat spécifique
 */
export async function getDocumentsByContractId(contractId: number): Promise<AlternantDocument[]> {
  return await db
    .select()
    .from(alternantDocuments)
    .where(eq(alternantDocuments.contractId, contractId))
    .orderBy(desc(alternantDocuments.uploadedAt))
    .execute();
}

/**
 * Crée un nouveau document
 */
export async function createDocument(data: NewAlternantDocument): Promise<AlternantDocument> {
  const result = await db
    .insert(alternantDocuments)
    .values(data)
    .returning()
    .execute();

  return result[0];
}

/**
 * Met à jour un document
 */
export async function updateDocument(
  documentId: number,
  data: Partial<NewAlternantDocument>
): Promise<AlternantDocument | null> {
  const result = await db
    .update(alternantDocuments)
    .set(data)
    .where(eq(alternantDocuments.id, documentId))
    .returning()
    .execute();

  return result[0] || null;
}

/**
 * Supprime un document
 */
export async function deleteDocument(documentId: number): Promise<boolean> {
  const result = await db
    .delete(alternantDocuments)
    .where(eq(alternantDocuments.id, documentId))
    .returning()
    .execute();

  return result.length > 0;
}

// ============== RAPPORTS D'ASSIDUITE ==============

/**
 * Récupère les rapports d'assiduité d'un étudiant
 */
export async function getAttendanceReportsByStudentId(
  studentId: number
): Promise<AlternantAttendanceReport[]> {
  return await db
    .select()
    .from(alternantAttendanceReports)
    .where(eq(alternantAttendanceReports.studentId, studentId))
    .orderBy(desc(alternantAttendanceReports.periodStart))
    .execute();
}

/**
 * Crée un nouveau rapport d'assiduité
 */
export async function createAttendanceReport(
  data: NewAlternantAttendanceReport
): Promise<AlternantAttendanceReport> {
  const result = await db
    .insert(alternantAttendanceReports)
    .values(data)
    .returning()
    .execute();

  return result[0];
}

/**
 * Met à jour un rapport d'assiduité
 */
export async function updateAttendanceReport(
  reportId: number,
  data: Partial<NewAlternantAttendanceReport>
): Promise<AlternantAttendanceReport | null> {
  const result = await db
    .update(alternantAttendanceReports)
    .set(data)
    .where(eq(alternantAttendanceReports.id, reportId))
    .returning()
    .execute();

  return result[0] || null;
}

/**
 * Supprime un rapport d'assiduité
 */
export async function deleteAttendanceReport(reportId: number): Promise<boolean> {
  const result = await db
    .delete(alternantAttendanceReports)
    .where(eq(alternantAttendanceReports.id, reportId))
    .returning()
    .execute();

  return result.length > 0;
}
