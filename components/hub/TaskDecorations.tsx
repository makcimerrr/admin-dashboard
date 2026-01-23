"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { differenceInDays } from "date-fns";

// Minimal assignee shape expected by components that render users
export interface AssigneeUser {
  id: string;
  full_name?: string | null;
  userId?: string;
  email?: string;
}

// Canonical task status enum
export const TaskStatusEnum = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export type TaskStatus = (typeof TaskStatusEnum)[keyof typeof TaskStatusEnum];

// Compute a 2-letter initial string from a full name
export const getUserInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

// Return a deterministic background color class based on index
export const getAvatarColor = (index: number): string => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-fuchsia-500",
  ];
  return colors[index % colors.length];
};

// TaskStatusBadge - visual badge for task status
export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => {
  const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
    NOT_STARTED: {
      label: "À faire",
      className: "bg-muted text-muted-foreground border-border",
    },
    IN_PROGRESS: {
      label: "En cours",
      className: "bg-orange-500/20 text-orange-600 border-orange-500/40",
    },
    COMPLETED: {
      label: "Terminé",
      className: "bg-green-500/20 text-green-600 border-green-500/40",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={`${config.className} text-xs`}>
      {config.label}
    </Badge>
  );
};

// Infer task status based on date if not provided
export const getTaskStatus = (
  status: TaskStatus | undefined,
  taskDate: Date
): TaskStatus => {
  if (status) return status;

  const daysUntil = differenceInDays(taskDate, new Date());
  if (daysUntil <= 7 && daysUntil >= 0) return "IN_PROGRESS";
  return "NOT_STARTED";
};

// AssigneeAvatars - renders a compact row of Avatar components
export const AssigneeAvatars = ({ assignees }: { assignees: AssigneeUser[] }) => {
  if (!assignees || assignees.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {assignees.map((user, idx) => (
        <Avatar key={user.id || user.userId || idx} className={`h-7 w-7 ${getAvatarColor(idx)}`}>
          <AvatarFallback className="text-white text-xs font-semibold">
            {getUserInitials(user.full_name || user.userId || user.email || "??")}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
};
