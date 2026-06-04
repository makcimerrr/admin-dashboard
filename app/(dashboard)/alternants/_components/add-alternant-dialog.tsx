"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function AddAlternantDialog({
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
