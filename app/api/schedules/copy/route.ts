import { type NextRequest, NextResponse } from "next/server"
import { bulkCopySchedules } from "@/lib/db/services/schedules"
import { getEmployees } from "@/lib/db/services/employees"

export async function POST(request: NextRequest) {
  try {
    const { employeeIds, fromWeekKey, toWeekKey } = await request.json()

    if (!fromWeekKey || !toWeekKey) {
      return NextResponse.json({ error: "Missing week keys" }, { status: 400 })
    }

    // Si aucun employé spécifié, copier pour tous
    let targetEmployeeIds = employeeIds
    if (!targetEmployeeIds || targetEmployeeIds.length === 0) {
      const allEmployees = await getEmployees()
      targetEmployeeIds = allEmployees.map((emp) => emp.id)
    }

    const result = await bulkCopySchedules(targetEmployeeIds, fromWeekKey, toWeekKey)

    return NextResponse.json({
      message: `Schedules copied for ${result.success.length} employees`,
      copiedEmployees: result.success.length,
      errors: result.errors,
    })
  } catch (error) {
    console.error("Error copying schedules:", error)
    return NextResponse.json({ error: "Failed to copy schedules" }, { status: 500 })
  }
}
