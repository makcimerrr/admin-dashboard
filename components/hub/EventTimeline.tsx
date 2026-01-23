"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Pencil } from "lucide-react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface Assignment {
  id: string;
  userId: string;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  offsetDays: number;
  assignments: Assignment[];
}

interface EventTask {
  id: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  taskId: string;
  task: Task;
}

interface EventData {
  id: string;
  name: string;
  startDate: string;
  template: { id: string; name: string };
  eventTasks: EventTask[];
}

interface EventTimelineProps {
  eventId: string;
}

export default function EventTimeline({ eventId }: EventTimelineProps) {
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const res = await fetch(`/api/hub/events/${eventId}`);
        if (!res.ok) throw new Error("Event not found");
        const data = await res.json();
        setEvent(data);
      } catch (err) {
        console.error("Error loading event:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEvent();
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-2xl font-bold mb-4">Événement introuvable</h2>
        <Button onClick={() => router.push("/hub/events")}>Retour aux Événements</Button>
      </div>
    );
  }

  const getOffsetBadgeVariant = (days: number): "destructive" | "default" | "secondary" => {
    if (days < 0) return "destructive";
    if (days === 0) return "default";
    return "secondary";
  };

  const getOffsetLabel = (days: number) => {
    if (days === 0) return "J0";
    if (days < 0) return `J${days}`;
    return `J+${days}`;
  };

  const getStatusBadgeVariant = (status: EventTask["status"]): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "IN_PROGRESS":
        return "secondary";
      case "NOT_STARTED":
        return "outline";
    }
  };

  const getStatusLabel = (status: EventTask["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "Terminé";
      case "IN_PROGRESS":
        return "En cours";
      case "NOT_STARTED":
        return "À faire";
    }
  };

  // Sort event tasks by offset days
  const sortedEventTasks = [...(event.eventTasks || [])].sort(
    (a, b) => a.task.offsetDays - b.task.offsetDays
  );

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={() => router.push("/hub/events")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{event.name}</h1>
          <p className="text-muted-foreground">
            Modèle : {event.template.name} • Début :{" "}
            {format(new Date(event.startDate), "PPP", { locale: fr })}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/hub/events/${event.id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      </div>

      <div className="space-y-4 max-w-4xl">
        {sortedEventTasks.map((eventTask) => {
          const eventDate = addDays(new Date(event.startDate), eventTask.task.offsetDays);

          return (
            <Card key={eventTask.id} className="relative overflow-hidden">
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  eventTask.task.offsetDays < 0
                    ? "bg-red-500"
                    : eventTask.task.offsetDays === 0
                    ? "bg-primary"
                    : "bg-green-500"
                }`}
              />
              <CardHeader className="pl-6">
                <CardTitle className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={getOffsetBadgeVariant(eventTask.task.offsetDays)}>
                        {getOffsetLabel(eventTask.task.offsetDays)}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(eventTask.status)}>
                        {getStatusLabel(eventTask.status)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(eventDate, "EEEE d MMMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold">{eventTask.task.title}</h3>
                  </div>
                </CardTitle>
              </CardHeader>
              {eventTask.task.description && (
                <CardContent className="pl-6">
                  <p className="text-muted-foreground">{eventTask.task.description}</p>
                </CardContent>
              )}

              {eventTask.task.assignments?.length > 0 && (
                <CardContent className="pl-6 flex flex-wrap gap-2">
                  {eventTask.task.assignments.map((assignment) => (
                    <Badge
                      key={assignment.id}
                      variant="outline"
                      className="flex items-center gap-2 py-1 pr-3"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {assignment.userId.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {assignment.userId}
                    </Badge>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}

        {sortedEventTasks.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucune tâche dans le calendrier</h3>
              <p className="text-muted-foreground">Ce modèle n'a pas encore de tâches configurées.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
