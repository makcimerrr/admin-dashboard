import { NextResponse } from "next/server";
import { getHubTemplateById, updateHubTemplate, deleteHubTemplate } from "@/lib/db/services/hub";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Template ID missing" }, { status: 400 });
    }

    const template = await getHubTemplateById(id);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (err) {
    console.error("GET /api/hub/templates/[id] error:", err);
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
      return NextResponse.json({ error: "Template ID missing" }, { status: 400 });
    }

    const body = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const template = await updateHubTemplate(id, {
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
    console.error("PUT /api/hub/templates/[id] error:", err);
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
      return NextResponse.json({ error: "Template ID missing" }, { status: 400 });
    }

    await deleteHubTemplate(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/hub/templates/[id] error:", err);

    // Check if the error is due to foreign key constraint (template in use)
    if (err.code === '23503') {
      return NextResponse.json(
        { error: "Ce modèle est utilisé par des événements et ne peut pas être supprimé" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
