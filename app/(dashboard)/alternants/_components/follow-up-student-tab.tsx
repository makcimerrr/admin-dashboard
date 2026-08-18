"use client";

import { useState } from "react";
import { useData, mutateKey } from "@/lib/client-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingCard } from "@/components/ui/loading-card";
import { Separator } from "@/components/ui/separator";
import { PILL } from "@/lib/status-pills";
import { CalendarClock, FileText, Plus } from "lucide-react";
import {
  FOLLOW_UP_MODE_LABELS,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_TONE,
  type ApiEnvelope,
  type FollowUpMilestone,
  type FollowUpReport,
} from "../types";
import { FollowUpReportDialog } from "./follow-up-report-dialog";

/**
 * Onglet « Suivi » de la fiche apprenant : les échéances de son contrat et
 * l'historique complet des comptes rendus le concernant.
 */
export function FollowUpStudentTab({ studentId }: { studentId: number }) {
  const milestonesKey = `/api/follow-ups?studentId=${studentId}&includeClosed=true`;
  const reportsKey = `/api/follow-ups/reports?studentId=${studentId}`;

  const { data: milestonesData, isLoading: loadingMilestones } = useData<
    ApiEnvelope<{ milestones: FollowUpMilestone[] }>
  >(milestonesKey);
  const { data: reportsData, isLoading: loadingReports } = useData<
    ApiEnvelope<{ reports: FollowUpReport[] }>
  >(reportsKey);

  const [reportOpen, setReportOpen] = useState(false);

  const milestones = milestonesData?.success ? milestonesData.data.milestones : [];
  const reports = reportsData?.success ? reportsData.data.reports : [];

  const refresh = () => {
    mutateKey(milestonesKey);
    mutateKey(reportsKey);
  };

  if (loadingMilestones || loadingReports) return <LoadingCard height="md" />;

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

  return (
    <div className="space-y-6">
      {/* Échéances */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Échéances de suivi</h4>
          <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Compte rendu
          </Button>
        </div>

        {milestones.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Aucune échéance"
            description="Les échéances se calculent depuis la date de début de contrat."
          />
        ) : (
          <div className="space-y-2">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <div className="text-sm font-medium">{m.typeLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    Prévu le {fmt(m.dueDate)}
                    {m.scheduledAt && ` · RDV le ${fmt(m.scheduledAt)}`}
                    {m.completedAt && ` · réalisé le ${fmt(m.completedAt)}`}
                  </div>
                </div>
                <Badge variant="outline" className={PILL[MILESTONE_STATUS_TONE[m.status]]}>
                  {MILESTONE_STATUS_LABELS[m.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Historique des comptes rendus */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Comptes rendus ({reports.length})</h4>
        {reports.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun compte rendu" />
        ) : (
          reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {r.milestoneLabel ?? "Suivi hors échéance"} — {fmt(r.performedAt)}
                  </div>
                  {r.mode && (
                    <Badge variant="outline">{FOLLOW_UP_MODE_LABELS[r.mode] ?? r.mode}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Par {r.author}
                  {r.companyName && ` · ${r.companyName}`}
                  {r.tutorName && ` · tuteur : ${r.tutorName}`}
                </div>
                <p className="whitespace-pre-wrap text-sm">{r.content}</p>
                {r.vigilancePoints && (
                  <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
                    <span className="font-medium">Points de vigilance : </span>
                    {r.vigilancePoints}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <FollowUpReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        studentId={studentId}
        onSaved={() => {
          refresh();
          setReportOpen(false);
        }}
      />
    </div>
  );
}
