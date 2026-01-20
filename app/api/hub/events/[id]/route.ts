import { NextResponse } from "next/server";
import { getHubEventById, updateHubEvent, deleteHubEvent } from "@/lib/db/services/hub";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Event ID missing" }, { status: 400 });
    }

    const event = await getHubEventById(id);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (err) {
    console.error("GET /api/hub/events/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Event ID missing" }, { status: 400 });
    }

    const body = await req.json();

    if (!body.name || !body.startDate || !body.templateId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event = await updateHubEvent(id, {
      name: body.name,
      startDate: body.startDate,
      templateId: body.templateId,
    });

    return NextResponse.json(event);
  } catch (err: any) {
    console.error("PUT /api/hub/events/[id] error:", err);

    if (err.message === 'Event not found') {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Event ID missing" }, { status: 400 });
    }

    await deleteHubEvent(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/hub/events/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
