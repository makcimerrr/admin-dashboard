"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TaskEditor } from "./TaskEditor";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface SubEvent {
  id?: string;
  title: string;
  description?: string;
  offsetDays: number;
  assignedUsers?: string[];
}

interface TemplateEditorProps {
  mode: "create" | "edit";
  id?: string;
}

export default function TemplateEditor({ mode, id }: TemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingTemplate, setLoadingTemplate] = useState(mode === "edit");

  const isNew = mode === "create";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isNew || !id) return;

    const load = async () => {
      try {
        setLoadingTemplate(true);
        const res = await fetch(`/api/hub/templates/${id}`);
        if (!res.ok) throw new Error(`Error loading template: ${res.status}`);

        const data = await res.json();
        setName(data.name);
        setDescription(data.description || "");

        const tasksWithAssignedUsers = (data.tasks || []).map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          offsetDays: task.offsetDays,
          assignedUsers: task.assignments?.map((a: any) => a.userId) || [],
        }));

        setSubEvents(tasksWithAssignedUsers);
      } catch (err) {
        console.error("Error fetching template:", err);
        toast.error("Impossible de charger le modèle");
      } finally {
        setLoadingTemplate(false);
      }
    };

    load();
  }, [id, isNew]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Veuillez entrer un nom de modèle");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          isNew ? "/api/hub/templates" : `/api/hub/templates/${id}`,
          {
            method: isNew ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              description,
              tasks: subEvents,
            }),
          }
        );

        if (!res.ok) {
          toast.error("Échec de l'enregistrement du modèle");
          return;
        }

        toast.success(
          isNew ? "Modèle créé avec succès" : "Modèle mis à jour avec succès"
        );
        router.push("/word-assistant/templates");
      } catch (err) {
        toast.error("Échec de l'enregistrement du modèle");
      }
    });
  };

  const addSubEvent = () => {
    setSubEvents([
      ...subEvents,
      {
        id: `temp-${Date.now()}`,
        title: "",
        offsetDays: 0,
      },
    ]);
  };

  const updateSubEvent = (index: number, updated: SubEvent) => {
    const copy = [...subEvents];
    copy[index] = updated;
    setSubEvents(copy);
  };

  const deleteSubEvent = (index: number) => {
    setSubEvents(subEvents.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSubEvents((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (!isNew && loadingTemplate) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Chargement du modèle</CardTitle>
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
        <Button variant="outline" onClick={() => router.push("/word_assistant/templates")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {isNew ? "Nouveau Modèle" : "Modifier le Modèle"}
          </h1>
          <p className="text-muted-foreground">
            {isNew
              ? "Créer un nouveau modèle d'événement"
              : "Mettre à jour votre modèle d'événement"}
          </p>
        </div>

        <Button onClick={handleSave} size="lg" disabled={isPending}>
          <Save className="mr-2 h-5 w-5" />
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Détails du Modèle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du Modèle</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Rentrée de promotion"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du modèle..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tâches</CardTitle>
            <Button onClick={addSubEvent} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une Tâche
            </Button>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={subEvents.map((s) => s.id ?? "")}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {subEvents.map((subEvent, index) => (
                    <TaskEditor
                      key={subEvent.id}
                      subEvent={subEvent}
                      onChange={(updated: SubEvent) => updateSubEvent(index, updated)}
                      onDelete={() => deleteSubEvent(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {subEvents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucune tâche pour le moment.</p>
                <p className="text-sm">Cliquez sur "Ajouter une Tâche" pour commencer.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
