import { pgTable, text, timestamp, serial, integer, boolean, jsonb, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * Table des audits (Code Reviews)
 *
 * Principe clé : seules les données d'audit sont stockées ici.
 * Les données étudiants/projets/groupes proviennent de l'API Zone01 (source of truth).
 *
 * Clés de liaison :
 * - promoId : identifiant de la promotion Zone01
 * - track : tronc du projet (Golang, Javascript, Rust, Java)
 * - projectName : object.name de l'API Zone01
 * - groupId : group.id de l'API Zone01 (spécifique au projet)
 */
export const audits = pgTable('audits', {
    id: serial('id').primaryKey(),

    // Clés de liaison avec les données Zone01 (pas de FK car données externes)
    promoId: varchar('promo_id', { length: 50 }).notNull(),
    track: varchar('track', { length: 20 }).notNull(),        // Golang | Javascript | Rust | Java
    projectName: varchar('project_name', { length: 100 }).notNull(),
    groupId: varchar('group_id', { length: 100 }).notNull(),  // group.id de l'API

    // Contenu de l'audit
    summary: text('summary'),                                  // Compte rendu global
    warnings: jsonb('warnings').$type<string[]>().default([]), // Warnings globaux

    // Statut et priorité
    priority: varchar('priority', { length: 20 }).default('normal'), // urgent | warning | normal
    isArchived: boolean('is_archived').default(false),
    validatedCount: integer('validated_count').default(0),    // Nombre de validations (dénormalisé)
    totalMembers: integer('total_members').default(0),         // Nombre total de membres

    // Auditeur
    auditorId: integer('auditor_id').references(() => users.id),
    auditorName: varchar('auditor_name', { length: 255 }).notNull(), // Dénormalisé pour affichage rapide

    // Métadonnées
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // Index pour les requêtes fréquentes
    promoTrackIdx: index('idx_audits_promo_track').on(table.promoId, table.track),
    groupIdx: index('idx_audits_group').on(table.groupId),
    createdIdx: index('idx_audits_created').on(table.createdAt),
    // Contrainte d'unicité : un seul audit par groupe/projet/promo
    uniqueAudit: uniqueIndex('idx_audit_unique').on(table.promoId, table.projectName, table.groupId),
}));

/**
 * Table des résultats individuels par étudiant
 *
 * Chaque audit peut contenir plusieurs résultats (un par membre du groupe).
 * Le studentLogin correspond à user.login de l'API Zone01.
 */
export const auditResults = pgTable('audit_results', {
    id: serial('id').primaryKey(),
    auditId: integer('audit_id')
        .references(() => audits.id, { onDelete: 'cascade' })
        .notNull(),

    // Identification étudiant (données API Zone01)
    studentLogin: varchar('student_login', { length: 100 }).notNull(),

    // Évaluation individuelle
    validated: boolean('validated').default(false).notNull(),
    feedback: text('feedback'),
    warnings: jsonb('warnings').$type<string[]>().default([]),

    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    auditIdx: index('idx_audit_results_audit').on(table.auditId),
    studentIdx: index('idx_audit_results_student').on(table.studentLogin),
    // Un étudiant ne peut avoir qu'un seul résultat par audit
    uniqueResult: uniqueIndex('idx_audit_result_unique').on(table.auditId, table.studentLogin),
}));

// Relations Drizzle pour les jointures
export const auditsRelations = relations(audits, ({ many, one }) => ({
    results: many(auditResults),
    auditor: one(users, {
        fields: [audits.auditorId],
        references: [users.id],
    }),
}));

export const auditResultsRelations = relations(auditResults, ({ one }) => ({
    audit: one(audits, {
        fields: [auditResults.auditId],
        references: [audits.id],
    }),
}));

// Troncs valides
export const TRACKS = ['Golang', 'Javascript', 'Rust', 'Java'] as const;
export type Track = typeof TRACKS[number];

// Niveaux de priorité
export const PRIORITIES = ['urgent', 'warning', 'normal'] as const;
export type Priority = typeof PRIORITIES[number];

// Schémas Zod pour validation
export const insertAuditSchema = createInsertSchema(audits);
export const selectAuditSchema = createSelectSchema(audits);
export const insertAuditResultSchema = createInsertSchema(auditResults);
export const selectAuditResultSchema = createSelectSchema(auditResults);

// Types TypeScript dérivés
export type Audit = typeof audits.$inferSelect;
export type NewAudit = typeof audits.$inferInsert;
export type AuditResult = typeof auditResults.$inferSelect;
export type NewAuditResult = typeof auditResults.$inferInsert;

// Type pour un audit avec ses résultats
export type AuditWithResults = Audit & {
    results: AuditResult[];
};
