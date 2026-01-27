"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
}

interface EventEditorProps {
  mode: "create" | "edit";
  id?: string;
}

export default function EventEditor({ mode, id }: EventEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingEvent, setLoadingEvent] = useState(mode === "edit");
  const [templates, setTemplates] = useState<Template[]>([]);

  const isNew = mode === "create";

  const [eventName, setEventName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Fetch templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch("/api/hub/templates");
        if (!res.ok) throw new Error("Failed to load templates");
        const data = await res.json();
        setTemplates(data);
      } catch (err) {
        console.error("Error loading templates:", err);
        toast.error("Impossible de charger les modèles");
      }
    };
    loadTemplates();
  }, []);

  // Fetch event if editing
  useEffect(() => {
    if (isNew || !id) return;

    const loadEvent = async () => {
      try {
        setLoadingEvent(true);
        const res = await fetch(`/api/hub/events/${id}`);
        if (!res.ok) throw new Error("Event fetch failed");

        const data = await res.json();
        setEventName(data.name);
        setStartDate(data.startDate.split("T")[0]);
        setSelectedTemplateId(data.templateId);
      } catch (err) {
        console.error("Error fetching event:", err);
        toast.error("Impossible de charger l'événement");
      } finally {
        setLoadingEvent(false);
      }
    };

    loadEvent();
  }, [id, isNew]);

  const handleSave = () => {
    if (!eventName.trim()) {
      toast.error("Veuillez entrer un nom d'événement");
      return;
    }
    if (!startDate) {
      toast.error("Veuillez sélectionner une date de début");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("Veuillez sélectionner un modèle");
      return;
    }

    startTransition(async () => {
      try {
        const url = isNew ? "/api/hub/events" : `/api/hub/events/${id}`;
        const method = isNew ? "POST" : "PUT";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: eventName,
            startDate,
            templateId: selectedTemplateId,
          }),
        });

        if (!res.ok) throw new Error("Save failed");

        const event = await res.json();
        toast.success(isNew ? "Événement créé avec succès" : "Événement mis à jour avec succès");
        router.push(`/word_assistant/events/${isNew ? event.id : id}`);
      } catch (err) {
        toast.error("Échec de l'enregistrement de l'événement");
      }
    });
  };

  if (!isNew && loadingEvent) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Chargement de l'événement
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {isNew ? "Nouvel Événement" : "Modifier l'Événement"}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? "Créer un nouvel événement basé sur un modèle" : "Mettre à jour votre événement"}
          </p>
        </div>

        <Button onClick={handleSave} size="lg" disabled={isPending}>
          <Save className="mr-2 h-5 w-5" />
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Détails de l'Événement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l'Événement</Label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Ex: Rentrée P2 2025"
              />
            </div>

            <div className="space-y-2">
              <Label>Date de Début</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Modèle</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Choisir un modèle --" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
