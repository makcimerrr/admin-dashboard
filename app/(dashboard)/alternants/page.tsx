"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  User,
  Users,
  Clock,
  AlertTriangle,
  X,
  ClipboardList,
  Upload,
} from "lucide-react";
import promos from "config/promoConfig.json";

interface Alternant {
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

interface AlternantStats {
  total: number;
  byPromo: Record<string, number>;
  byCompany: Record<string, number>;
  activeContracts: number;
  endingSoon: number;
}

interface Contract {
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

interface Document {
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

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  apprentissage: "Contrat d'apprentissage",
  professionnalisation: "Contrat de professionnalisation",
  stage_alterne: "Stage alterné",
  autre: "Autre",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
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

  const [alternants, setAlternants] = useState<Alternant[]>([]);
  const [stats, setStats] = useState<AlternantStats | null>(null);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Detail panel state
  const [selectedAlternant, setSelectedAlternant] = useState<Alternant | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alternantsRes, statsRes, companiesRes] = await Promise.all([
        fetch("/api/alternants"),
        fetch("/api/alternants?stats=true"),
        fetch("/api/alternants?companies=true"),
      ]);

      const alternantsData = await alternantsRes.json();
      const statsData = await statsRes.json();
      const companiesData = await companiesRes.json();

      if (alternantsData.success) setAlternants(alternantsData.alternants);
      if (statsData.success) setStats(statsData.stats);
      if (companiesData.success) setCompanies(companiesData.companies);

      // If preselected student, open their detail
      if (preselectedStudentId && alternantsData.success) {
        const student = alternantsData.alternants.find(
          (a: Alternant) => a.id === parseInt(preselectedStudentId)
        );
        if (student) {
          setSelectedAlternant(student);
          fetchAlternantDetail(student.id);
        }
      }
    } catch (error) {
      console.error("Error fetching alternants:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlternantDetail = async (studentId: number) => {
    setLoadingDetail(true);
    try {
      const [contractsRes, documentsRes] = await Promise.all([
        fetch(`/api/alternants/${studentId}/contracts`),
        fetch(`/api/alternants/${studentId}/documents`),
      ]);

      const contractsData = await contractsRes.json();
      const documentsData = await documentsRes.json();

      if (contractsData.success) setContracts(contractsData.contracts || []);
      if (documentsData.success) setDocuments(documentsData.documents || []);
    } catch (error) {
      console.error("Error fetching alternant detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectAlternant = (alternant: Alternant) => {
    setSelectedAlternant(alternant);
    fetchAlternantDetail(alternant.id);
  };

  const handleCloseDetail = () => {
    setSelectedAlternant(null);
    setContracts([]);
    setDocuments([]);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Alternants</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Gestion et suivi des étudiants en alternance
            </p>
          </div>
        </div>
        <AddAlternantDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={fetchData}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Alternants
                </CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Étudiants en alternance
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Contrats Actifs
                </CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Briefcase className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats?.activeContracts || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  En cours actuellement
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Fin Prochaine
                </CardTitle>
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {stats?.endingSoon || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dans les 30 prochains jours
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Entreprises
                </CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Building2 className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{companies.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Partenaires différents
                </p>
              </CardContent>
            </Card>
          </div>

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Étudiant</TableHead>
                    <TableHead>Promo</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlternants.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Aucun alternant trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlternants.map((alt) => (
                      <TableRow
                        key={alt.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectAlternant(alt)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {alt.firstName} {alt.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {alt.login}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{alt.promoName}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{alt.companyName || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(alt.alternantStartDate)} -{" "}
                            {formatDate(alt.alternantEndDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEndingSoon(alt.alternantEndDate) ? (
                            <Badge
                              variant="outline"
                              className="bg-orange-500/10 text-orange-700 border-orange-500/20"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Fin proche
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-700 border-green-500/20"
                            >
                              Actif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedAlternant} onOpenChange={(open) => !open && handleCloseDetail()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedAlternant && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div>{selectedAlternant.firstName} {selectedAlternant.lastName}</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      {selectedAlternant.login}
                    </div>
                  </div>
                </SheetTitle>
                <SheetDescription>
                  {selectedAlternant.companyName && (
                    <div className="flex items-center gap-2 mt-2">
                      <Building2 className="h-4 w-4" />
                      {selectedAlternant.companyName}
                    </div>
                  )}
                </SheetDescription>
              </SheetHeader>

              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Tabs defaultValue="contracts" className="mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="contracts" className="gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Contrats ({contracts.length})
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Documents ({documents.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="contracts" className="space-y-4 mt-4">
                    <div className="flex justify-end">
                      <AddContractDialog
                        studentId={selectedAlternant.id}
                        open={isContractDialogOpen}
                        onOpenChange={setIsContractDialogOpen}
                        onSuccess={() => fetchAlternantDetail(selectedAlternant.id)}
                      />
                    </div>

                    {contracts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun contrat enregistré</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {contracts.map((contract) => (
                          <Card key={contract.id} className={contract.isActive ? "border-primary/50" : ""}>
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">
                                  {CONTRACT_TYPE_LABELS[contract.contractType] || contract.contractType}
                                </div>
                                {contract.isActive && (
                                  <Badge className="bg-green-500">Actif</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <Building2 className="h-3 w-3 inline mr-1" />
                                {contract.companyName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                              </div>
                              {contract.tutorName && (
                                <div className="text-sm text-muted-foreground">
                                  <User className="h-3 w-3 inline mr-1" />
                                  {contract.tutorName}
                                  {contract.tutorEmail && (
                                    <a href={`mailto:${contract.tutorEmail}`} className="ml-2 text-primary hover:underline">
                                      {contract.tutorEmail}
                                    </a>
                                  )}
                                </div>
                              )}
                              {contract.workSchedule && (
                                <div className="text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {contract.workSchedule}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 mt-4">
                    <div className="flex justify-end">
                      <AddDocumentDialog
                        studentId={selectedAlternant.id}
                        contracts={contracts}
                        open={isDocumentDialogOpen}
                        onOpenChange={setIsDocumentDialogOpen}
                        onSuccess={() => fetchAlternantDetail(selectedAlternant.id)}
                      />
                    </div>

                    {documents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun document enregistré</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <Card key={doc.id}>
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{doc.title}</div>
                                <Badge variant="outline">
                                  {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                                </Badge>
                              </div>
                              {doc.description && (
                                <div className="text-sm text-muted-foreground">
                                  {doc.description}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Ajouté le {formatDate(doc.uploadedAt)}
                                {doc.validUntil && (
                                  <span className="ml-2">
                                    - Valide jusqu'au {formatDate(doc.validUntil)}
                                  </span>
                                )}
                              </div>
                              {doc.fileUrl && (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                >
                                  Voir le document
                                </a>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Dialog components

function AddAlternantDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentLogin: "",
    companyName: "",
    companyContact: "",
    companyEmail: "",
    companyPhone: "",
    startDate: "",
    endDate: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/alternants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isAlternant: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onOpenChange(false);
        setFormData({
          studentLogin: "",
          companyName: "",
          companyContact: "",
          companyEmail: "",
          companyPhone: "",
          startDate: "",
          endDate: "",
          notes: "",
        });
      } else {
        alert(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Error adding alternant:", error);
      alert("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un alternant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un alternant</DialogTitle>
          <DialogDescription>
            Définir un étudiant comme alternant et renseigner les informations
            de son entreprise.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentLogin">Login étudiant *</Label>
            <Input
              id="studentLogin"
              placeholder="ex: jdupont"
              value={formData.studentLogin}
              onChange={(e) =>
                setFormData({ ...formData, studentLogin: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Entreprise</Label>
            <Input
              id="companyName"
              placeholder="Nom de l'entreprise"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyContact">Tuteur entreprise</Label>
            <Input
              id="companyContact"
              placeholder="Nom du tuteur"
              value={formData.companyContact}
              onChange={(e) =>
                setFormData({ ...formData, companyContact: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyEmail">Email entreprise</Label>
            <Input
              id="companyEmail"
              type="email"
              placeholder="contact@entreprise.com"
              value={formData.companyEmail}
              onChange={(e) =>
                setFormData({ ...formData, companyEmail: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyPhone">Téléphone entreprise</Label>
            <Input
              id="companyPhone"
              placeholder="01 23 45 67 89"
              value={formData.companyPhone}
              onChange={(e) =>
                setFormData({ ...formData, companyPhone: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Notes additionnelles..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddContractDialog({
  studentId,
  open,
  onOpenChange,
  onSuccess,
}: {
  studentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contractType: "apprentissage",
    startDate: "",
    endDate: "",
    companyName: "",
    companyAddress: "",
    companySiret: "",
    tutorName: "",
    tutorEmail: "",
    tutorPhone: "",
    salary: "",
    workSchedule: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/alternants/${studentId}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onOpenChange(false);
        setFormData({
          contractType: "apprentissage",
          startDate: "",
          endDate: "",
          companyName: "",
          companyAddress: "",
          companySiret: "",
          tutorName: "",
          tutorEmail: "",
          tutorPhone: "",
          salary: "",
          workSchedule: "",
          notes: "",
        });
      } else {
        alert(data.error || "Erreur lors de l'ajout du contrat");
      }
    } catch (error) {
      console.error("Error adding contract:", error);
      alert("Erreur lors de l'ajout du contrat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un contrat</DialogTitle>
          <DialogDescription>
            Enregistrer un nouveau contrat d'alternance
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type de contrat *</Label>
            <Select
              value={formData.contractType}
              onValueChange={(value) =>
                setFormData({ ...formData, contractType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apprentissage">Contrat d'apprentissage</SelectItem>
                <SelectItem value="professionnalisation">Contrat de professionnalisation</SelectItem>
                <SelectItem value="stage_alterne">Stage alterné</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début *</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin *</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Entreprise *</Label>
            <Input
              placeholder="Nom de l'entreprise"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input
              placeholder="Adresse de l'entreprise"
              value={formData.companyAddress}
              onChange={(e) =>
                setFormData({ ...formData, companyAddress: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>SIRET</Label>
            <Input
              placeholder="Numéro SIRET"
              value={formData.companySiret}
              onChange={(e) =>
                setFormData({ ...formData, companySiret: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Tuteur entreprise</Label>
            <Input
              placeholder="Nom du tuteur"
              value={formData.tutorName}
              onChange={(e) =>
                setFormData({ ...formData, tutorName: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email tuteur</Label>
              <Input
                type="email"
                placeholder="tuteur@entreprise.com"
                value={formData.tutorEmail}
                onChange={(e) =>
                  setFormData({ ...formData, tutorEmail: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone tuteur</Label>
              <Input
                placeholder="01 23 45 67 89"
                value={formData.tutorPhone}
                onChange={(e) =>
                  setFormData({ ...formData, tutorPhone: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rythme d'alternance</Label>
            <Input
              placeholder="Ex: 3 jours entreprise / 2 jours formation"
              value={formData.workSchedule}
              onChange={(e) =>
                setFormData({ ...formData, workSchedule: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Rémunération</Label>
            <Input
              placeholder="Ex: 1200€ brut/mois"
              value={formData.salary}
              onChange={(e) =>
                setFormData({ ...formData, salary: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Notes additionnelles..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddDocumentDialog({
  studentId,
  contracts,
  open,
  onOpenChange,
  onSuccess,
}: {
  studentId: number;
  contracts: Contract[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contractId: "",
    documentType: "contrat",
    title: "",
    description: "",
    fileUrl: "",
    validUntil: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/alternants/${studentId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          contractId: formData.contractId ? parseInt(formData.contractId) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onOpenChange(false);
        setFormData({
          contractId: "",
          documentType: "contrat",
          title: "",
          description: "",
          fileUrl: "",
          validUntil: "",
        });
      } else {
        alert(data.error || "Erreur lors de l'ajout du document");
      }
    } catch (error) {
      console.error("Error adding document:", error);
      alert("Erreur lors de l'ajout du document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>
            Enregistrer un document lié à l'alternance
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type de document *</Label>
            <Select
              value={formData.documentType}
              onValueChange={(value) =>
                setFormData({ ...formData, documentType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contrat">Contrat</SelectItem>
                <SelectItem value="convention">Convention</SelectItem>
                <SelectItem value="attestation">Attestation</SelectItem>
                <SelectItem value="compte_rendu">Compte rendu</SelectItem>
                <SelectItem value="evaluation">Évaluation</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input
              placeholder="Titre du document"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
          {contracts.length > 0 && (
            <div className="space-y-2">
              <Label>Contrat associé</Label>
              <Select
                value={formData.contractId}
                onValueChange={(value) =>
                  setFormData({ ...formData, contractId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun contrat spécifique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {CONTRACT_TYPE_LABELS[c.contractType]} - {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Description du document..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>URL du fichier</Label>
            <Input
              placeholder="https://..."
              value={formData.fileUrl}
              onChange={(e) =>
                setFormData({ ...formData, fileUrl: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Lien vers le document stocké (Google Drive, SharePoint, etc.)
            </p>
          </div>
          <div className="space-y-2">
            <Label>Valide jusqu'au</Label>
            <Input
              type="date"
              value={formData.validUntil}
              onChange={(e) =>
                setFormData({ ...formData, validUntil: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
