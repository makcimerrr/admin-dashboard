import { type NextRequest, NextResponse } from "next/server"
import { getEmployee, updateEmployee, deleteEmployee, emailExists } from "@/lib/db/services/employees"
import { validateEmployeeData } from "@/lib/db/utils"
import { addHistoryEntry } from '@/lib/db/services/history'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await getEmployee(params.id)
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }
    return NextResponse.json(employee)
  } catch (error) {
    console.error("Error fetching employee:", error)
    return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()
    const userId = request.headers.get('x-user-id') || 'unknown';
    const userEmail = request.headers.get('x-user-email') || 'unknown';

    // Validation des données modifiées
    if (data.name || data.initial || data.role || data.email || data.color) {
      const currentEmployee = await getEmployee(params.id)
      if (!currentEmployee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }

      const validationData = {
        name: data.name || currentEmployee.name,
        initial: data.initial || currentEmployee.initial,
        role: data.role || currentEmployee.role,
        email: data.email || currentEmployee.email,
        color: data.color || currentEmployee.color,
      }

      const errors = validateEmployeeData(validationData)
      if (errors.length > 0) {
        return NextResponse.json({ error: errors.join(", ") }, { status: 400 })
      }

      // Vérifier l'unicité de l'email si modifié
      if (data.email && data.email !== currentEmployee.email) {
        if (await emailExists(data.email, params.id)) {
          return NextResponse.json({ error: "Un employé avec cet email existe déjà" }, { status: 400 })
        }
      }
    }

    const employee = await updateEmployee(params.id, {
      ...data,
      email: data.email ? data.email.toLowerCase().trim() : undefined,
    })

    // Audit
    await addHistoryEntry({
      type: 'employee',
      action: 'update',
      userId,
      userEmail,
      entityId: params.id,
      details: { before: currentEmployee, after: employee },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error("Error updating employee:", error)
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id') || 'unknown';
    const userEmail = request.headers.get('x-user-email') || 'unknown';
    const currentEmployee = await getEmployee(params.id);
    const success = await deleteEmployee(params.id);
    // Audit
    if (success && currentEmployee) {
      await addHistoryEntry({
        type: 'employee',
        action: 'delete',
        userId,
        userEmail,
        entityId: params.id,
        details: { before: currentEmployee },
      });
    }
    if (!success) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }
    return NextResponse.json({ message: "Employee deleted successfully" })
  } catch (error) {
    console.error("Error deleting employee:", error)
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}
