import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core"
import { employees } from "./employees"
import { z } from "zod"

// Interface pour les créneaux horaires (stockés en JSON)
export interface TimeSlot {
  id?: string
  start: string
  end: string
  isWorking: boolean
  type: "work" | "vacation" | "sick" | "personal"
  note?: string
  createdAt?: Date
  updatedAt?: Date
  isHoliday?: boolean
  isSunday?: boolean
}

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    weekKey: text("week_key").notNull(), // Format: "2024-W01"
    day: text("day").notNull(), // lundi, mardi, etc.
    timeSlots: jsonb("time_slots").notNull().$type<TimeSlot[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    employeeWeekDayIdx: index("schedules_employee_week_day_idx").on(table.employeeId, table.weekKey, table.day),
    weekKeyIdx: index("schedules_week_key_idx").on(table.weekKey),
  }),
)

// Types TypeScript pour les plannings
export type Schedule = typeof schedules.$inferSelect
export type NewSchedule = typeof schedules.$inferInsert

export interface CreateScheduleData {
  employeeId: string
  weekKey: string
  day: string
  timeSlots: Omit<TimeSlot, "id" | "createdAt" | "updatedAt">[]
}

export const timeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
  isWorking: z.boolean(),
  type: z.enum(["work", "vacation", "sick", "personal"]),
  note: z.string().optional(),
  isHoliday: z.boolean().optional(),
  isSunday: z.boolean().optional(),
})

export const scheduleSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  weekKey: z.string(),
  day: z.string(),
  timeSlots: z.array(timeSlotSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Configuration des types de créneaux
export const slotTypeConfig = {
  work: {
    label: "Travail",
    icon: "Clock",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    textColor: "text-primary",
  },
  vacation: {
    label: "Congés",
    icon: "Plane",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
    textColor: "text-warning",
  },
  sick: {
    label: "Arrêt maladie",
    icon: "AlertCircle",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    textColor: "text-destructive",
  },
  personal: {
    label: "Personnel",
    icon: "Coffee",
    bgColor: "bg-muted",
    borderColor: "border-border",
    textColor: "text-muted-foreground",
  },
} as const
