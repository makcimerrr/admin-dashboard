"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Clock, Ellipsis } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { AssigneeAvatars, TaskStatus, AssigneeUser } from "./TaskDecorations";
import { StatusPicker } from "./StatusPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export interface CalendarTask {
  id: string;
  title: string;
  description?: string | null;
  eventName: string;
  eventId: string;
  taskId: string;
  status: TaskStatus;
  date: Date;
  assignedUsers?: AssigneeUser[];
}

interface CalendarViewProps {
  tasks: CalendarTask[];
}

export const CalendarView = ({ tasks }: CalendarViewProps) => {
  const [tasksState, setTasks] = useState<CalendarTask[]>(tasks);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getTasksForDay = (day: Date) =>
    tasksState.filter((task) => isSameDay(task.date, day));

  const handleStatusChange = async (task: CalendarTask, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/hub/event-tasks/${task.eventId}/${task.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");

      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Impossible de mettre à jour le statut");
    }
  };

  const getTaskStyle = (status: TaskStatus) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/15 text-green-600 line-through";
      case "IN_PROGRESS":
        return "bg-orange-500/15 text-orange-600";
      case "NOT_STARTED":
      default:
        return "bg-muted/60 text-muted-foreground";
    }
  };

  const getTaskIcon = (status: TaskStatus) => {
    switch (status) {
      case "COMPLETED":
        return <Check className="h-3 w-3" />;
      case "IN_PROGRESS":
        return <Clock className="h-3 w-3" />;
      case "NOT_STARTED":
      default:
        return <Ellipsis className="h-3 w-3" />;
    }
  };

  return (
    <>
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[200px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-sm text-muted-foreground p-2"
              >
                {day}
              </div>
            ))}

            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}

            {calendarDays.map((day) => {
              const dayTasks = getTasksForDay(day);
              const isToday = isSameDay(day, new Date());
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] p-2 border rounded-lg ${
                    isToday
                      ? "border-primary bg-primary/5"
                      : isPast
                      ? "border-border/50 bg-muted/20"
                      : "border-border"
                  } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}
                >
                  <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 2).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`w-full text-left text-xs p-1 rounded truncate flex items-center gap-1 ${getTaskStyle(
                          task.status
                        )}`}
                      >
                        {getTaskIcon(task.status)}
                        <span className="truncate">{task.title}</span>
                      </button>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayTasks.length - 2} autre(s)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {selectedTask && getTaskIcon(selectedTask.status)}
              <span
                className={
                  selectedTask?.status === "COMPLETED"
                    ? "line-through text-muted-foreground"
                    : ""
                }
              >
                {selectedTask?.title}
              </span>
            </DialogTitle>
            <CardDescription>
              {selectedTask && format(selectedTask.date, "PPP", { locale: fr })}
            </CardDescription>
          </DialogHeader>

          {selectedTask && (
            <StatusPicker
              task={selectedTask}
              onStatusChange={(newStatus) => handleStatusChange(selectedTask, newStatus)}
            />
          )}

          <div>
            <p className="text-sm font-medium text-muted-foreground">Événement</p>
            <p className="text-base">{selectedTask?.eventName}</p>
          </div>

          {selectedTask?.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-base">{selectedTask.description}</p>
            </div>
          )}

          {selectedTask?.assignedUsers && selectedTask.assignedUsers.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Assigné à
              </p>
              <AssigneeAvatars assignees={selectedTask.assignedUsers} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
