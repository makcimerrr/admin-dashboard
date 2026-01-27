import { pgTable, text, timestamp, serial, integer, boolean } from 'drizzle-orm/pg-core';
import { students } from './students';

// Types de contrats alternance
export const CONTRACT_TYPES = [
  'apprentissage',
  'professionnalisation',
  'stage_alterne',
  'autre'
] as const;

export type ContractType = typeof CONTRACT_TYPES[number];

// Types de documents
export const DOCUMENT_TYPES = [
  'contrat',
  'convention',
  'attestation',
  'compte_rendu',
  'evaluation',
  'autre'
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

// Table des contrats d'alternance
export const alternantContracts = pgTable('alternant_contracts', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  contractType: text('contract_type').notNull(), // apprentissage, professionnalisation, etc.
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  companyName: text('company_name').notNull(),
  companyAddress: text('company_address'),
  companySiret: text('company_siret'),
  tutorName: text('tutor_name'),
  tutorEmail: text('tutor_email'),
  tutorPhone: text('tutor_phone'),
  salary: text('salary'), // Stocké en texte pour flexibilité
  workSchedule: text('work_schedule'), // Ex: "3 jours entreprise / 2 jours formation"
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Table des documents liés aux alternants
export const alternantDocuments = pgTable('alternant_documents', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  contractId: integer('contract_id')
    .references(() => alternantContracts.id, { onDelete: 'set null' }),
  documentType: text('document_type').notNull(), // contrat, convention, compte_rendu, etc.
  title: text('title').notNull(),
  description: text('description'),
  fileName: text('file_name'),
  fileUrl: text('file_url'), // URL vers le fichier stocké (S3, etc.)
  fileSize: integer('file_size'), // Taille en bytes
  mimeType: text('mime_type'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  validUntil: timestamp('valid_until'), // Date d'expiration si applicable
  isArchived: boolean('is_archived').default(false)
});

// Table pour les comptes rendus d'assiduité
export const alternantAttendanceReports = pgTable('alternant_attendance_reports', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  contractId: integer('contract_id')
    .references(() => alternantContracts.id, { onDelete: 'set null' }),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  daysPresent: integer('days_present').default(0),
  daysAbsent: integer('days_absent').default(0),
  daysJustified: integer('days_justified').default(0),
  comments: text('comments'),
  validatedBy: text('validated_by'),
  validatedAt: timestamp('validated_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Types exportés
export type AlternantContract = typeof alternantContracts.$inferSelect;
export type NewAlternantContract = typeof alternantContracts.$inferInsert;

export type AlternantDocument = typeof alternantDocuments.$inferSelect;
export type NewAlternantDocument = typeof alternantDocuments.$inferInsert;

export type AlternantAttendanceReport = typeof alternantAttendanceReports.$inferSelect;
export type NewAlternantAttendanceReport = typeof alternantAttendanceReports.$inferInsert;
