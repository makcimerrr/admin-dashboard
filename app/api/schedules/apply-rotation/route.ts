import { NextResponse } from "next/server"
import { withPlanningEditor } from "@/lib/api/with-auth"
import { upsertSchedule } from "@/lib/db/services/schedules"
import { getEmployees } from "@/lib/db/services/employees"
import { getWeekNumber } from "@/lib/db/utils"
import {
  getRotationById,
  listRotations,
  seedDefaultRotationsIfEmpty,
} from "@/lib/db/services/rotations"

/**
 * Applique un roulement (stocké en base, éditable via /planning/roulements)
 * sur une plage de dates. Le cycle de N semaines se répète : semaine 1 → … →
 * semaine N → semaine 1 → …
 *
 * Body : { startDate, endDate, employeeIds?, rotationId? , mode? }
 *  - rotationId : id du roulement à appliquer.
 *  - mode ("standard" | "piscine") : rétro-compat de l'ancienne UI — résolu
 *    vers le roulement seedé du même nom si rotationId absent.
 */
export const POST = withPlanningEditor(async (request) => {
  try {
    const { startDate, endDate, employeeIds, rotationId, mode } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      )
    }

    // Résolution du roulement (base = source de vérité, seed au besoin).
    await seedDefaultRotationsIfEmpty()
    let rotation = null
    if (rotationId !== undefined) {
      const id = Number(rotationId)
      if (!Number.isInteger(id)) {
        return NextResponse.json({ error: "rotationId invalide" }, { status: 400 })
      }
      rotation = await getRotationById(id)
    } else {
      const wanted = mode === "piscine" ? "piscine" : "standard"
      const all = await listRotations()
      rotation = all.find((r) => r.name.toLowerCase() === wanted) ?? null
    }
    if (!rotation || rotation.weeks.length === 0) {
      return NextResponse.json({ error: "Roulement introuvable" }, { status: 404 })
    }

    // Load employees
    const allEmployees = await getEmployees()

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
    const weeks = rotation.weeks

    // Process all weeks in parallel, and within each week all employee×day upserts in parallel
    await Promise.all(
      targetWeekKeys.map(async (targetWeek, i) => {
        const template = weeks[i % weeks.length]

        await Promise.all(
          targetEmployeeIds.map(async (employeeId) => {
            const employeeTemplate = template[employeeId]
            if (!employeeTemplate) return

            try {
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
      message: `Roulement « ${rotation.name} » appliqué : ${targetWeekKeys.length} semaines remplies pour ${targetEmployeeIds.length} employés`,
      rotation: { id: rotation.id, name: rotation.name, weeksInCycle: weeks.length },
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
})
