"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SubEvent {
  id?: string;
  title: string;
  description?: string;
  offsetDays: number;
  displayOrder?: number;
  assignedUsers?: string[];
}

interface TaskEditorProps {
  subEvent: SubEvent;
  onChange: (subEvent: SubEvent) => void;
  onDelete: () => void;
}

export const TaskEditor = ({
  subEvent,
  onChange,
  onDelete,
}: TaskEditorProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: subEvent.id ?? `temp-${subEvent.title}-${subEvent.offsetDays}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getOffsetLabel = (days: number) => {
    if (days === 0) return "J0 (Jour de l'événement)";
    if (days < 0) return `J${days} (${Math.abs(days)} jours avant)`;
    return `J+${days} (${days} jours après)`;
  };

  return (
    <Card ref={setNodeRef} style={style} className="border-2">
      <CardContent className="pt-6">
        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-4">
            <button
              className="cursor-grab active:cursor-grabbing mt-8 text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>

            <div className="flex-1 space-y-4">
              <div>
                <Label>Titre de la Tâche *</Label>
                <Input
                  value={subEvent.title}
                  onChange={(e) =>
                    onChange({ ...subEvent, title: e.target.value })
                  }
                  placeholder="ex: Préparer les ordinateurs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Décalage (jours depuis le début)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={subEvent.offsetDays}
                      onChange={(e) =>
                        onChange({
                          ...subEvent,
                          offsetDays: parseInt(e.target.value) || 0,
                        })
                      }
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[140px]">
                      {getOffsetLabel(subEvent.offsetDays)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={subEvent.description ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...subEvent,
                      description: e.target.value,
                    })
                  }
                  placeholder="Détails supplémentaires..."
                  rows={2}
                />
              </div>
            </div>

            <Button variant="outline" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
