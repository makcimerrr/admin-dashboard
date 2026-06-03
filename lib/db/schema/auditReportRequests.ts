import { pgTable, serial, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Chantier D — trace des demandes de compte-rendu d'audit envoyées (Discord)
 * aux auditeurs, pour éviter de redemander et afficher l'état.
 * Clé fonctionnelle : (auditorLogin, groupId).
 */
export const auditReportRequests = pgTable(
  'audit_report_requests',
  {
    id: serial('id').primaryKey(),
    auditorLogin: varchar('auditor_login', { length: 100 }).notNull(),
    groupId: varchar('group_id', { length: 100 }).notNull(),
    projectName: varchar('project_name', { length: 100 }),
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueReq: uniqueIndex('idx_audit_report_req_unique').on(table.auditorLogin, table.groupId),
  }),
);

export type AuditReportRequest = typeof auditReportRequests.$inferSelect;
