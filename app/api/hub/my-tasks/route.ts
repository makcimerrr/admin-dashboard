import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/config";
import { hubEvents, hubEventTasks, hubTasks, hubAssignments } from "@/lib/db/schema/hub";
import { eq, and, ne, gte } from "drizzle-orm";
import { addDays } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all assignments for this user
    const userAssignments = await db
      .select({ taskId: hubAssignments.taskId })
      .from(hubAssignments)
      .where(eq(hubAssignments.userId, userId));

    if (userAssignments.length === 0) {
      return NextResponse.json([]);
    }

    const taskIds = userAssignments.map((a) => a.taskId);

    // Get events with their tasks that are assigned to this user
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
    const myTasks = events.flatMap((event) =>
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
            date: taskDate.toISOString(),
            status: et.status,
          };
        })
    );

    // Sort by date
    myTasks.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json(myTasks);
  } catch (err) {
    console.error("GET /api/hub/my-tasks error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
