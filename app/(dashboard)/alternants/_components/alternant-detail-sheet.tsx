"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  User,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingCard } from "@/components/ui/loading-card";
import { PILL } from "@/lib/status-pills";
import {
  type Alternant,
  type Contract,
  type Document,
  CONTRACT_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
} from "../page";
import { AddContractDialog } from "./add-contract-dialog";
import { AddDocumentDialog } from "./add-document-dialog";

export function AlternantDetailSheet({
  selectedAlternant,
  contracts,
  documents,
  loadingDetail,
  isContractDialogOpen,
  onContractDialogOpenChange,
  isDocumentDialogOpen,
  onDocumentDialogOpenChange,
  onClose,
  onRefreshDetail,
  formatDate,
}: {
  selectedAlternant: Alternant | null;
  contracts: Contract[];
  documents: Document[];
  loadingDetail: boolean;
  isContractDialogOpen: boolean;
  onContractDialogOpenChange: (open: boolean) => void;
  isDocumentDialogOpen: boolean;
  onDocumentDialogOpenChange: (open: boolean) => void;
  onClose: () => void;
  onRefreshDetail: (studentId: number) => void;
  formatDate: (dateStr: string | null) => string;
}) {
  return (
    <Sheet open={!!selectedAlternant} onOpenChange={(open) => !open && onClose()}>
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
              <LoadingCard height="md" />
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
                      onOpenChange={onContractDialogOpenChange}
                      onSuccess={() => onRefreshDetail(selectedAlternant.id)}
                    />
                  </div>

                  {contracts.length === 0 ? (
                    <EmptyState icon={ClipboardList} title="Aucun contrat enregistré" />
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
                                <Badge variant="outline" className={PILL.emerald}>Actif</Badge>
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
                      onOpenChange={onDocumentDialogOpenChange}
                      onSuccess={() => onRefreshDetail(selectedAlternant.id)}
                    />
                  </div>

                  {documents.length === 0 ? (
                    <EmptyState icon={FileText} title="Aucun document enregistré" />
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
  );
}
