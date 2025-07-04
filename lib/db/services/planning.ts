import type { Schedule, TimeSlot, CreateScheduleData } from "../schema/planning"
import { validateScheduleData, calculateTotalWorkHours, detectTimeConflicts } from "../schema/planning"
import { hackatonWeeks } from "../schema/hackatonWeeks"
import { db } from "../config"
import { eq } from "drizzle-orm"

// Interface pour le service planning (à implémenter avec la vraie DB)
export interface PlanningService {
  getSchedules(employeeId?: string, weekKey?: string): Promise<Schedule[]>
  getSchedule(employeeId: string, weekKey: string, day: string): Promise<Schedule | null>
  createOrUpdate(data: CreateScheduleData): Promise<Schedule>
  delete(employeeId: string, weekKey: string, day: string): Promise<boolean>
  copyWeekSchedule(employeeId: string, fromWeekKey: string, toWeekKey: string): Promise<void>
  getWeekScheduleForEmployee(employeeId: string, weekKey: string): Promise<Record<string, TimeSlot[]>>
}

// Implémentation temporaire en mémoire (à remplacer par la vraie DB)
class InMemoryPlanningService implements PlanningService {
  private schedules: Schedule[] = []

  async getSchedules(employeeId?: string, weekKey?: string): Promise<Schedule[]> {
    let filtered = this.schedules

    if (employeeId) {
      filtered = filtered.filter((s) => s.employeeId === employeeId)
    }

    if (weekKey) {
      filtered = filtered.filter((s) => s.weekKey === weekKey)
    }

    return filtered
  }

  async getSchedule(employeeId: string, weekKey: string, day: string): Promise<Schedule | null> {
    return this.schedules.find((s) => s.employeeId === employeeId && s.weekKey === weekKey && s.day === day) || null
  }

  async createOrUpdate(data: CreateScheduleData): Promise<Schedule> {
    // Validation
    const errors = validateScheduleData(data)
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`)
    }

    // Vérifier les conflits d'horaires
    if (detectTimeConflicts(data.timeSlots)) {
      throw new Error("Conflit détecté dans les créneaux horaires")
    }

    const existingIndex = this.schedules.findIndex(
      (s) => s.employeeId === data.employeeId && s.weekKey === data.weekKey && s.day === data.day,
    )

    const timeSlots: TimeSlot[] = data.timeSlots.map((slot) => ({
      ...slot,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    if (existingIndex >= 0) {
      // Mise à jour
      this.schedules[existingIndex] = {
        ...this.schedules[existingIndex],
        timeSlots,
        updatedAt: new Date(),
      }
      return this.schedules[existingIndex]
    } else {
      // Création
      const schedule: Schedule = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        employeeId: data.employeeId,
        weekKey: data.weekKey,
        day: data.day,
        timeSlots,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      this.schedules.push(schedule)
      return schedule
    }
  }

  async delete(employeeId: string, weekKey: string, day: string): Promise<boolean> {
    const index = this.schedules.findIndex((s) => s.employeeId === employeeId && s.weekKey === weekKey && s.day === day)

    if (index >= 0) {
      this.schedules.splice(index, 1)
      return true
    }
    return false
  }

  async copyWeekSchedule(employeeId: string, fromWeekKey: string, toWeekKey: string): Promise<void> {
    const sourceSchedules = await this.getSchedules(employeeId, fromWeekKey)

    for (const schedule of sourceSchedules) {
      const copyData: CreateScheduleData = {
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
      }

      await this.createOrUpdate(copyData)
    }
  }

  async getWeekScheduleForEmployee(employeeId: string, weekKey: string): Promise<Record<string, TimeSlot[]>> {
    const schedules = await this.getSchedules(employeeId, weekKey)

    const weekSchedule: Record<string, TimeSlot[]> = {}

    schedules.forEach((schedule) => {
      weekSchedule[schedule.day] = schedule.timeSlots
    })

    return weekSchedule
  }

  // Méthodes utilitaires et statistiques
  async getWeekStats(weekKey: string): Promise<{
    totalHours: number
    employeeHours: Record<string, number>
    dayDistribution: Record<string, number>
    typeDistribution: Record<string, number>
  }> {
    const schedules = await this.getSchedules(undefined, weekKey)

    let totalHours = 0
    const employeeHours: Record<string, number> = {}
    const dayDistribution: Record<string, number> = {}
    const typeDistribution: Record<string, number> = {}

    schedules.forEach((schedule) => {
      const dayHours = calculateTotalWorkHours(schedule.timeSlots)
      totalHours += dayHours

      employeeHours[schedule.employeeId] = (employeeHours[schedule.employeeId] || 0) + dayHours
      dayDistribution[schedule.day] = (dayDistribution[schedule.day] || 0) + dayHours

      schedule.timeSlots.forEach((slot) => {
        if (slot.type === "work") {
          typeDistribution[slot.type] = (typeDistribution[slot.type] || 0) + calculateTotalWorkHours([slot])
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

  async getEmployeeWeeklyStats(
    employeeId: string,
    weekKey: string,
  ): Promise<{
    totalWorkHours: number
    workDays: number
    vacationDays: number
    sickDays: number
    personalDays: number
    averageHoursPerDay: number
  }> {
    const weekSchedule = await this.getWeekScheduleForEmployee(employeeId, weekKey)

    let totalWorkHours = 0
    let workDays = 0
    let vacationDays = 0
    let sickDays = 0
    let personalDays = 0

    Object.values(weekSchedule).forEach((daySlots) => {
      const workSlots = daySlots.filter((slot) => slot.type === "work")
      const vacationSlots = daySlots.filter((slot) => slot.type === "vacation")
      const sickSlots = daySlots.filter((slot) => slot.type === "sick")
      const personalSlots = daySlots.filter((slot) => slot.type === "personal")

      if (workSlots.length > 0) {
        totalWorkHours += calculateTotalWorkHours(workSlots)
        workDays++
      }
      if (vacationSlots.length > 0) vacationDays++
      if (sickSlots.length > 0) sickDays++
      if (personalSlots.length > 0) personalDays++
    })

    return {
      totalWorkHours,
      workDays,
      vacationDays,
      sickDays,
      personalDays,
      averageHoursPerDay: workDays > 0 ? totalWorkHours / workDays : 0,
    }
  }

  async findScheduleConflicts(weekKey: string): Promise<
    {
      employeeId: string
      day: string
      conflicts: string[]
    }[]
  > {
    const schedules = await this.getSchedules(undefined, weekKey)
    const conflicts: { employeeId: string; day: string; conflicts: string[] }[] = []

    schedules.forEach((schedule) => {
      if (detectTimeConflicts(schedule.timeSlots)) {
        conflicts.push({
          employeeId: schedule.employeeId,
          day: schedule.day,
          conflicts: ["Créneaux horaires en conflit"],
        })
      }
    })

    return conflicts
  }

  async bulkCopySchedules(
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
        await this.copyWeekSchedule(employeeId, fromWeekKey, toWeekKey)
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
}

// Instance du service (à remplacer par l'injection de dépendance)
export const planningService = new InMemoryPlanningService()

// Utilitaires pour les calculs de dates et semaines
export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export const getWeekDates = (weekOffset = 0): Date[] => {
  const today = new Date()
  const currentDay = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - currentDay + 1 + weekOffset * 7)

  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    weekDates.push(date)
  }
  return weekDates
}

export const getWeekKey = (weekOffset: number): string => {
  const weekDates = getWeekDates(weekOffset)
  return `${weekDates[0].getFullYear()}-W${getWeekNumber(weekDates[0])}`
}

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  })
}

// Fonctions d'export
export const exportWeekScheduleToCSV = async (weekKey: string): Promise<string> => {
  const schedules = await planningService.getSchedules(undefined, weekKey)

  const headers = ["Employé ID", "Jour", "Heure début", "Heure fin", "Type", "Note"]
  const rows: string[][] = []

  schedules.forEach((schedule) => {
    schedule.timeSlots.forEach((slot) => {
      rows.push([schedule.employeeId, schedule.day, slot.start, slot.end, slot.type, slot.note || ""])
    })
  })

  return [headers, ...rows].map((row) => row.join(",")).join("\n")
}

export async function getHackatonWeek(weekKey: string) {
  const result = await db.select().from(hackatonWeeks).where(eq(hackatonWeeks.weekKey, weekKey)).limit(1);
  return result[0] || null;
}

export async function setHackatonWeek(weekKey: string, isHackaton: boolean) {
  const existing = await getHackatonWeek(weekKey);
  if (existing) {
    await db.update(hackatonWeeks)
      .set({ isHackaton, updatedAt: new Date() })
      .where(eq(hackatonWeeks.weekKey, weekKey));
  } else {
    await db.insert(hackatonWeeks)
      .values({ weekKey, isHackaton, updatedAt: new Date() });
  }
}
