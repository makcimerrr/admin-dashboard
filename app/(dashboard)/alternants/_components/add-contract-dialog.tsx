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

export function AddContractDialog({
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
