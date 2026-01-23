"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Clock, Circle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MyTask {
  id: string;
  title: string;
  eventName: string;
  eventId: string;
  date: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}

interface MyTasksWidgetProps {
  userId?: string;
}

export function MyTasksWidget({ userId }: MyTasksWidgetProps) {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/hub/my-tasks?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (err) {
        console.error("Failed to load my tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [userId]);

  const getStatusIcon = (status: MyTask["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <CheckSquare className="h-4 w-4 text-green-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: MyTask["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "Terminé";
      case "IN_PROGRESS":
        return "En cours";
      default:
        return "À faire";
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4" />
            Mes tâches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4" />
            Mes tâches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour voir vos tâches assignées
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckSquare className="h-4 w-4" />
          Mes tâches
        </CardTitle>
        <CardDescription>
          {pendingTasks.length} tâche(s) en attente
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune tâche assignée
          </p>
        ) : (
          <div className="space-y-3">
            {pendingTasks.slice(0, 5).map((task) => (
              <Link
                key={task.id}
                href={`/app/(dashboard)/word_assistant/events/${task.eventId}`}
                className="block"
              >
                <div className="flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                  {getStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.eventName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(task.date), "d MMM", { locale: fr })}
                      </span>
                      <Badge variant="outline" className="text-xs py-0">
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {pendingTasks.length > 5 && (
              <Link
                href="/hub/calendar"
                className="text-sm text-primary hover:underline block text-center"
              >
                Voir toutes les tâches ({pendingTasks.length})
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
