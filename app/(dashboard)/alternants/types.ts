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
