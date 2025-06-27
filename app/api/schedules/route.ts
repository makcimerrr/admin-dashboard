import { NextResponse } from "next/server"
import { db } from "@/lib/db/config"
import { schedules } from "@/lib/db/schema/schedules"
import { eq, and } from "drizzle-orm"
import { timeSlotSchema } from "@/lib/db/schema/schedules"
import { getWeekNumber } from "@/lib/db/utils"

// Pour la détection des jours fériés
const HOLIDAYS_URL = 'https://etalab.github.io/jours-feries-france-data/json/metropole.json';
let holidaysCache: { [date: string]: string } | null = null;
let holidaysCacheDate: number | null = null;

async function getFrenchHolidays() {
  // Cache 1h
  if (holidaysCache && holidaysCacheDate && Date.now() - holidaysCacheDate < 3600_000) {
    return holidaysCache;
  }
  const res = await fetch(HOLIDAYS_URL);
  holidaysCache = await res.json();
  holidaysCacheDate = Date.now();
  return holidaysCache;
}

// Convertit weekKey (ex: 2024-W01) + day (lundi, mardi...) en date ISO (YYYY-MM-DD)
function getDateFromWeekKeyAndDay(weekKey: string, day: string): string | null {
  // weekKey: "2025-W29", day: "lundi" => 2025-07-14
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const daysOfWeek = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const dayIndex = daysOfWeek.indexOf(day);
  if (dayIndex === -1) return null;

  // Trouver le premier jeudi de l'année
  const jan4 = new Date(Date.UTC(year, 0, 4));
  // Premier lundi de la semaine 1
  const firstMonday = new Date(jan4);
  firstMonday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  // Calculer la date du lundi de la semaine demandée
  const monday = new Date(firstMonday);
  monday.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
  // Ajouter l'offset du jour
  const date = new Date(monday);
  date.setUTCDate(monday.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

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

    // Récupérer les jours fériés
    const holidays = await getFrenchHolidays();

    // Pour chaque slot, détecter si c'est un jour férié
    const dateStr = getDateFromWeekKeyAndDay(weekKey, day);
    const validatedTimeSlots = timeSlots.map((slot: any) => {
      const parsed = timeSlotSchema.parse(slot);
      const isHoliday = dateStr && holidays && holidays[dateStr] ? true : false;
      const isSunday = day === 'dimanche';
      return { ...parsed, isHoliday, isSunday };
    });

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

// POST /api/schedules/range
export async function POST_RANGE(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, startDate, endDate, slotType } = body;
    if (!employeeId || !startDate || !endDate || !slotType) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const holidays = await getFrenchHolidays();
    const daysOfWeek = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const created = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const weekKey = `${d.getFullYear()}-W${getWeekNumber(d)}`;
      const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=dimanche, 1=lundi...
      const day = daysOfWeek[dayIndex];
      const isHoliday = holidays && holidays[dateStr] ? true : false;
      const isSunday = day === 'dimanche';
      const timeSlots = [{
        start: "08:00",
        end: "22:00",
        isWorking: false,
        type: slotType,
        isHoliday,
        isSunday,
      }];
      // Upsert (remplace si existe)
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
        .then((results) => results[0]);
      let result;
      if (existingSchedule) {
        [result] = await db
          .update(schedules)
          .set({ timeSlots, updatedAt: new Date() })
          .where(eq(schedules.id, existingSchedule.id))
          .returning();
      } else {
        [result] = await db
          .insert(schedules)
          .values({ employeeId, weekKey, day, timeSlots })
          .returning();
      }
      created.push(result);
    }
    return NextResponse.json(created);
  } catch (error) {
    console.error("Error creating range schedule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
