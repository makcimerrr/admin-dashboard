"use client";

import { useEffect, useState } from "react";
import { useData, mutateKey } from "@/lib/client-cache";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { AddAlternantDialog } from "./_components/add-alternant-dialog";
import { AlternantsStats } from "./_components/alternants-stats";
import { AlternantsTable } from "./_components/alternants-table";
import { AlternantDetailSheet } from "./_components/alternant-detail-sheet";

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

export default function AlternantsPage() {
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get("student");

  const { data: alternantsData, isLoading: alternantsLoading } = useData<{
    success: boolean;
    alternants: Alternant[];
  }>("/api/alternants");
  const { data: statsData } = useData<{ success: boolean; stats: AlternantStats }>(
    "/api/alternants?stats=true"
  );
  const { data: companiesData } = useData<{ success: boolean; companies: string[] }>(
    "/api/alternants?companies=true"
  );
  const { data: promosData } = useData<{ success: boolean; promotions: { key: string; title: string }[] }>(
    "/api/promotions/active"
  );

  const alternants = alternantsData?.success ? alternantsData.alternants : [];
  const stats = statsData?.success ? statsData.stats : null;
  const companies = companiesData?.success ? companiesData.companies : [];
  const promos = promosData?.success ? promosData.promotions : [];
  const loading = alternantsLoading;

  // Revalide les 4 listes après une mutation (ex. ajout d'un alternant).
  const fetchData = () => {
    mutateKey("/api/alternants");
    mutateKey("/api/alternants?stats=true");
    mutateKey("/api/alternants?companies=true");
    mutateKey("/api/promotions/active");
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Detail panel state
  const [selectedAlternant, setSelectedAlternant] = useState<Alternant | null>(null);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);

  // Détail alternant via le cache maison : rouvrir un alternant déjà consulté est instantané.
  // Clés dérivées de l'alternant sélectionné (null => pas de fetch).
  const selectedId = selectedAlternant?.id ?? null;
  const contractsKey = selectedId ? `/api/alternants/${selectedId}/contracts` : null;
  const documentsKey = selectedId ? `/api/alternants/${selectedId}/documents` : null;

  const { data: contractsData, isLoading: contractsLoading } = useData<{
    success: boolean;
    contracts: Contract[];
  }>(contractsKey);
  const { data: documentsData, isLoading: documentsLoading } = useData<{
    success: boolean;
    documents: Document[];
  }>(documentsKey);

  const contracts = contractsData?.success ? contractsData.contracts ?? [] : [];
  const documents = documentsData?.success ? documentsData.documents ?? [] : [];
  const loadingDetail = contractsLoading || documentsLoading;

  // Revalide le détail (contrats + documents) de l'alternant donné.
  const refreshAlternantDetail = (studentId: number) => {
    mutateKey(`/api/alternants/${studentId}/contracts`);
    mutateKey(`/api/alternants/${studentId}/documents`);
  };

  // Si un étudiant est présélectionné dans l'URL, ouvre son détail une fois la liste chargée.
  // (le détail est fetché automatiquement par useData via les clés dérivées)
  useEffect(() => {
    if (preselectedStudentId && alternantsData?.success && !selectedAlternant) {
      const student = alternantsData.alternants.find(
        (a: Alternant) => a.id === parseInt(preselectedStudentId)
      );
      if (student) {
        setSelectedAlternant(student);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedStudentId, alternantsData]);

  const handleSelectAlternant = (alternant: Alternant) => {
    setSelectedAlternant(alternant);
  };

  const handleCloseDetail = () => {
    setSelectedAlternant(null);
  };

  const filteredAlternants = alternants.filter((alt) => {
    const matchesSearch =
      searchQuery === "" ||
      alt.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alt.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alt.login.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alt.companyName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPromo =
      selectedPromo === "all" || alt.promoName === selectedPromo;

    const matchesCompany =
      selectedCompany === "all" || alt.companyName === selectedCompany;

    return matchesSearch && matchesPromo && matchesCompany;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const isEndingSoon = (endDate: string | null) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return end >= now && end <= in30Days;
  };

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={Briefcase}
        title="Alternants"
        description="Gestion et suivi des étudiants en alternance"
      >
        <AddAlternantDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={fetchData}
        />
      </PageHeader>

      {loading ? (
        <PageSkeleton variant="table" />
      ) : (
        <>
          {/* Stats Cards */}
          <AlternantsStats stats={stats} companiesCount={companies.length} />

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, login ou entreprise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedPromo} onValueChange={setSelectedPromo}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Promo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les promos</SelectItem>
                {promos.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Entreprise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les entreprises</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Alternants</CardTitle>
              <CardDescription>
                {filteredAlternants.length} alternant
                {filteredAlternants.length > 1 ? "s" : ""} trouvé
                {filteredAlternants.length > 1 ? "s" : ""} - Cliquez sur une ligne pour voir les détails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlternantsTable
                filteredAlternants={filteredAlternants}
                onSelect={handleSelectAlternant}
                formatDate={formatDate}
                isEndingSoon={isEndingSoon}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Sheet */}
      <AlternantDetailSheet
        selectedAlternant={selectedAlternant}
        contracts={contracts}
        documents={documents}
        loadingDetail={loadingDetail}
        isContractDialogOpen={isContractDialogOpen}
        onContractDialogOpenChange={setIsContractDialogOpen}
        isDocumentDialogOpen={isDocumentDialogOpen}
        onDocumentDialogOpenChange={setIsDocumentDialogOpen}
        onClose={handleCloseDetail}
        onRefreshDetail={refreshAlternantDetail}
        formatDate={formatDate}
      />
    </div>
  );
}
