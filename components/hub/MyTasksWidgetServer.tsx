import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Clock, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { db } from "@/lib/db/config";
import { hubEvents, hubEventTasks, hubAssignments } from "@/lib/db/schema/hub";
import { eq, gte, or, ilike } from "drizzle-orm";
import { addDays } from "date-fns";
import { getStackSession } from "@/lib/stack-auth";

interface MyTask {
  id: string;
  title: string;
  eventName: string;
  eventId: string;
  date: Date;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}

/**
 * Extrait le prénom d'un displayName
 */
function extractFirstName(name: string | null | undefined): string | null {
  if (!name) return null;
  const parts = name.trim().split(/[\s.]+/);
  if (parts.length > 0 && parts[0]) {
    return parts[0].toLowerCase();
  }
  return null;
}

async function getMyTasks(userId: string, displayName?: string | null): Promise<MyTask[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const firstName = extractFirstName(displayName);

    // Get all assignments for this user (by userId OR by firstName match)
    let userAssignments;

    if (firstName) {
      // Rechercher par userId OU par prénom
      userAssignments = await db
        .select({ taskId: hubAssignments.taskId })
        .from(hubAssignments)
        .where(
          or(
            eq(hubAssignments.userId, userId),
            ilike(hubAssignments.userId, `%${firstName}%`)
          )
        );
    } else {
      userAssignments = await db
        .select({ taskId: hubAssignments.taskId })
        .from(hubAssignments)
        .where(eq(hubAssignments.userId, userId));
    }

    if (userAssignments.length === 0) {
      return [];
    }

    const taskIds = userAssignments.map((a) => a.taskId);

    // Get events with their tasks
    const events = await db.query.hubEvents.findMany({
      where: gte(hubEvents.startDate, today.toISOString().split("T")[0]),
      with: {
        eventTasks: {
          with: {
            task: true,
          },
        },
      },
    });

    // Build the task list
    const myTasks: MyTask[] = events.flatMap((event) =>
      event.eventTasks
        .filter((et) => taskIds.includes(et.taskId))
        .map((et) => {
          const eventDate = new Date(event.startDate);
          const taskDate = addDays(eventDate, et.task.offsetDays);

          return {
            id: `${event.id}-${et.taskId}`,
            title: et.task.title,
            eventName: event.name,
            eventId: event.id,
            date: taskDate,
            status: et.status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
          };
        })
    );

    // Sort by date
    myTasks.sort((a, b) => a.date.getTime() - b.date.getTime());

    return myTasks;
  } catch (err) {
    console.error("Error fetching my tasks:", err);
    return [];
  }
}

function getStatusIcon(status: MyTask["status"]) {
  switch (status) {
    case "COMPLETED":
      return <CheckSquare className="h-4 w-4 text-green-500" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4 text-orange-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusLabel(status: MyTask["status"]) {
  switch (status) {
    case "COMPLETED":
      return "Terminé";
    case "IN_PROGRESS":
      return "En cours";
    default:
      return "À faire";
  }
}

export async function MyTasksWidgetServer() {
  const session = await getStackSession();
  const userId = session?.user?.id;
  const displayName = session?.user?.display_name;

  let tasks: MyTask[] = [];
  if (userId) {
    tasks = await getMyTasks(userId, displayName);
  }

  const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED");

  if (!userId) {
    return (
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="h-5 w-5" />
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
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckSquare className="h-5 w-5" />
              Mes tâches
            </CardTitle>
            <CardDescription>
              {pendingTasks.length} tâche(s) en attente
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/word_assistant/calendar">
              Calendrier
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune tâche assignée</p>
        ) : (
          <div className="space-y-2">
            {pendingTasks.slice(0, 5).map((task) => (
              <Link
                key={task.id}
                href={`/word_assistant/events/${task.eventId}`}
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
                        {format(task.date, 'd MMM', { locale: fr })}
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
                href="/word_assistant/calendar"
                className="text-sm text-primary hover:underline block text-center pt-2"
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
