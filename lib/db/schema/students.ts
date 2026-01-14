import { pgTable, text, timestamp, serial, integer, boolean } from 'drizzle-orm/pg-core';
import { promotions } from './promotions';
import { createInsertSchema } from 'drizzle-zod';

// Student related schemas
export const students = pgTable('students', {
    id: serial('id').primaryKey(),
    last_name: text('last_name').notNull(),
    first_name: text('first_name').notNull(),
    login: text('login').notNull(),
    availableAt: timestamp('available_at').notNull(),
    promoName: text('promo_name')
        .notNull()
        .references(() => promotions.name)
});

export const studentProjects = pgTable('student_projects', {
    id: serial('id').primaryKey(),
    student_id: integer('student_id').references(() => students.id),
    project_name: text('project_name').notNull(),
    progress_status: text('progress_status').notNull(),
    delay_level: text('delay_level').notNull()
});

export const studentSpecialtyProgress = pgTable('student_specialty_progress', {
    id: serial('id').primaryKey(),
    student_id: integer('student_id').references(() => students.id), // Lien vers la table students
    golang_completed: boolean('golang_completed').notNull(),
    javascript_completed: boolean('javascript_completed').notNull(),
    rust_completed: boolean('rust_completed').notNull(),
    java_completed: boolean('java_completed').notNull()
});

export const studentCurrentProjects = pgTable('student_current_projects', {
    id: serial('id').primaryKey(),
    student_id: integer('student_id').references(() => students.id), // Lien vers la table students
    golang_project: text('golang_project'),
    golang_project_status: text('golang_project_status'),
    javascript_project: text('javascript_project'),
    javascript_project_status: text('javascript_project_status'),
    rust_project: text('rust_project'),
    rust_project_status: text('rust_project_status'),
    java_project: text('java_project'),
    java_project_status: text('java_project_status')
});

export const insertStudentSchema = createInsertSchema(students);

export type SelectStudent = {
    id: number;
    last_name: string;
    first_name: string;
    login: string;
    promos: string;
    availableAt: Date;
    actual_project_name: string | null;
    progress_status: string | null;
    delay_level: string | null;
    golang_project: string | null;
    golang_project_status: string | null;
    javascript_project: string | null;
    javascript_project_status: string | null;
    rust_project: string | null;
    rust_project_status: string | null;
    java_project: string | null;
    java_project_status: string | null;
    golang_completed: boolean | null;
    javascript_completed: boolean | null;
    rust_completed: boolean | null;
    java_completed: boolean | null;
};