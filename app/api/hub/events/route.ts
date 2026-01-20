import { NextResponse } from "next/server";
import { getHubEvents, createHubEvent } from "@/lib/db/services/hub";

export async function GET() {
  try {
    const events = await getHubEvents();
    return NextResponse.json(events);
  } catch (err) {
    console.error("GET /api/hub/events error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.templateId || !body.name || !body.startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event = await createHubEvent({
      templateId: body.templateId,
      name: body.name,
      startDate: body.startDate,
    });

    return NextResponse.json(event);
  } catch (err: any) {
    console.error("POST /api/hub/events error:", err);

    if (err.message === 'Template not found') {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
