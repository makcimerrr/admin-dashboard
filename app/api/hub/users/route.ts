import { NextResponse } from "next/server";
import { db } from "@/lib/db/config";
import { employees } from "@/lib/db/schema/employees";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        initial: employees.initial,
      })
      .from(employees)
      .where(eq(employees.isActive, true));

    return NextResponse.json(allEmployees);
  } catch (err) {
    console.error("GET /api/hub/users error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
