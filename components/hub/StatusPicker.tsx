"use client";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { TaskStatusBadge, TaskStatus } from "./TaskDecorations";
import { toast } from "sonner";

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

export const StatusPicker = ({ task, onStatusChange }: StatusPickerProps) => {
  const statuses: { label: string; value: TaskStatus }[] = [
    { label: "À faire", value: "NOT_STARTED" },
    { label: "En cours", value: "IN_PROGRESS" },
    { label: "Terminé", value: "COMPLETED" },
  ];

  const handleClick = async (status: TaskStatus) => {
    try {
      await onStatusChange(status);
    } catch {
      toast.error("Impossible de mettre à jour le statut");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer" aria-label={`Statut : ${task.status}`}>
          <TaskStatusBadge status={task.status} />
        </div>
      </PopoverTrigger>

      <PopoverContent className="flex flex-col p-2 space-y-1 w-auto">
        {statuses.map((s) => (
          <button
            key={s.value}
            type="button"
            className={`text-left px-3 py-1.5 rounded hover:bg-accent/20 text-sm ${
              task.status === s.value ? "font-bold bg-accent/10" : ""
            }`}
            onClick={() => handleClick(s.value)}
            aria-pressed={task.status === s.value}
          >
            {s.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};
