import { pgTable, text, timestamp, boolean, uuid, index } from "drizzle-orm/pg-core"

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    avatar: text("avatar"),
    color: text("color").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").default(""),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("employees_email_idx").on(table.email),
    activeIdx: index("employees_active_idx").on(table.isActive),
  }),
)

// Types TypeScript pour les employés
export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert

export interface CreateEmployeeData {
  name: string
  role: string
  avatar?: string
  color: string
  email: string
  phone?: string
}

export interface UpdateEmployeeData {
  name?: string
  role?: string
  avatar?: string
  color?: string
  email?: string
  phone?: string
  isActive?: boolean
}
