"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { FOLLOW_UP_MODE_LABELS, type FollowUpMilestone } from "../types";

/**
 * Saisie du compte rendu de suivi. Enregistrer clôt l'échéance (statut
 * « réalisé ») et alimente l'historique de l'apprenant et de l'entreprise.
 *
 * Utilisable aussi hors échéance (`studentId` seul) pour consigner un suivi
 * non planifié.
 */
export function FollowUpReportDialog({
  open,
  onOpenChange,
  milestone,
  studentId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone?: FollowUpMilestone | null;
  studentId?: number;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    performedAt: today,
    mode: "visite",
    content: "",
    vigilancePoints: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) {
      toast.error("Le compte rendu ne peut pas être vide");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/follow-ups/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(milestone ? { milestoneId: milestone.id } : { studentId }),
          performedAt: new Date(form.performedAt).toISOString(),
          mode: form.mode,
          content: form.content.trim(),
          vigilancePoints: form.vigilancePoints.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Compte rendu enregistré");
        setForm({ performedAt: today, mode: "visite", content: "", vigilancePoints: "" });
        onSaved();
      } else {
        toast.error(json.error?.message ?? "L'enregistrement a échoué");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Compte rendu de suivi</DialogTitle>
            <DialogDescription>
              {milestone
                ? `${milestone.firstName} ${milestone.lastName} — ${milestone.typeLabel} chez ${milestone.companyName}. Enregistrer clôt l'échéance.`
                : "Consigne un suivi réalisé hors échéance planifiée."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="performedAt">Date du suivi</Label>
                <Input
                  id="performedAt"
                  type="date"
                  value={form.performedAt}
                  onChange={(e) => setForm({ ...form, performedAt: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mode">Modalité</Label>
                <Select
                  value={form.mode}
                  onValueChange={(v) => setForm({ ...form, mode: v })}
                >
                  <SelectTrigger id="mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FOLLOW_UP_MODE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Compte rendu</Label>
              <Textarea
                id="content"
                rows={7}
                placeholder="Missions confiées, intégration, montée en compétences, retour du tuteur, retour de l'apprenant..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vigilancePoints">Points de vigilance</Label>
              <Textarea
                id="vigilancePoints"
                rows={3}
                placeholder="Difficultés relevées, actions à mener, échéance de reprise de contact..."
                value={form.vigilancePoints}
                onChange={(e) => setForm({ ...form, vigilancePoints: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
