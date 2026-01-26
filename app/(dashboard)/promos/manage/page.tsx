"use client";

import { useEffect, useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Archive,
  ArchiveRestore,
  ArrowRightLeft,
  Calendar,
  FolderArchive,
  GraduationCap,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings2,
  User,
  UserMinus,
  UserX,
} from "lucide-react";
import promoConfig from "config/promoConfig.json";

interface ArchivedPromo {
  promoId: string;
  name: string;
  isArchived: boolean;
  archivedAt: string | null;
  archivedReason: string | null;
}

interface TransferredStudent {
  login: string;
  firstName: string;
  lastName: string;
  currentPromo: string;
  previousPromo: string | null;
}

interface DropoutStudent {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  promoName: string;
  dropoutAt: string | null;
  dropoutReason: string | null;
  dropoutNotes: string | null;
  previousPromo: string | null;
}

const DROPOUT_REASON_LABELS: Record<string, string> = {
  abandon: "Abandon volontaire",
  exclusion: "Exclusion",
  reorientation: "Réorientation",
  medical: "Raisons médicales",
  personal: "Raisons personnelles",
  financial: "Raisons financières",
  other: "Autre",
};

export default function PromosManagePage() {
  const [activePromos, setActivePromos] = useState<ArchivedPromo[]>([]);
  const [archivedPromos, setArchivedPromos] = useState<ArchivedPromo[]>([]);
  const [transferredStudents, setTransferredStudents] = useState<TransferredStudent[]>([]);
  const [dropoutStudents, setDropoutStudents] = useState<DropoutStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [promosRes, archivedRes, transfersRes, dropoutsRes] = await Promise.all([
        fetch("/api/promotions/archive"),
        fetch("/api/promotions/archive?archived=true"),
        fetch("/api/students/transfer"),
        fetch("/api/students/dropouts"),
      ]);

      const promosData = await promosRes.json();
      const archivedData = await archivedRes.json();
      const transfersData = await transfersRes.json();
      const dropoutsData = await dropoutsRes.json();

      if (promosData.success) {
        setActivePromos(promosData.promotions.filter((p: ArchivedPromo) => !p.isArchived));
      }
      if (archivedData.success) {
        setArchivedPromos(archivedData.promotions);
      }
      if (transfersData.success) {
        setTransferredStudents(transfersData.students);
      }
      if (dropoutsData.success) {
        setDropoutStudents(dropoutsData.dropouts);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleArchive = async (promoName: string, reason?: string) => {
    setActionLoading(promoName);
    try {
      const res = await fetch("/api/promotions/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoName, reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || "Erreur lors de l'archivage");
      }
    } catch (error) {
      console.error("Error archiving promo:", error);
      alert("Erreur lors de l'archivage");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnarchive = async (promoName: string) => {
    setActionLoading(promoName);
    try {
      const res = await fetch("/api/promotions/archive", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoName }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || "Erreur lors de la restauration");
      }
    } catch (error) {
      console.error("Error unarchiving promo:", error);
      alert("Erreur lors de la restauration");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateStudent = async (studentId: number) => {
    setActionLoading(`dropout-${studentId}`);
    try {
      const res = await fetch(`/api/student/${studentId}/dropout`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || "Erreur lors de la réactivation");
      }
    } catch (error) {
      console.error("Error reactivating student:", error);
      alert("Erreur lors de la réactivation");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gestion des Promotions
            </h1>
            <p className="text-muted-foreground">
              Archivage, transferts, perditions et administration
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full sm:w-auto grid-cols-4">
            <TabsTrigger value="active" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Actives</span> ({activePromos.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              <FolderArchive className="h-4 w-4" />
              <span className="hidden sm:inline">Archivées</span> ({archivedPromos.length})
            </TabsTrigger>
            <TabsTrigger value="transfers" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Transferts</span> ({transferredStudents.length})
            </TabsTrigger>
            <TabsTrigger value="dropouts" className="gap-2">
              <UserX className="h-4 w-4" />
              <span className="hidden sm:inline">Perditions</span> ({dropoutStudents.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Promos Tab */}
          <TabsContent value="active" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Promotions Actives</CardTitle>
                <CardDescription>
                  Ces promotions sont incluses dans les mises à jour et les
                  statistiques
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Promotion</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoConfig.map((promo) => {
                      const isArchived = archivedPromos.some(
                        (p) => p.name === promo.key
                      );
                      if (isArchived) return null;
                      return (
                        <TableRow key={promo.key}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <GraduationCap className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{promo.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {promo.key}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{promo.eventId}</Badge>
                          </TableCell>
                          <TableCell>
                            <ArchivePromoDialog
                              promoName={promo.key}
                              promoTitle={promo.title}
                              onArchive={handleArchive}
                              loading={actionLoading === promo.key}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Archived Promos Tab */}
          <TabsContent value="archived" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Promotions Archivées</CardTitle>
                <CardDescription>
                  Ces promotions sont exclues des mises à jour mais les données
                  sont conservées
                </CardDescription>
              </CardHeader>
              <CardContent>
                {archivedPromos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune promotion archivée</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Promotion</TableHead>
                        <TableHead>Date d'archivage</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedPromos.map((promo) => (
                        <TableRow key={promo.name}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                                <Archive className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="font-medium">{promo.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDate(promo.archivedAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {promo.archivedReason || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={actionLoading === promo.name}
                                >
                                  {actionLoading === promo.name ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <ArchiveRestore className="h-4 w-4 mr-2" />
                                      Restaurer
                                    </>
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Restaurer {promo.name} ?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette promotion sera de nouveau incluse dans
                                    les mises à jour automatiques et les
                                    statistiques.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleUnarchive(promo.name)}
                                  >
                                    Restaurer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="space-y-4 mt-6">
            <div className="flex justify-end">
              <TransferStudentDialog onSuccess={fetchData} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Étudiants Transférés</CardTitle>
                <CardDescription>
                  Historique des transferts entre promotions (redoublements,
                  changements de parcours, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transferredStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun transfert enregistré</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Étudiant</TableHead>
                        <TableHead>Ancienne Promo</TableHead>
                        <TableHead>Nouvelle Promo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferredStudents.map((student) => (
                        <TableRow key={student.login}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {student.firstName} {student.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {student.login}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-muted">
                              {student.previousPromo || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">
                              {student.currentPromo}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dropouts Tab */}
          <TabsContent value="dropouts" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Étudiants en Perdition</CardTitle>
                <CardDescription>
                  Étudiants ayant quitté la formation (exclus des statistiques et mises à jour)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dropoutStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserMinus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun étudiant en perdition</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Étudiant</TableHead>
                        <TableHead>Promo</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dropoutStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center">
                                <UserX className="h-4 w-4 text-red-500" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {student.firstName} {student.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {student.login}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {student.previousPromo || student.promoName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDate(student.dropoutAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.dropoutReason ? (
                              <Badge
                                variant="outline"
                                className="bg-red-500/10 text-red-700 border-red-500/20"
                              >
                                {DROPOUT_REASON_LABELS[student.dropoutReason] ||
                                  student.dropoutReason}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
                              {student.dropoutNotes || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={actionLoading === `dropout-${student.id}`}
                                >
                                  {actionLoading === `dropout-${student.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      Réactiver
                                    </>
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Réactiver {student.firstName} {student.lastName} ?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cet étudiant sera de nouveau inclus dans les
                                    statistiques et les mises à jour. Il restera dans
                                    sa promotion actuelle ({student.promoName}).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReactivateStudent(student.id)}
                                  >
                                    Réactiver
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ArchivePromoDialog({
  promoName,
  promoTitle,
  onArchive,
  loading,
}: {
  promoName: string;
  promoTitle: string;
  onArchive: (promoName: string, reason?: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    onArchive(promoName, reason || undefined);
    setOpen(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Archive className="h-4 w-4 mr-2" />
              Archiver
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archiver {promoTitle}</DialogTitle>
          <DialogDescription>
            Cette promotion sera exclue des mises à jour automatiques et des
            statistiques. Les données existantes seront conservées.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Raison (optionnel)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Formation terminée, promo diplômée..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            <Archive className="h-4 w-4 mr-2" />
            Archiver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferStudentDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentLogin: "",
    targetPromoName: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/students/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        setOpen(false);
        setFormData({ studentLogin: "", targetPromoName: "", reason: "" });
      } else {
        alert(data.error || "Erreur lors du transfert");
      }
    } catch (error) {
      console.error("Error transferring student:", error);
      alert("Erreur lors du transfert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Transférer un étudiant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transférer un étudiant</DialogTitle>
          <DialogDescription>
            Transférer un étudiant vers une autre promotion (redoublement,
            changement de parcours, etc.)
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
            <Label htmlFor="targetPromoName">Promotion de destination *</Label>
            <Select
              value={formData.targetPromoName}
              onValueChange={(value) =>
                setFormData({ ...formData, targetPromoName: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une promotion" />
              </SelectTrigger>
              <SelectContent>
                {promoConfig.map((promo) => (
                  <SelectItem key={promo.key} value={promo.key}>
                    {promo.title} ({promo.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Raison (optionnel)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Redoublement, changement de parcours..."
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transférer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
