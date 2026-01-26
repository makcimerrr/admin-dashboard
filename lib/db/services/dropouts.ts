import { db } from '../config';
import { students } from '../schema/students';
import { eq, or, sql } from 'drizzle-orm';

/**
 * Récupère les logins de tous les étudiants en perdition (dropout)
 */
export async function getDropoutLogins(): Promise<Set<string>> {
    const dropouts = await db
        .select({ login: students.login })
        .from(students)
        .where(eq(students.isDropout, true));

    return new Set(dropouts.map(d => d.login.toLowerCase()));
}

/**
 * Récupère les logins actifs (non-dropout) pour une promo
 */
export async function getActiveStudentLogins(promoName: string): Promise<Set<string>> {
    const activeStudents = await db
        .select({ login: students.login })
        .from(students)
        .where(
            sql`${students.promoName} = ${promoName} AND (${students.isDropout} IS NULL OR ${students.isDropout} = false)`
        );

    return new Set(activeStudents.map(s => s.login.toLowerCase()));
}

/**
 * Vérifie si un étudiant est en perdition
 */
export async function isStudentDropout(login: string): Promise<boolean> {
    const result = await db
        .select({ isDropout: students.isDropout })
        .from(students)
        .where(eq(students.login, login))
        .limit(1);

    return result.length > 0 && result[0].isDropout === true;
}
