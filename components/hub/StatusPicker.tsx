"use client";

import { useState } from "react";
import { TaskStatus } from "./TaskDecorations";
import { Button } from "@/components/ui/button";
import { Check, Clock, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarTask {
  id: string;
  title: string;
  status: TaskStatus;
  eventId: string;
  taskId: string;
}

interface StatusPickerProps {
  task: CalendarTask;
  onStatusChange: (status: TaskStatus) => Promise<void>;
}

const statuses: { label: string; value: TaskStatus; icon: typeof Check; color: string }[] = [
  { label: "À faire", value: "NOT_STARTED", icon: Circle, color: "text-muted-foreground" },
  { label: "En cours", value: "IN_PROGRESS", icon: Clock, color: "text-orange-500" },
  { label: "Terminé", value: "COMPLETED", icon: Check, color: "text-green-500" },
];

export const StatusPicker = ({ task, onStatusChange }: StatusPickerProps) => {
  const [loading, setLoading] = useState<TaskStatus | null>(null);

  const handleClick = async (status: TaskStatus) => {
    if (status === task.status) return;

    setLoading(status);
    try {
      await onStatusChange(status);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Changer le statut</p>
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => {
          const Icon = s.icon;
          const isActive = task.status === s.value;
          const isLoading = loading === s.value;

          return (
            <Button
              key={s.value}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              disabled={loading !== null}
              onClick={() => handleClick(s.value)}
              className={cn(
                "flex items-center gap-2",
                isActive && "ring-2 ring-offset-2 ring-primary"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className={cn("h-4 w-4", !isActive && s.color)} />
              )}
              {s.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
