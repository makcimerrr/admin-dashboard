// Types & constantes partagés du module Alternants.
// (Extraits de page.tsx : un fichier "page" Next.js ne peut pas exporter
// d'autres choses que le composant + la config de route.)

export interface Alternant {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  promoName: string;
  isAlternant: boolean;
  alternantStartDate: string | null;
  alternantEndDate: string | null;
  companyName: string | null;
  companyContact: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  alternantNotes: string | null;
}

export interface AlternantStats {
  total: number;
  byPromo: Record<string, number>;
  byCompany: Record<string, number>;
  activeContracts: number;
  endingSoon: number;
}

export interface Contract {
  id: number;
  studentId: number;
  contractType: string;
  startDate: string;
  endDate: string;
  companyName: string;
  companyAddress: string | null;
  companySiret: string | null;
  tutorName: string | null;
  tutorEmail: string | null;
  tutorPhone: string | null;
  salary: string | null;
  workSchedule: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface Document {
  id: number;
  studentId: number;
  contractId: number | null;
  documentType: string;
  title: string;
  description: string | null;
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string;
  validUntil: string | null;
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  apprentissage: "Contrat d'apprentissage",
  professionnalisation: "Contrat de professionnalisation",
  stage_alterne: "Stage alterné",
  autre: "Autre",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contrat: "Contrat",
  convention: "Convention",
  attestation: "Attestation",
  compte_rendu: "Compte rendu",
  evaluation: "Évaluation",
  autre: "Autre",
};

// ─── Suivi en entreprise ─────────────────────────────────────────────────────

export interface FollowUpMilestone {
  id: number;
  contractId: number;
  studentId: number;
  typeCode: string;
  typeLabel: string;
  dueDate: string;
  status: MilestoneStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  calendarEventId: string | null;
  notes: string | null;
  login: string;
  firstName: string;
  lastName: string;
  promoName: string;
  contractType: string;
  contractStart: string;
  contractEnd: string;
  companyName: string;
  tutorName: string | null;
  tutorEmail: string | null;
  tutorPhone: string | null;
  lastReminderAt: string | null;
  reminderCount: number;
  /** Négatif = en retard. */
  daysUntilDue: number;
}

export type MilestoneStatus =
  | 'a_venir'
  | 'relance_envoyee'
  | 'rdv_planifie'
  | 'realise'
  | 'annule';

/** Ordre des colonnes du Kanban. */
export const MILESTONE_STATUS_ORDER: MilestoneStatus[] = [
  'a_venir',
  'relance_envoyee',
  'rdv_planifie',
  'realise',
];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  a_venir: 'À venir',
  relance_envoyee: 'Relance envoyée',
  rdv_planifie: 'RDV planifié',
  realise: 'Réalisé',
  annule: 'Annulé',
};

/** Tons de `PILL` (lib/status-pills) par statut. */
export const MILESTONE_STATUS_TONE: Record<MilestoneStatus, 'blue' | 'amber' | 'violet' | 'emerald' | 'rose'> = {
  a_venir: 'blue',
  relance_envoyee: 'amber',
  rdv_planifie: 'violet',
  realise: 'emerald',
  annule: 'rose',
};

export interface FollowUpStats {
  overdue: number;
  dueSoon: number;
  awaitingReply: number;
  scheduled: number;
  doneThisYear: number;
}

export interface FollowUpReport {
  id: number;
  milestoneId: number | null;
  studentId: number;
  contractId: number | null;
  companyName: string | null;
  tutorName: string | null;
  performedAt: string;
  author: string;
  mode: string | null;
  content: string;
  vigilancePoints: string | null;
  documentId: number | null;
  createdAt: string;
  login: string;
  firstName: string;
  lastName: string;
  promoName: string;
  milestoneLabel: string | null;
}

export interface FollowUpMilestoneType {
  code: string;
  label: string;
  offsetMonths: number;
  displayOrder: number;
  isActive: boolean;
}

export interface FollowUpSettings {
  id: number;
  internalAlertLeadDays: number;
  reminderLeadDays: number;
  secondReminderAfterDays: number;
  bookingUrl: string | null;
  watchedCalendarId: string | null;
  senderName: string | null;
  senderEmail: string | null;
  replyToEmail: string | null;
  emailSubjectTemplate: string | null;
  emailBodyTemplate: string | null;
  autoSendEnabled: boolean;
  teamsAlertsEnabled: boolean;
}

export const FOLLOW_UP_MODE_LABELS: Record<string, string> = {
  visite: 'Visite sur site',
  visio: 'Visioconférence',
  telephone: 'Téléphone',
  autre: 'Autre',
};

/** Enveloppe standard des routes /api/follow-ups (lib/api/response.ts). */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}
