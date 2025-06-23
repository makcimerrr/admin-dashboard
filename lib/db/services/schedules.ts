import { eq, and } from "drizzle-orm"
import { db } from "../config"
import { schedules } from "../schema/schedules"
import type { Schedule, CreateScheduleData, TimeSlot } from "../schema/schedules"

// Récupérer les plannings avec filtres optionnels
export async function getSchedules(employeeId?: string, weekKey?: string): Promise<Schedule[]> {
  const conditions = []

  if (employeeId) {
    conditions.push(eq(schedules.employeeId, employeeId))
  }

  if (weekKey) {
    conditions.push(eq(schedules.weekKey, weekKey))
  }

  return db
    .select()
    .from(schedules)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(schedules.weekKey, schedules.day)
}

// Récupérer un planning spécifique
export async function getSchedule(employeeId: string, weekKey: string, day: string): Promise<Schedule | null> {
  const result = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.employeeId, employeeId), eq(schedules.weekKey, weekKey), eq(schedules.day, day)))
    .limit(1)

  return result[0] || null
}

// Créer ou mettre à jour un planning
export async function upsertSchedule(data: CreateScheduleData): Promise<Schedule> {
  // Ajouter des IDs et timestamps aux créneaux
  const timeSlots: TimeSlot[] = data.timeSlots.map((slot) => ({
    ...slot,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  // Vérifier si le planning existe déjà
  const existing = await getSchedule(data.employeeId, data.weekKey, data.day)

  if (existing) {
    // Mettre à jour
    const result = await db
      .update(schedules)
      .set({
        timeSlots,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, existing.id))
      .returning()

    return result[0]
  } else {
    // Créer
    const result = await db
      .insert(schedules)
      .values({
        employeeId: data.employeeId,
        weekKey: data.weekKey,
        day: data.day,
        timeSlots,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return result[0]
  }
}

// Supprimer un planning
export async function deleteSchedule(employeeId: string, weekKey: string, day: string): Promise<boolean> {
  const result = await db
    .delete(schedules)
    .where(and(eq(schedules.employeeId, employeeId), eq(schedules.weekKey, weekKey), eq(schedules.day, day)))
    .returning()

  return result.length > 0
}

// Copier les plannings d'une semaine vers une autre
export async function copyWeekSchedule(employeeId: string, fromWeekKey: string, toWeekKey: string): Promise<void> {
  const sourceSchedules = await getSchedules(employeeId, fromWeekKey)

  for (const schedule of sourceSchedules) {
    await upsertSchedule({
      employeeId,
      weekKey: toWeekKey,
      day: schedule.day,
      timeSlots: schedule.timeSlots.map((slot) => ({
        start: slot.start,
        end: slot.end,
        isWorking: slot.isWorking,
        type: slot.type,
        note: slot.note,
      })),
    })
  }
}

// Copier les plannings pour plusieurs employés
export async function bulkCopySchedules(
  employeeIds: string[],
  fromWeekKey: string,
  toWeekKey: string,
): Promise<{
  success: string[]
  errors: { employeeId: string; error: string }[]
}> {
  const success: string[] = []
  const errors: { employeeId: string; error: string }[] = []

  for (const employeeId of employeeIds) {
    try {
      await copyWeekSchedule(employeeId, fromWeekKey, toWeekKey)
      success.push(employeeId)
    } catch (error) {
      errors.push({
        employeeId,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      })
    }
  }

  return { success, errors }
}

// Obtenir le planning de la semaine pour un employé
export async function getWeekScheduleForEmployee(
  employeeId: string,
  weekKey: string,
): Promise<Record<string, TimeSlot[]>> {
  const weekSchedules = await getSchedules(employeeId, weekKey)

  const weekSchedule: Record<string, TimeSlot[]> = {}

  weekSchedules.forEach((schedule) => {
    weekSchedule[schedule.day] = schedule.timeSlots
  })

  return weekSchedule
}

// Obtenir les statistiques d'une semaine
export async function getWeekStats(weekKey: string): Promise<{
  totalHours: number
  employeeHours: Record<string, number>
  dayDistribution: Record<string, number>
  typeDistribution: Record<string, number>
}> {
  const weekSchedules = await getSchedules(undefined, weekKey)

  let totalHours = 0
  const employeeHours: Record<string, number> = {}
  const dayDistribution: Record<string, number> = {}
  const typeDistribution: Record<string, number> = {}

  weekSchedules.forEach((schedule) => {
    schedule.timeSlots.forEach((slot) => {
      if (slot.type === "work") {
        const hours = calculateSlotHours(slot.start, slot.end)
        totalHours += hours
        employeeHours[schedule.employeeId] = (employeeHours[schedule.employeeId] || 0) + hours
        dayDistribution[schedule.day] = (dayDistribution[schedule.day] || 0) + hours
        typeDistribution[slot.type] = (typeDistribution[slot.type] || 0) + hours
      } else {
        typeDistribution[slot.type] = (typeDistribution[slot.type] || 0) + 1
      }
    })
  })

  return {
    totalHours,
    employeeHours,
    dayDistribution,
    typeDistribution,
  }
}

// Utilitaire pour calculer les heures d'un créneau
function calculateSlotHours(start: string, end: string): number {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  return (endMinutes - startMinutes) / 60
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}
