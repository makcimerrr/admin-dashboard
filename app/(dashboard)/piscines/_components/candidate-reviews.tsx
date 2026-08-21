"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import {
  REVIEWED_PROJECTS,
  REVIEW_SLOTS,
  type CandidateDetail,
  type ProjectReview,
} from "../types";

/**
 * Saisie humaine sur un candidat : commentaire libre et trois comptes rendus
 * par projet (quad, sudoku, quadchecker).
 *
 * Ces textes ne viennent pas de Zone01 et ne sont jamais écrasés par la
 * synchronisation — ils vivent dans leurs propres tables.
 *
 * L'enregistrement est explicite plutôt qu'automatique à la frappe : un compte
 * rendu se rédige en plusieurs fois, et une sauvegarde par caractère produirait
 * des versions intermédiaires incohérentes.
 */
export function CandidateReviews({
  candidateId,
  detail,
  onSaved,
}: {
  candidateId: number;
  detail: CandidateDetail | null;
  onSaved: (updated: CandidateDetail) => void;
}) {
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Recharge les champs quand on ouvre un autre candidat.
  useEffect(() => {
    setComment(detail?.comment?.content ?? "");
    const map: Record<string, string> = {};
    for (const r of detail?.reviews ?? []) map[`${r.project}-${r.slot}`] = r.content;
    setReviews(map);
  }, [detail]);

  const save = async (payload: Record<string, unknown>, key: string) => {
    setSaving(key);
    try {
      const res = await fetch(`/api/piscines/candidates/${candidateId}/reviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Enregistré");
        onSaved(json.data.candidate as CandidateDetail);
      } else {
        toast.error(json.error?.message ?? "L'enregistrement a échoué");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(null);
    }
  };

  const existing = (project: string, slot: number): ProjectReview | undefined =>
    detail?.reviews.find((r) => r.project === project && r.slot === slot);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="candidate-comment">Commentaire</Label>
        <Textarea
          id="candidate-comment"
          rows={4}
          placeholder="Observations sur le candidat, contexte, points d'attention..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {detail?.comment
              ? `Par ${detail.comment.author}, le ${new Date(
                  detail.comment.updatedAt,
                ).toLocaleDateString("fr-FR")}`
              : "Aucun commentaire"}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={saving === "comment" || comment === (detail?.comment?.content ?? "")}
            onClick={() => save({ comment }, "comment")}
          >
            {saving === "comment" ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Check className="mr-2 h-3 w-3" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      {REVIEWED_PROJECTS.map((project) => {
        const filled = REVIEW_SLOTS.filter((slot) => existing(project, slot)).length;
        return (
          <div key={project} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="capitalize">{project}</Label>
              <Badge variant="outline" className="text-[11px]">
                {filled}/3 comptes rendus
              </Badge>
            </div>

            {REVIEW_SLOTS.map((slot) => {
              const key = `${project}-${slot}`;
              const saved = existing(project, slot);
              const value = reviews[key] ?? "";
              return (
                <div key={key} className="space-y-1">
                  <Textarea
                    rows={2}
                    placeholder={`Compte rendu ${slot}`}
                    value={value}
                    onChange={(e) => setReviews({ ...reviews, [key]: e.target.value })}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {saved
                        ? `${saved.author} · ${new Date(saved.updatedAt).toLocaleDateString("fr-FR")}`
                        : "—"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={saving === key || value === (saved?.content ?? "")}
                      onClick={() => save({ project, slot, content: value }, key)}
                    >
                      {saving === key ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-3 w-3" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
