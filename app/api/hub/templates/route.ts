import { NextResponse } from "next/server";
import { getHubTemplates, createHubTemplate } from "@/lib/db/services/hub";

export async function GET() {
  try {
    const templates = await getHubTemplates();
    return NextResponse.json(templates);
  } catch (err) {
    console.error("GET /api/hub/templates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const template = await createHubTemplate({
      name: body.name,
      description: body.description,
      tasks: body.tasks?.map((t: any) => ({
        title: t.title,
        description: t.description,
        offsetDays: t.offsetDays ?? 0,
        assignedUsers: t.assignedUsers,
      })),
    });

    return NextResponse.json(template);
  } catch (err) {
    console.error("POST /api/hub/templates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
