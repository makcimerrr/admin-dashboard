"use client";

import { useData } from "@/lib/client-cache";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingCard } from "@/components/ui/loading-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PILL } from "@/lib/status-pills";
import { cn } from "@/lib/utils";
import { AlertTriangle, ClipboardList, Mail, User } from "lucide-react";
import {
  ADMISSION_LABELS,
  ADMISSION_TONE,
  RESULT_KIND_LABELS,
  candidateName,
  type ApiEnvelope,
  type CandidateDetail,
  type PiscineCandidate,
  type PiscineResultKind,
} from "../types";

/**
 * Fiche candidat : sa progression épreuve par épreuve.
 *
 * Les épreuves sont groupées par nature (examens d'abord) : c'est la moyenne
 * d'examens qui décide, les exercices du quotidien racontent la régularité.
 */
export function CandidateSheet({
  candidate,
  onClose,
}: {
  candidate: PiscineCandidate | null;
  onClose: () => void;
}) {
  const key = candidate ? `/api/piscines/candidates/${candidate.id}` : null;
  const { data, isLoading } = useData<ApiEnvelope<{ candidate: CandidateDetail }>>(key);
  const detail = data?.success ? data.data.candidate : null;

  // Examens d'abord : c'est la moyenne d'examens qui décide de l'admission.
  const order: PiscineResultKind[] = ["exam", "project", "exercise"];

  if (!candidate) return null;

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div>{candidateName(candidate)}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {candidate.login}
              </div>
            </div>
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="outline" className={PILL[ADMISSION_TONE[candidate.admission]]}>
              {ADMISSION_LABELS[candidate.admission]}
            </Badge>
            <span>Niveau {candidate.level ?? "—"}</span>
            {candidate.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {candidate.email}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {candidate.risk && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>{candidate.risk}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold tabular-nums">
                {candidate.exercisesDone}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                exercices validés
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold tabular-nums">
                {candidate.exercisesTried}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                tentés
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold tabular-nums">
                {candidate.examAverage !== null ? candidate.examAverage.toFixed(2) : "—"}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                moy. examens
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 space-y-5">
          {isLoading ? (
            <LoadingCard height="md" />
          ) : !detail || detail.results.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aucune épreuve"
              description="Ce candidat n'a produit aucun rendu sur la session."
            />
          ) : (
            order.map((kind) => {
              const group = detail.results.filter((r) => r.kind === kind);
              if (group.length === 0) return null;
              return (
                <div key={kind} className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {RESULT_KIND_LABELS[kind]}s ({group.length})
                  </h4>
                  <div className="divide-y rounded-lg border">
                    {group.map((r) => (
                      <div
                        key={r.name}
                        className="flex items-center justify-between gap-3 p-3 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="font-medium">{r.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {fmt(r.updatedAt)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {r.grade !== null && (
                            <span
                              className={cn(
                                "tabular-nums text-sm",
                                r.grade > 0 ? "text-success" : "text-destructive",
                              )}
                            >
                              {r.grade.toFixed(2)}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={r.isDone ? PILL.emerald : PILL.rose}
                          >
                            {r.isDone ? "rendu" : "non rendu"}
                          </Badge>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
