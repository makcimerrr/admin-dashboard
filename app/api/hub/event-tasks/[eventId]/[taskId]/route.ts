import { NextResponse } from "next/server";
import { updateHubEventTaskStatus } from "@/lib/db/services/hub";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ eventId: string; taskId: string }> }
) {
  try {
    const { eventId, taskId } = await context.params;

    if (!eventId || !taskId) {
      return NextResponse.json(
        { error: "Event ID and Task ID are required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be NOT_STARTED, IN_PROGRESS, or COMPLETED" },
        { status: 400 }
      );
    }

    const result = await updateHubEventTaskStatus(eventId, taskId, status);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Event task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error("PATCH /api/hub/event-tasks error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
