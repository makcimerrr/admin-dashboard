"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { type Contract, CONTRACT_TYPE_LABELS } from "../page";

export function AddDocumentDialog({
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
