import { CalendarView, CalendarTask } from "@/components/hub/CalendarView";
import { getHubEvents } from "@/lib/db/services/hub";
import { db } from "@/lib/db/config";
import { employees } from "@/lib/db/schema/employees";
import { addDays } from "date-fns";

export default async function HubCalendarPage() {
  let calendarTasks: CalendarTask[] = [];

  try {
    // Fetch events and employees in parallel
    const [events, allEmployees] = await Promise.all([
      getHubEvents(),
      db.select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
      }).from(employees),
    ]);

    // Create a map for quick lookup
    const employeeMap = new Map(allEmployees.map((e) => [e.id, e]));

    // Transform events into calendar tasks
    calendarTasks = events.flatMap((event: any) => {
      if (!event.eventTasks) return [];

      return event.eventTasks.map((eventTask: any) => {
        const eventDate = new Date(event.startDate);
        const taskDate = addDays(eventDate, eventTask.task?.offsetDays || 0);

        // Map assignments to user info
        const assignedUsers = (eventTask.task?.assignments || []).map((a: any) => {
          const emp = employeeMap.get(a.userId);
          return {
            id: a.id,
            userId: a.userId,
            full_name: emp?.name || a.userId,
            email: emp?.email,
          };
        });

        return {
          id: `${event.id}-${eventTask.taskId}`,
          title: eventTask.task?.title || "Tâche sans titre",
          description: eventTask.task?.description,
          eventName: event.name,
          eventId: event.id,
          taskId: eventTask.taskId,
          status: eventTask.status,
          date: taskDate,
          assignedUsers,
        };
      });
    });
  } catch (err) {
    console.error("Error loading calendar data:", err);
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Calendrier des tâches</h1>
        <p className="text-muted-foreground">
          Vue calendrier de toutes les tâches planifiées
        </p>
      </div>

      <CalendarView tasks={calendarTasks} />
    </div>
  );
}
