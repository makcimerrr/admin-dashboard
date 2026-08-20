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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { ApiEnvelope, FollowUpMilestoneType, FollowUpSettings } from "../types";

interface SettingsPayload {
  settings: FollowUpSettings;
  defaults: { subject: string; body: string; variables: string[] };
  integrations: { calendarConfigured: boolean };
}

/**
 * Configuration du module : jalons (périodes ÉDITABLES), délais de relance,
 * lien de réservation et modèle de mail.
 *
 * Rien n'est figé dans le code : modifier un jalon relance immédiatement le
 * recalcul des échéances de tous les contrats.
 */
export function FollowUpSettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [types, setTypes] = useState<FollowUpMilestoneType[]>([]);
  const [form, setForm] = useState<Partial<FollowUpSettings>>({});
  const [saving, setSaving] = useState(false);
  const [newType, setNewType] = useState({ code: "", label: "", offsetMonths: "" });

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [settingsRes, typesRes] = await Promise.all([
        fetch("/api/follow-ups/settings"),
        fetch("/api/follow-ups/milestone-types"),
      ]);
      const settingsJson = (await settingsRes.json()) as ApiEnvelope<SettingsPayload>;
      const typesJson = (await typesRes.json()) as ApiEnvelope<{
        types: FollowUpMilestoneType[];
      }>;
      if (settingsJson.success) {
        setPayload(settingsJson.data);
        setForm(settingsJson.data.settings);
      }
      if (typesJson.success) setTypes(typesJson.data.types);
    })();
  }, [open]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/follow-ups/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Réglages enregistrés");
        onSaved();
      } else {
        toast.error(json.error?.message ?? "L'enregistrement a échoué");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const saveType = async (type: {
    code: string;
    label: string;
    offsetMonths: number;
    isActive?: boolean;
  }) => {
    const res = await fetch("/api/follow-ups/milestone-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type),
    });
    const json = await res.json();
    if (json.success) {
      const { created, cancelled, restored } = json.data.reconciled;
      toast.success(
        `Jalon enregistré — ${created} échéance(s) créée(s), ${cancelled} annulée(s), ${restored} rouverte(s)`,
      );
      const typesRes = await fetch("/api/follow-ups/milestone-types");
      const typesJson = (await typesRes.json()) as ApiEnvelope<{
        types: FollowUpMilestoneType[];
      }>;
      if (typesJson.success) setTypes(typesJson.data.types);
      onSaved();
    } else {
      toast.error(json.error?.message ?? "Échec de l'enregistrement du jalon");
    }
  };

  const deactivateType = async (code: string) => {
    const res = await fetch(`/api/follow-ups/milestone-types/${code}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success(`Jalon ${code} désactivé`);
      setTypes((prev) => prev.map((t) => (t.code === code ? { ...t, isActive: false } : t)));
      onSaved();
    } else {
      toast.error(json.error?.message ?? "Échec de la désactivation");
    }
  };

  const addType = async () => {
    const offset = Number(newType.offsetMonths);
    if (!newType.code.trim() || !newType.label.trim() || !Number.isInteger(offset) || offset < 1) {
      toast.error("Code, libellé et nombre de mois (entier ≥ 1) sont requis");
      return;
    }
    await saveType({
      code: newType.code.trim().toUpperCase(),
      label: newType.label.trim(),
      offsetMonths: offset,
    });
    setNewType({ code: "", label: "", offsetMonths: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuration du suivi en entreprise</DialogTitle>
          <DialogDescription>
            Jalons, délais de relance et modèle de mail. Toute modification de jalon
            recalcule immédiatement les échéances des contrats existants.
          </DialogDescription>
        </DialogHeader>

        {!payload ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="jalons">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="jalons">Jalons</TabsTrigger>
              <TabsTrigger value="relances">Relances</TabsTrigger>
              <TabsTrigger value="mail">Modèle de mail</TabsTrigger>
            </TabsList>

            {/* ── Jalons ─────────────────────────────────────────────── */}
            <TabsContent value="jalons" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Les périodes se comptent depuis la date de début de contrat. Un jalon qui
                dépasserait la fin du contrat n'est pas posé.
              </p>

              <div className="space-y-2">
                {types.map((t) => (
                  <div
                    key={t.code}
                    className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
                  >
                    <Badge variant="outline" className="font-mono">
                      {t.code}
                    </Badge>
                    <Input
                      className="w-40"
                      value={t.label}
                      onChange={(e) =>
                        setTypes((prev) =>
                          prev.map((x) =>
                            x.code === t.code ? { ...x, label: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        className="w-20"
                        value={t.offsetMonths}
                        onChange={(e) =>
                          setTypes((prev) =>
                            prev.map((x) =>
                              x.code === t.code
                                ? { ...x, offsetMonths: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                      <span className="text-sm text-muted-foreground">mois</span>
                    </div>
                    {!t.isActive && (
                      <Badge variant="outline" className="text-muted-foreground">
                        désactivé
                      </Badge>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          saveType({
                            code: t.code,
                            label: t.label,
                            offsetMonths: t.offsetMonths,
                            isActive: true,
                          })
                        }
                      >
                        Enregistrer
                      </Button>
                      {t.isActive && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          title="Désactiver ce jalon"
                          onClick={() => deactivateType(t.code)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Ajouter un jalon</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Code (ex. M30)"
                    className="w-36"
                    value={newType.code}
                    onChange={(e) => setNewType({ ...newType, code: e.target.value })}
                  />
                  <Input
                    placeholder="Libellé (ex. 30 mois)"
                    className="w-44"
                    value={newType.label}
                    onChange={(e) => setNewType({ ...newType, label: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    placeholder="Mois"
                    className="w-24"
                    value={newType.offsetMonths}
                    onChange={(e) => setNewType({ ...newType, offsetMonths: e.target.value })}
                  />
                  <Button onClick={addType} variant="outline">
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ── Relances ───────────────────────────────────────────── */}
            <TabsContent value="relances" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="internalAlertLeadDays">Alerte interne (jours avant)</Label>
                  <Input
                    id="internalAlertLeadDays"
                    type="number"
                    min={0}
                    max={365}
                    value={form.internalAlertLeadDays ?? 30}
                    onChange={(e) =>
                      setForm({ ...form, internalAlertLeadDays: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminderLeadDays">Mail au tuteur (jours avant)</Label>
                  <Input
                    id="reminderLeadDays"
                    type="number"
                    min={0}
                    max={365}
                    value={form.reminderLeadDays ?? 21}
                    onChange={(e) =>
                      setForm({ ...form, reminderLeadDays: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondReminderAfterDays">2e relance après (jours)</Label>
                  <Input
                    id="secondReminderAfterDays"
                    type="number"
                    min={0}
                    max={365}
                    value={form.secondReminderAfterDays ?? 10}
                    onChange={(e) =>
                      setForm({ ...form, secondReminderAfterDays: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minDaysBeforeContractEnd">
                  Marge minimale avant la fin de contrat (jours)
                </Label>
                <Input
                  id="minDaysBeforeContractEnd"
                  type="number"
                  min={0}
                  max={365}
                  className="w-40"
                  value={form.minDaysBeforeContractEnd ?? 30}
                  onChange={(e) =>
                    setForm({ ...form, minDaysBeforeContractEnd: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Un jalon qui tomberait moins de X jours avant la fin du contrat n'est pas
                  posé : on n'organise pas une visite en entreprise pour un apprenant qui
                  s'en va. Les jalons au-delà de la fin de contrat ne le sont jamais non plus
                  (un point « 18 mois » sur un contrat d'un an).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookingUrl">Lien de réservation (agenda)</Label>
                <Input
                  id="bookingUrl"
                  placeholder="https://calendar.app.google/..."
                  value={form.bookingUrl ?? ""}
                  onChange={(e) => setForm({ ...form, bookingUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Injecté dans le mail via la variable <code>{"{{lien_rdv}}"}</code>.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="watchedCalendarId">Agenda surveillé (détection des RDV)</Label>
                <Input
                  id="watchedCalendarId"
                  placeholder="bastien@zone01normandie.org"
                  value={form.watchedCalendarId ?? ""}
                  onChange={(e) => setForm({ ...form, watchedCalendarId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {payload.integrations.calendarConfigured
                    ? "Google Calendar est configuré : les créneaux réservés basculent automatiquement en « RDV planifié »."
                    : "Google Calendar n'est pas configuré côté serveur — la détection automatique est inactive."}
                </p>
              </div>

              <Separator />

              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
                <p className="font-medium">Le hub n'envoie aucun mail</p>
                <p className="text-xs text-muted-foreground">
                  Les délais ci-dessus déterminent uniquement <em>quand</em> une relance
                  vous est proposée. Le message est préparé puis ouvert dans votre
                  messagerie : vous l'envoyez depuis votre propre boîte, et les réponses
                  du tuteur vous reviennent directement.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <div>
                  <Label htmlFor="teamsAlertsEnabled">Digest Teams</Label>
                  <p className="text-xs text-muted-foreground">
                    Récapitulatif quotidien des retards et échéances proches sur Teams.
                  </p>
                </div>
                <Switch
                  id="teamsAlertsEnabled"
                  checked={form.teamsAlertsEnabled ?? true}
                  onCheckedChange={(v) => setForm({ ...form, teamsAlertsEnabled: v })}
                />
              </div>
            </TabsContent>

            {/* ── Modèle de mail ─────────────────────────────────────── */}
            <TabsContent value="mail" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="senderName">Signature du mail</Label>
                  <Input
                    id="senderName"
                    placeholder="Bastien — Zone01 Normandie"
                    value={form.senderName ?? ""}
                    onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">Adresse de contact citée dans le mail</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={form.senderEmail ?? ""}
                    onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailSubjectTemplate">Objet</Label>
                <Input
                  id="emailSubjectTemplate"
                  placeholder={payload.defaults.subject}
                  value={form.emailSubjectTemplate ?? ""}
                  onChange={(e) => setForm({ ...form, emailSubjectTemplate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailBodyTemplate">Corps du message</Label>
                <Textarea
                  id="emailBodyTemplate"
                  rows={14}
                  placeholder={payload.defaults.body}
                  value={form.emailBodyTemplate ?? ""}
                  onChange={(e) => setForm({ ...form, emailBodyTemplate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Laisser vide pour utiliser le modèle par défaut. Variables disponibles :{" "}
                  {payload.defaults.variables.map((v) => (
                    <code key={v} className="mr-1">
                      {v}
                    </code>
                  ))}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={saveSettings} disabled={saving || !payload}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer les réglages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
