import { NextResponse } from "next/server"
import { db } from "@/lib/db/config"
import { schedules } from "@/lib/db/schema/schedules"
import { eq, and } from "drizzle-orm"
import { timeSlotSchema } from "@/lib/db/schema/schedules"

// GET /api/schedules?weekKey=2024-W1
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekKey = searchParams.get("weekKey")

    if (!weekKey) {
      return NextResponse.json({ error: "Week key is required" }, { status: 400 })
    }

    const schedulesData = await db
      .select()
      .from(schedules)
      .where(eq(schedules.weekKey, weekKey))

    return NextResponse.json(schedulesData)
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// POST /api/schedules
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, weekKey, day, timeSlots } = body

    // Valider les créneaux horaires
    const validatedTimeSlots = timeSlots.map((slot: any) => timeSlotSchema.parse(slot))

    // Vérifier si un planning existe déjà pour cet employé, cette semaine et ce jour
    const existingSchedule = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.employeeId, employeeId),
          eq(schedules.weekKey, weekKey),
          eq(schedules.day, day)
        )
      )
      .limit(1)
      .then((results) => results[0])

    if (existingSchedule) {
      // Mettre à jour le planning existant
      const [updatedSchedule] = await db
        .update(schedules)
        .set({
          timeSlots: validatedTimeSlots,
          updatedAt: new Date(),
        })
        .where(eq(schedules.id, existingSchedule.id))
        .returning()

      return NextResponse.json(updatedSchedule)
    } else {
      // Créer un nouveau planning
      const [newSchedule] = await db
        .insert(schedules)
        .values({
          employeeId,
          weekKey,
          day,
          timeSlots: validatedTimeSlots,
        })
        .returning()

      return NextResponse.json(newSchedule)
    }
  } catch (error) {
    console.error("Error creating/updating schedule:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// DELETE /api/schedules?employeeId=123&weekKey=2024-W1&day=monday
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const weekKey = searchParams.get("weekKey")
    const day = searchParams.get("day")

    if (!employeeId || !weekKey || !day) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    await db
      .delete(schedules)
      .where(
        and(
          eq(schedules.employeeId, employeeId),
          eq(schedules.weekKey, weekKey),
          eq(schedules.day, day)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
