"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PILL } from "@/lib/status-pills";
import {
  Building2,
  CalendarCheck,
  ExternalLink,
  Mail,
  Phone,
  Send,
  User,
} from "lucide-react";
import {
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_TONE,
  type ApiEnvelope,
  type FollowUpMilestone,
} from "../types";
import { FollowUpReportDialog } from "./follow-up-report-dialog";
import { FollowUpConfirmSendDialog } from "./follow-up-confirm-send-dialog";

interface ReminderRow {
  id: number;
  channel: string;
  kind: string;
  recipient: string | null;
  sentBy: string | null;
  sentAt: string;
  status: string;
  error: string | null;
}

const KIND_LABELS: Record<string, string> = {
  manual: "confirmée à la main",
  relance: "relance suivante",
};

/**
 * Détail d'une échéance : coordonnées du tuteur, aperçu du mail, relance,
 * planification du RDV et saisie du compte rendu.
 */
export function FollowUpDetailDialog({
  milestone,
  onClose,
  onChanged,
  onOpenStudent,
}: {
  milestone: FollowUpMilestone | null;
  onClose: () => void;
  onChanged: () => void;
  onOpenStudent?: (studentId: number) => void;
}) {
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [savingDate, setSavingDate] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);

  useEffect(() => {
    if (!milestone) {
      setPreview(null);
      setReminders([]);
      return;
    }
    setScheduledAt(milestone.scheduledAt ? milestone.scheduledAt.slice(0, 16) : "");

    // Aperçu du mail + historique des relances de CETTE échéance.
    void (async () => {
      const [previewRes, detailRes] = await Promise.all([
        fetch(`/api/follow-ups/${milestone.id}/remind`),
        fetch(`/api/follow-ups/${milestone.id}`),
      ]);
      const previewJson = (await previewRes.json()) as ApiEnvelope<{
        subject: string;
        body: string;
      }>;
      const detailJson = (await detailRes.json()) as ApiEnvelope<{ reminders: ReminderRow[] }>;
      if (previewJson.success) setPreview(previewJson.data);
      if (detailJson.success) setReminders(detailJson.data.reminders);
    })();
  }, [milestone]);

  if (!milestone) return null;

  const handleStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    setSavingDate(true);
    try {
      const res = await fetch(`/api/follow-ups/${milestone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Échéance mise à jour");
        onChanged();
        onClose();
      } else {
        toast.error(json.error?.message ?? "La mise à jour a échoué");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSavingDate(false);
    }
  };

  const dueLabel = new Date(milestone.dueDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              {milestone.firstName} {milestone.lastName} — {milestone.typeLabel}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant="outline"
                className={PILL[MILESTONE_STATUS_TONE[milestone.status]]}
              >
                {MILESTONE_STATUS_LABELS[milestone.status]}
              </Badge>
              <span>Échéance : {dueLabel}</span>
              {milestone.daysUntilDue < 0 &&
                milestone.status !== "realise" &&
                milestone.status !== "annule" && (
                  <span className="text-destructive">
                    ({Math.abs(milestone.daysUntilDue)} j de retard)
                  </span>
                )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Contexte */}
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{milestone.companyName}</div>
                  <div className="text-xs text-muted-foreground">
                    Contrat du {new Date(milestone.contractStart).toLocaleDateString("fr-FR")} au{" "}
                    {new Date(milestone.contractEnd).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{milestone.tutorName ?? "Tuteur non renseigné"}</div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {milestone.tutorEmail ? (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {milestone.tutorEmail}
                      </div>
                    ) : (
                      <div className="text-warning">Email manquant — relance impossible</div>
                    )}
                    {milestone.tutorPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {milestone.tutorPhone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {onOpenStudent && (
              <Button
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  onOpenStudent(milestone.studentId);
                  onClose();
                }}
              >
                Voir la fiche de l'apprenant <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            )}

            <Separator />

            {/* Aperçu du mail */}
            {preview && (
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Mail proposé — relu et confirmé avant tout envoi
                </Label>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{preview.subject}</div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                    {preview.body}
                  </pre>
                </div>
              </div>
            )}

            {/* Historique des relances */}
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Relances ({reminders.length})
              </Label>
              {reminders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune relance envoyée.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {reminders.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span>
                        {new Date(r.sentAt).toLocaleString("fr-FR")} —{" "}
                        {KIND_LABELS[r.kind] ?? r.kind} → {r.recipient}
                      </span>
                      {r.status === "failed" ? (
                        <Badge variant="outline" className={PILL.rose} title={r.error ?? ""}>
                          échec
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.sentBy}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            {/* Planification du RDV */}
            <div className="space-y-2">
              <Label htmlFor="scheduledAt" className="text-xs uppercase text-muted-foreground">
                Créneau confirmé
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!scheduledAt || savingDate}
                  onClick={() =>
                    handleStatus("rdv_planifie", {
                      scheduledAt: new Date(scheduledAt).toISOString(),
                    })
                  }
                >
                  Marquer « RDV planifié »
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              className="text-destructive"
              disabled={savingDate}
              onClick={() =>
                handleStatus("annule", { cancelReason: "Annulé manuellement" })
              }
            >
              Annuler l'échéance
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setConfirmSendOpen(true)}
                disabled={!milestone.tutorEmail}
                title={
                  milestone.tutorEmail
                    ? "Ouvre l'écran de relecture avant envoi"
                    : "Aucun email de tuteur sur ce contrat"
                }
              >
                <Send className="mr-2 h-4 w-4" />
                {milestone.reminderCount > 0 ? "Relancer à nouveau…" : "Relancer le tuteur…"}
              </Button>
              <Button onClick={() => setReportOpen(true)}>Saisir le compte rendu</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FollowUpConfirmSendDialog
        milestone={milestone}
        open={confirmSendOpen}
        onOpenChange={setConfirmSendOpen}
        onSent={() => {
          setConfirmSendOpen(false);
          onChanged();
          onClose();
        }}
      />

      <FollowUpReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        milestone={milestone}
        onSaved={() => {
          onChanged();
          setReportOpen(false);
          onClose();
        }}
      />
    </>
  );
}
