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
import { AlertTriangle, Check, Copy, Loader2, Mail } from "lucide-react";
import type { ApiEnvelope, FollowUpMilestone } from "../types";

interface Prepared {
  to: string | null;
  subject: string;
  body: string;
  bookingUrlConfigured: boolean;
  remindersSent: number;
}

/**
 * Certaines messageries tronquent les `mailto:` longs. Au-delà de ce seuil on
 * le dit, et le bouton « Copier » devient la voie sûre.
 */
const MAILTO_SAFE_LENGTH = 1800;

/**
 * Préparation d'une relance, envoyée depuis la messagerie de l'utilisateur.
 *
 * Le hub n'envoie aucun mail : il compose le message (modifiable), l'ouvre dans
 * la messagerie via `mailto:`, puis enregistre la relance quand l'utilisateur
 * déclare l'avoir envoyée. Le mail part donc de sa boîte réelle — les réponses
 * du tuteur lui reviennent directement, au lieu de se perdre dans une adresse
 * technique.
 *
 * Les deux gestes sont volontairement distincts : ouvrir ne prouve pas qu'on a
 * envoyé, et la trace ne doit refléter que ce qui a vraiment été fait.
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
  const [recording, setRecording] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!open || !milestone) {
      setPrepared(null);
      setOpened(false);
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

  const mailtoHref = prepared?.to
    ? `mailto:${encodeURIComponent(prepared.to)}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`
    : "";

  const handleOpenMailClient = () => {
    window.location.href = mailtoHref;
    setOpened(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      toast.success("Message copié");
      setOpened(true);
    } catch {
      toast.error("Copie impossible — sélectionnez le texte à la main");
    }
  };

  /** Enregistre la relance : c'est une déclaration, pas un accusé technique. */
  const handleRecord = async () => {
    setRecording(true);
    try {
      const res = await fetch(`/api/follow-ups/${milestone.id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Relance enregistrée pour ${json.data.to}`);
        onSent();
      } else {
        toast.error(json.error?.message ?? "L'enregistrement a échoué");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRecording(false);
    }
  };

  const blocked = !prepared?.to;
  const tooLongForMailto = mailtoHref.length > MAILTO_SAFE_LENGTH;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmer l'envoi au tuteur</DialogTitle>
          <DialogDescription>
            Relisez et modifiez le message, ouvrez-le dans votre messagerie, envoyez-le
            depuis votre boîte — puis enregistrez la relance ici. Le hub n'envoie rien
            lui-même : les réponses de {milestone.companyName} vous reviendront
            directement.
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

            {tooLongForMailto && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  Message long : certaines messageries tronquent les liens
                  <code className="mx-1">mailto:</code>. Préférez « Copier le message »
                  et collez-le dans un mail vierge.
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

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={recording}>
            Fermer
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleCopy} disabled={blocked}>
              <Copy className="mr-2 h-4 w-4" />
              Copier le message
            </Button>

            <Button
              variant={opened ? "outline" : "default"}
              onClick={handleOpenMailClient}
              disabled={blocked || !subject.trim() || !body.trim()}
            >
              <Mail className="mr-2 h-4 w-4" />
              Ouvrir dans ma messagerie
            </Button>

            {/* Geste distinct : ouvrir ne prouve pas qu'on a envoyé. La trace
                ne doit refléter que ce qui a réellement été fait. */}
            <Button
              onClick={handleRecord}
              disabled={recording || blocked || !opened}
              title={
                opened
                  ? "Enregistre la relance et passe l'échéance en « relance envoyée »"
                  : "Ouvrez d'abord le mail dans votre messagerie"
              }
            >
              {recording ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              J'ai envoyé le mail
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
