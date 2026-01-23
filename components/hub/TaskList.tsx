"use client";

import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TaskStatusBadge,
  AssigneeAvatars,
  getTaskStatus,
  TaskStatus,
  AssigneeUser,
} from "./TaskDecorations";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  date: string | Date | null;
  eventName: string;
  status: TaskStatus;
  assignedUsers?: AssigneeUser[];
};

function getRelativeTime(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const days = differenceInDays(dateObj, new Date());

  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days > 0) return `Dans ${days} jours`;
  return `Il y a ${Math.abs(days)} jours`;
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const taskDate = task.date
          ? typeof task.date === "string"
            ? new Date(task.date)
            : task.date
          : null;
        const computedStatus = taskDate
          ? getTaskStatus(task.status, taskDate)
          : task.status;

        return (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              task.status === "COMPLETED" ? "bg-muted/30 text-muted-foreground" : ""
            }`}
          >
            <Checkbox checked={task.status === "COMPLETED"} disabled />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p
                  className={`font-medium truncate ${
                    task.status === "COMPLETED" ? "line-through" : ""
                  }`}
                >
                  {task.title}
                </p>
                {taskDate && <TaskStatusBadge status={computedStatus} />}
              </div>

              <p className="text-sm text-muted-foreground">{task.eventName}</p>

              {taskDate && (
                <p className="text-xs text-muted-foreground">
                  {format(taskDate, "d MMM yyyy", { locale: fr })} •{" "}
                  {getRelativeTime(taskDate)}
                </p>
              )}

              {task.assignedUsers && task.assignedUsers.length > 0 && (
                <div className="mt-2">
                  <AssigneeAvatars assignees={task.assignedUsers} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
