import { NextResponse } from "next/server"
import { withPlanningAccess, withPlanningEditor } from "@/lib/api/with-auth"
import { getEmployees, createEmployee, emailExists } from "@/lib/db/services/employees"
import { validateEmployeeData, getNextAvailableColor } from "@/lib/db/utils"
import { addHistoryEntry } from '@/lib/db/services/history'

export const GET = withPlanningAccess(async () => {
  try {
    const employees = await getEmployees()
    return NextResponse.json(employees)
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
})

export const POST = withPlanningEditor(async (request, { user }) => {
  try {
    const data = await request.json()
    // Identité authentifiée pour l'audit (les headers x-user-* étaient falsifiables)
    const userId = user.id;
    const userEmail = user.email;

    // Validation
    const errors = validateEmployeeData(data)
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 })
    }

    // Vérifier l'unicité de l'email
    if (await emailExists(data.email)) {
      return NextResponse.json({ error: "Un employé avec cet email existe déjà" }, { status: 400 })
    }

    // Obtenir une couleur disponible si non fournie
    if (!data.color) {
      const allEmployees = await getEmployees()
      const usedColors = allEmployees.map((emp) => emp.color)
      data.color = getNextAvailableColor(usedColors)
    }

    const employee = await createEmployee({
      name: data.name.trim(),
      initial: data.initial.trim(),
      role: data.role.trim(),
      avatar: data.avatar || "/placeholder.svg?height=40&width=40",
      color: data.color,
      email: data.email.toLowerCase().trim(),
      phone: data.phone || "",
    })

    // Audit
    await addHistoryEntry({
      type: 'employee',
      action: 'create',
      userId,
      userEmail,
      entityId: employee.id,
      details: { payload: employee },
    });

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
  }
})
