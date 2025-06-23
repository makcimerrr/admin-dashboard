import { relations } from "drizzle-orm"
import { employees } from "./employees"
import { schedules } from "./schedules"

export const employeesRelations = relations(employees, ({ many }) => ({
  schedules: many(schedules),
}))

export const schedulesRelations = relations(schedules, ({ one }) => ({
  employee: one(employees, {
    fields: [schedules.employeeId],
    references: [employees.id],
  }),
}))
