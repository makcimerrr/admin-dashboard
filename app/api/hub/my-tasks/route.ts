import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/config";
import { hubEvents, hubEventTasks, hubTasks, hubAssignments } from "@/lib/db/schema/hub";
import { eq, and, ne, gte, or, ilike, sql } from "drizzle-orm";
import { addDays } from "date-fns";

/**
 * Extrait le prénom d'un displayName ou userId
 * Exemples: "Maxime Dubois" -> "maxime", "maxime.dubois" -> "maxime"
 */
function extractFirstName(name: string | null | undefined): string | null {
  if (!name) return null;
  // Si c'est un nom complet "Prénom Nom", prendre le prénom
  const parts = name.trim().split(/[\s.]+/);
  if (parts.length > 0 && parts[0]) {
    return parts[0].toLowerCase();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const displayName = searchParams.get("displayName");

    if (!userId && !displayName) {
      return NextResponse.json(
        { error: "userId or displayName is required" },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Construire les conditions de recherche
    // 1. Chercher par userId exact
    // 2. OU chercher par prénom (si displayName fourni)
    const firstName = extractFirstName(displayName);

    let userAssignments;

    if (userId && firstName) {
      // Rechercher par userId OU par prénom contenu dans userId
      userAssignments = await db
        .select({ taskId: hubAssignments.taskId })
        .from(hubAssignments)
        .where(
          or(
            eq(hubAssignments.userId, userId),
            ilike(hubAssignments.userId, `%${firstName}%`)
          )
        );
    } else if (userId) {
      // Rechercher uniquement par userId
      userAssignments = await db
        .select({ taskId: hubAssignments.taskId })
        .from(hubAssignments)
        .where(eq(hubAssignments.userId, userId));
    } else if (firstName) {
      // Rechercher uniquement par prénom
      userAssignments = await db
        .select({ taskId: hubAssignments.taskId })
        .from(hubAssignments)
        .where(ilike(hubAssignments.userId, `%${firstName}%`));
    } else {
      return NextResponse.json([]);
    }

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
