"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { REVIEWED_PROJECTS, type CandidateDetail, type ProjectReview } from "../types";

/**
 * Saisie humaine sur un candidat : commentaire libre et un compte rendu par
 * projet (quad, sudoku, quadchecker).
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
    for (const r of detail?.reviews ?? []) map[r.project] = r.content;
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

  const existing = (project: string): ProjectReview | undefined =>
    detail?.reviews.find((r) => r.project === project);

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
        const saved = existing(project);
        const value = reviews[project] ?? "";
        return (
          <div key={project} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`review-${project}`} className="capitalize">
                {project}
              </Label>
              {saved && (
                <Badge variant="outline" className="text-[11px]">
                  {saved.author} · {new Date(saved.updatedAt).toLocaleDateString("fr-FR")}
                </Badge>
              )}
            </div>

            <Textarea
              id={`review-${project}`}
              rows={3}
              placeholder={`Compte rendu de l'audit ${project}`}
              value={value}
              onChange={(e) => setReviews({ ...reviews, [project]: e.target.value })}
            />

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={saving === project || value === (saved?.content ?? "")}
                onClick={() => save({ project, content: value }, project)}
              >
                {saving === project ? (
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
}
