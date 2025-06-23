import { eq, and, desc } from "drizzle-orm"
import { db } from "../config"
import { employees } from "../schema/employees"
import type { Employee, CreateEmployeeData, UpdateEmployeeData } from "../schema/employees"

// Récupérer tous les employés actifs
export async function getEmployees(): Promise<Employee[]> {
  return await db.select().from(employees).where(eq(employees.isActive, true)).orderBy(desc(employees.createdAt))
}

// Récupérer un employé par ID
export async function getEmployee(id: string): Promise<Employee | null> {
  const result = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, id), eq(employees.isActive, true)))
    .limit(1)

  return result[0] || null
}

// Créer un nouvel employé
export async function createEmployee(data: CreateEmployeeData): Promise<Employee> {
  const result = await db
    .insert(employees)
    .values({
      ...data,
      phone: data.phone || "",
      avatar: data.avatar || "/placeholder.svg?height=40&width=40",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return result[0]
}

// Mettre à jour un employé
export async function updateEmployee(id: string, data: UpdateEmployeeData): Promise<Employee | null> {
  const result = await db
    .update(employees)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(employees.id, id), eq(employees.isActive, true)))
    .returning()

  return result[0] || null
}

// Supprimer un employé (soft delete)
export async function deleteEmployee(id: string): Promise<boolean> {
  const result = await db
    .update(employees)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id))
    .returning()

  return result.length > 0
}

// Vérifier si un email existe déjà
export async function emailExists(email: string, excludeId?: string): Promise<boolean> {
  const result = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.email, email.toLowerCase()), eq(employees.isActive, true)))
    .limit(1)

  if (excludeId && result.length > 0) {
    return result[0].id !== excludeId
  }

  return result.length > 0
}

// Rechercher des employés
export async function searchEmployees(query: string): Promise<Employee[]> {
  // Note: Pour une vraie recherche, utiliser des fonctions SQL comme ILIKE
  const allEmployees = await getEmployees()
  const searchTerm = query.toLowerCase().trim()

  return allEmployees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm) ||
      emp.role.toLowerCase().includes(searchTerm) ||
      emp.email.toLowerCase().includes(searchTerm),
  )
}

// Obtenir les statistiques des employés
export async function getEmployeeStats(): Promise<{
  total: number
  byRole: Record<string, number>
  recentlyAdded: Employee[]
}> {
  const activeEmployees = await getEmployees()

  const byRole = activeEmployees.reduce(
    (acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const recentlyAdded = activeEmployees.slice(0, 5) // Déjà triés par date de création

  return {
    total: activeEmployees.length,
    byRole,
    recentlyAdded,
  }
}

// Obtenir les employés par rôle
export async function getEmployeesByRole(role: string): Promise<Employee[]> {
  const allEmployees = await getEmployees()
  return allEmployees.filter((emp) => emp.role.toLowerCase().includes(role.toLowerCase()))
}
