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
