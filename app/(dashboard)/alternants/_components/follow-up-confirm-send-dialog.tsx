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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import type { ApiEnvelope, FollowUpMilestone } from "../types";

interface Prepared {
  to: string | null;
  subject: string;
  body: string;
  mailerConfigured: boolean;
  bookingUrlConfigured: boolean;
  remindersSent: number;
}

/**
 * Confirmation humaine avant tout envoi à une entreprise partenaire.
 *
 * C'est le SEUL chemin par lequel un mail peut partir : on relit le message
 * (modifiable), on voit le destinataire réel, et on confirme. Aucun cron, aucun
 * automatisme ne court-circuite cet écran.
 */
export function FollowUpConfirmSendDialog({
  milestone,
  open,
  onOpenChange,
  onSent,
}: {
  milestone: FollowUpMilestone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !milestone) {
      setPrepared(null);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/follow-ups/${milestone.id}/remind`);
      const json = (await res.json()) as ApiEnvelope<Prepared>;
      if (json.success) {
        setPrepared(json.data);
        setSubject(json.data.subject);
        setBody(json.data.body);
      } else {
        toast.error(json.error?.message ?? "Impossible de préparer le mail");
        onOpenChange(false);
      }
    })();
  }, [open, milestone, onOpenChange]);

  if (!milestone) return null;

  const handleConfirm = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/follow-ups/${milestone.id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Mail envoyé à ${json.data.to}`);
        onSent();
      } else {
        toast.error(json.error?.message ?? "L'envoi a échoué");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSending(false);
    }
  };

  const blocked = !prepared?.mailerConfigured || !prepared?.to;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmer l'envoi au tuteur</DialogTitle>
          <DialogDescription>
            Ce mail partira réellement chez {milestone.companyName}. Relisez-le — vous
            pouvez le modifier avant de confirmer.
          </DialogDescription>
        </DialogHeader>

        {!prepared ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {!prepared.to && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>
                  Aucun email de tuteur sur ce contrat. Complétez la fiche avant de
                  pouvoir relancer.
                </span>
              </div>
            )}

            {!prepared.mailerConfigured && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  SMTP non configuré côté serveur : l'envoi est impossible pour l'instant.
                </span>
              </div>
            )}

            {!prepared.bookingUrlConfigured && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
                Aucun lien de réservation configuré : le mail ne proposera pas de créneau.
                À renseigner dans la configuration du module.
              </div>
            )}

            {prepared.remindersSent > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs">
                {prepared.remindersSent} relance{prepared.remindersSent > 1 ? "s" : ""} déjà
                envoyée{prepared.remindersSent > 1 ? "s" : ""} pour cette échéance
                {milestone.lastReminderAt &&
                  ` (dernière le ${new Date(milestone.lastReminderAt).toLocaleDateString("fr-FR")})`}
                .
              </div>
            )}

            <div className="space-y-2">
              <Label>Destinataire</Label>
              <Input value={prepared.to ?? "—"} readOnly className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-subject">Objet</Label>
              <Input
                id="confirm-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-body">Message</Label>
              <Textarea
                id="confirm-body"
                rows={16}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-sans text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={sending || blocked || !subject.trim() || !body.trim()}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Confirmer et envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
