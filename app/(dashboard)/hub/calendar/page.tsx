import { CalendarView, CalendarTask } from "@/components/hub/CalendarView";
import { getHubEvents } from "@/lib/db/services/hub";
import { addDays } from "date-fns";

export default async function HubCalendarPage() {
  let calendarTasks: CalendarTask[] = [];

  try {
    const events = await getHubEvents();

    // Transform events into calendar tasks
    calendarTasks = events.flatMap((event: any) => {
      if (!event.eventTasks) return [];

      return event.eventTasks.map((eventTask: any) => {
        const eventDate = new Date(event.startDate);
        const taskDate = addDays(eventDate, eventTask.task?.offsetDays || 0);

        return {
          id: `${event.id}-${eventTask.taskId}`,
          title: eventTask.task?.title || "Tâche sans titre",
          description: eventTask.task?.description,
          eventName: event.name,
          eventId: event.id,
          taskId: eventTask.taskId,
          status: eventTask.status,
          date: taskDate,
          assignedUsers: eventTask.task?.assignments?.map((a: any) => ({
            id: a.id,
            userId: a.userId,
            full_name: a.userId,
          })) || [],
        };
      });
    });
  } catch (err) {
    console.error("Error loading calendar data:", err);
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendrier des tâches</h1>
        <p className="text-muted-foreground">
          Vue calendrier de toutes les tâches planifiées
        </p>
      </div>

      <CalendarView tasks={calendarTasks} />
    </div>
  );
}
