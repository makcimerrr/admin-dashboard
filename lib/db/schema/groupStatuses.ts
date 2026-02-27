import { pgTable, serial, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const groupStatuses = pgTable(
  'group_statuses',
  {
    id: serial('id').primaryKey(),
    groupId: varchar('group_id', { length: 100 }).notNull(),
    promoId: varchar('promo_id', { length: 50 }).notNull(),
    projectName: varchar('project_name', { length: 100 }).notNull(),
    status: varchar('status', { length: 30 }).notNull(),
    captainLogin: varchar('captain_login', { length: 100 }),
    notifiedAuditAt: timestamp('notified_audit_at'),
    slotDate: timestamp('slot_date'),
    slotBookedAt: timestamp('slot_booked_at'),
    slotEventId: varchar('slot_event_id', { length: 200 }),
    slotAttendeeEmail: varchar('slot_attendee_email', { length: 200 }),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueGroupStatusIdx: uniqueIndex('idx_group_status_unique').on(
      table.groupId,
      table.promoId,
      table.projectName
    ),
  })
);
