import { type NextRequest, NextResponse } from "next/server"
import { upsertSchedule } from "@/lib/db/services/schedules"
import { getEmployees } from "@/lib/db/services/employees"
import { getWeekNumber } from "@/lib/db/utils"

type SlotDef = { start: string; end: string; isWorking: boolean; type: "work" }[]

// Roulement de 3 semaines hardcodé (basé sur S15, S16, S17)
// Structure : [semaine1, semaine2, semaine3] → employeeName → day → slots
const ROTATION_TEMPLATES: Record<string, Record<string, SlotDef>>[] = [
  // ── Semaine 1 (type S15) ──
  {
    "Bastien Lagrue": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      vendredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      samedi:   [],
      dimanche: [],
    },
    "Maxime Dubois": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "13:00", end: "21:00", isWorking: true, type: "work" }],
      jeudi:    [],
      vendredi: [],
      samedi:   [{ start: "10:00", end: "18:00", isWorking: true, type: "work" }],
      dimanche: [],
    },
    "Cyril Ramananjaona": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      vendredi: [{ start: "13:00", end: "21:00", isWorking: true, type: "work" }],
      samedi:   [],
      dimanche: [],
    },
    "Vivien Frebourg": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      vendredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      samedi:   [],
      dimanche: [],
    },
    "Permanence Externe": {
      lundi:    [{ start: "16:00", end: "21:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "16:00", end: "21:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "16:00", end: "21:00", isWorking: true, type: "work" }],
      vendredi: [],
      samedi:   [],
      dimanche: [],
    },
  },
  // ── Semaine 2 (type S16) ──
  {
    "Bastien Lagrue": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      vendredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      samedi:   [],
      dimanche: [],
    },
    "Maxime Dubois": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "13:00", end: "21:00", isWorking: true, type: "work" }],
      jeudi:    [],
      vendredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      samedi:   [],
      dimanche: [],
    },
    "Cyril Ramananjaona": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      vendredi: [{ start: "13:00", end: "21:00", isWorking: true, type: "work" }],
      samedi:   [],
      dimanche: [],
    },
    "Vivien Frebourg": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mercredi: [],
      jeudi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      vendredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      samedi:   [{ start: "10:00", end: "18:00", isWorking: true, type: "work" }],
      dimanche: [],
    },
    "Permanence Externe": {
      lundi:    [{ start: "16:00", end: "21:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "16:00", end: "21:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "16:00", end: "21:00", isWorking: true, type: "work" }],
      vendredi: [],
      samedi:   [],
      dimanche: [],
    },
  },
  // ── Semaine 3 (type S17) ──
  {
    "Bastien Lagrue": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      vendredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      samedi:   [],
      dimanche: [],
    },
    "Maxime Dubois": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "13:00", end: "21:00", isWorking: true, type: "work" }],
      jeudi:    [],
      vendredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      samedi:   [],
      dimanche: [],
    },
    "Cyril Ramananjaona": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [],
      mercredi: [],
      jeudi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      vendredi: [{ start: "13:00", end: "21:00", isWorking: true, type: "work" }],
      samedi:   [{ start: "10:00", end: "18:00", isWorking: true, type: "work" }],
      dimanche: [],
    },
    "Vivien Frebourg": {
      lundi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      vendredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      samedi:   [],
      dimanche: [],
    },
    "Permanence Externe": {
      lundi:    [{ start: "16:00", end: "21:00", isWorking: true, type: "work" }],
      mardi:    [{ start: "16:00", end: "21:00", isWorking: true, type: "work" }],
      mercredi: [{ start: "09:00", end: "17:00", isWorking: true, type: "work" }],
      jeudi:    [{ start: "16:00", end: "21:00", isWorking: true, type: "work" }],
      vendredi: [],
      samedi:   [],
      dimanche: [],
    },
  },
]

/**
 * Applique le roulement de 3 semaines (hardcodé) sur une plage de dates.
 * Le cycle se répète : semaine 1 → semaine 2 → semaine 3 → semaine 1 → ...
 */
export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, employeeIds } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      )
    }

    // Load employees to map name → id
    const allEmployees = await getEmployees()
    const nameToId = new Map(allEmployees.map((e) => [e.name, e.id]))
    const idToName = new Map(allEmployees.map((e) => [e.id, e.name]))

    // Determine target employees
    const targetEmployeeIds: string[] =
      employeeIds && employeeIds.length > 0
        ? employeeIds
        : allEmployees.map((e) => e.id)

    // Enumerate all target weeks from startDate to endDate
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)

    // Find the Monday of the start week
    const startDay = start.getDay()
    const monday = new Date(start)
    monday.setDate(start.getDate() - (startDay === 0 ? 6 : startDay - 1))

    // Find the Monday of the end week
    const endDay = end.getDay()
    const endMonday = new Date(end)
    endMonday.setDate(end.getDate() - (endDay === 0 ? 6 : endDay - 1))

    // Collect all target week keys
    const targetWeekKeys: string[] = []
    const current = new Date(monday)
    while (current <= endMonday) {
      const weekNum = getWeekNumber(current)
      const weekKey = `${current.getFullYear()}-W${weekNum}`
      targetWeekKeys.push(weekKey)
      current.setDate(current.getDate() + 7)
    }

    const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
    let copiedCount = 0
    const errors: { weekKey: string; employeeId: string; error: string }[] = []

    for (let i = 0; i < targetWeekKeys.length; i++) {
      const targetWeek = targetWeekKeys[i]
      const template = ROTATION_TEMPLATES[i % ROTATION_TEMPLATES.length]

      for (const employeeId of targetEmployeeIds) {
        const employeeName = idToName.get(employeeId)
        if (!employeeName || !template[employeeName]) continue

        try {
          const employeeTemplate = template[employeeName]
          for (const day of days) {
            const slots = employeeTemplate[day] || []
            await upsertSchedule({
              employeeId,
              weekKey: targetWeek,
              day,
              timeSlots: slots,
            })
          }
          copiedCount++
        } catch (error) {
          errors.push({
            weekKey: targetWeek,
            employeeId,
            error: error instanceof Error ? error.message : "Erreur inconnue",
          })
        }
      }
    }

    return NextResponse.json({
      message: `Roulement appliqué : ${targetWeekKeys.length} semaines remplies pour ${targetEmployeeIds.length} employés`,
      weeksApplied: targetWeekKeys.length,
      copiedCount,
      errors,
    })
  } catch (error) {
    console.error("Error applying rotation:", error)
    return NextResponse.json(
      { error: "Failed to apply rotation" },
      { status: 500 }
    )
  }
}
