import { NextResponse } from "next/server";
import { db } from "@/lib/db/config";
import { schedules } from "@/lib/db/schema/schedules";
import { eq, and } from "drizzle-orm";

// GET /api/schedules/absences?employeeId=...&type=...&start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const type = searchParams.get("type");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    // Récupérer tous les plannings (ou filtrer par employé si demandé)
    let where = undefined;
    if (employeeId) {
      where = eq(schedules.employeeId, employeeId);
    }
    const allSchedules = await db.select().from(schedules).where(where);

    // Extraire toutes les absences (type !== 'work')
    let absences = [];
    for (const sched of allSchedules) {
      for (const slot of sched.timeSlots) {
        if (slot.type !== "work") {
          absences.push({
            ...slot,
            employeeId: sched.employeeId,
            weekKey: sched.weekKey,
            day: sched.day,
            scheduleId: sched.id,
            slotId: slot.id,
          });
        }
      }
    }

    // Filtres supplémentaires
    if (type) {
      absences = absences.filter(a => a.type === type);
    }
    if (start) {
      absences = absences.filter(a => a.start >= start);
    }
    if (end) {
      absences = absences.filter(a => a.end <= end);
    }

    return NextResponse.json(absences);
  } catch (error) {
    console.error("Error fetching absences:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 