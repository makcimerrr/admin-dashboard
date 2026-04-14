import { type NextRequest, NextResponse } from "next/server"
import { upsertSchedule } from "@/lib/db/services/schedules"
import { getEmployees } from "@/lib/db/services/employees"
import { getWeekNumber } from "@/lib/db/utils"

type SlotDef = { start: string; end: string; isWorking: boolean; type: "work" }[]

// Helper : génère un slot de travail
const w = (start: string, end: string): SlotDef => [{ start, end, isWorking: true, type: "work" }]
const off: SlotDef = []

function buildTemplates(mode: "standard" | "piscine"): Record<string, Record<string, SlotDef>>[] {
  // En mode piscine, les créneaux 09:00 deviennent 08:00
  const h9 = mode === "piscine" ? "08:00" : "09:00"

  return [
    // ── Semaine 1 (type S15) ──
    {
      "Bastien Lagrue": {
        lundi: w(h9, "17:00"), mardi: w(h9, "17:00"), mercredi: w(h9, "17:00"),
        jeudi: w(h9, "17:00"), vendredi: w(h9, "17:00"), samedi: off, dimanche: off,
      },
      "Maxime Dubois": {
        lundi: w(h9, "17:00"), mardi: w(h9, "17:00"), mercredi: w("13:00", "21:00"),
        jeudi: off, vendredi: off, samedi: w("10:00", "18:00"), dimanche: off,
      },
      "Cyril Ramananjaona": {
        lundi: w(h9, "17:00"), mardi: off, mercredi: w(h9, "17:00"),
        jeudi: w(h9, "17:00"), vendredi: w("13:00", "21:00"), samedi: off, dimanche: off,
      },
      "Vivien Frebourg": {
        lundi: w(h9, "17:00"), mardi: w(h9, "17:00"), mercredi: w(h9, "17:00"),
        jeudi: w(h9, "17:00"), vendredi: w(h9, "17:00"), samedi: off, dimanche: off,
      },
      "Permanence Externe": {
        lundi: w("16:00", "21:00"), mardi: w("16:00", "21:00"), mercredi: w(h9, "17:00"),
        jeudi: w("16:00", "21:00"), vendredi: off, samedi: off, dimanche: off,
      },
    },
    // ── Semaine 2 (type S16) ──
    {
      "Bastien Lagrue": {
        lundi: w(h9, "17:00"), mardi: w(h9, "17:00"), mercredi: w(h9, "17:00"),
        jeudi: w(h9, "17:00"), vendredi: w(h9, "17:00"), samedi: off, dimanche: off,
      },
      "Maxime Dubois": {
        lundi: w(h9, "17:00"), mardi: w(h9, "17:00"), mercredi: w("13:00", "21:00"),
        jeudi: off, vendredi: w(h9, "17:00"), samedi: off, dimanche: off,
      },
      "Cyril Ramananjaona": {
        lundi: w(h9, "17:00"), mardi: off, mercredi: w(h9, "17:00"),
        jeudi: w(h9, "17:00"), vendredi: w("13:00", "21:00"), samedi: off, dimanche: off,
      },
      "Vivien Frebourg": {
        lundi: w(h9, "17:00"), mardi: w(h9, "17:00"), mercredi: off,
        jeudi: w(h9, "17:00"), vendredi: w(h9, "17:00"), samedi: w("10:00", "18:00"), dimanche: off,
      },
      "Permanence Externe": {
        lundi: w("16:00", "21:00"), mardi: w("16:00", "21:00"), mercredi: w(h9, "17:00"),
        jeudi: w("16:00", "21:00"), vendredi: off, samedi: off, dimanche: off,
      },
    },
    // ── Semaine 3 (type S17) ──
    {
      "Bastien Lagrue": {
        lundi: w(h9, "17:00"), mardi: w(h9, "17:00"), mercredi: w(h9, "17:00"),
        jeudi: w(h9, "17:00"), vendredi: w(h9, "17:00"), samedi: off, dimanche: off,
      },
      "Maxime Dubois": {
        lundi: w(h9, "17:00"), mardi: w(h9, "17:00"), mercredi: w("13:00", "21:00"),
        jeudi: off, vendredi: w(h9, "17:00"), samedi: off, dimanche: off,
      },
      "Cyril Ramananjaona": {
        lundi: w(h9, "17:00"), mardi: off, mercredi: off,
        jeudi: w(h9, "17:00"), vendredi: w("13:00", "21:00"), samedi: w("10:00", "18:00"), dimanche: off,
      },
      "Vivien Frebourg": {
        lundi: w(h9, "17:00"), mardi: w(h9, "17:00"), mercredi: w(h9, "17:00"),
        jeudi: w(h9, "17:00"), vendredi: w(h9, "17:00"), samedi: off, dimanche: off,
      },
      "Permanence Externe": {
        lundi: w("16:00", "21:00"), mardi: w("16:00", "21:00"), mercredi: w(h9, "17:00"),
        jeudi: w("16:00", "21:00"), vendredi: off, samedi: off, dimanche: off,
      },
    },
  ]
}

/**
 * Applique le roulement de 3 semaines sur une plage de dates.
 * Le cycle se répète : semaine 1 → semaine 2 → semaine 3 → semaine 1 → ...
 * Mode "standard" (défaut) ou "piscine" (08:00 au lieu de 09:00).
 */
export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, employeeIds, mode = "standard" } = await request.json()

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
    const templates = buildTemplates(mode === "piscine" ? "piscine" : "standard")

    // Process all weeks in parallel, and within each week all employee×day upserts in parallel
    await Promise.all(
      targetWeekKeys.map(async (targetWeek, i) => {
        const template = templates[i % templates.length]

        await Promise.all(
          targetEmployeeIds.map(async (employeeId) => {
            const employeeName = idToName.get(employeeId)
            if (!employeeName || !template[employeeName]) return

            try {
              const employeeTemplate = template[employeeName]
              await Promise.all(
                days.map((day) => {
                  const slots = employeeTemplate[day] || []
                  return upsertSchedule({
                    employeeId,
                    weekKey: targetWeek,
                    day,
                    timeSlots: slots,
                  })
                })
              )
              copiedCount++
            } catch (error) {
              errors.push({
                weekKey: targetWeek,
                employeeId,
                error: error instanceof Error ? error.message : "Erreur inconnue",
              })
            }
          })
        )
      })
    )

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
