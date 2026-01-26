import { db } from '../config';
import { promotions, delayStatus } from '../schema';
import { eq, sql, and, or, ne } from 'drizzle-orm';
import {
  students,
  studentProjects,
  studentCurrentProjects,
  studentSpecialtyProgress
} from '@/lib/db/schema';

// ============== TYPES ==============

export interface PromotionInfo {
  promoId: string;
  name: string;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedReason: string | null;
}

export interface StudentTransferResult {
  success: boolean;
  studentId: number;
  login: string;
  fromPromo: string;
  toPromo: string;
  message: string;
}

// ============== ARCHIVAGE ==============

/**
 * Récupère toutes les promotions (actives et archivées)
 */
export async function getAllPromotions(includeArchived = false): Promise<PromotionInfo[]> {
  try {
    const query = db
      .select({
        promoId: promotions.promoId,
        name: promotions.name,
        isArchived: promotions.isArchived,
        archivedAt: promotions.archivedAt,
        archivedReason: promotions.archivedReason
      })
      .from(promotions);

    if (!includeArchived) {
      return await query.where(
        or(eq(promotions.isArchived, false), sql`${promotions.isArchived} IS NULL`)
      ).execute();
    }

    return await query.execute();
  } catch (error) {
    console.error('Erreur lors de la récupération des promotions:', error);
    throw new Error('Impossible de récupérer les promotions.');
  }
}

/**
 * Récupère uniquement les promotions archivées
 */
export async function getArchivedPromotions(): Promise<PromotionInfo[]> {
  try {
    return await db
      .select({
        promoId: promotions.promoId,
        name: promotions.name,
        isArchived: promotions.isArchived,
        archivedAt: promotions.archivedAt,
        archivedReason: promotions.archivedReason
      })
      .from(promotions)
      .where(eq(promotions.isArchived, true))
      .execute();
  } catch (error) {
    console.error('Erreur lors de la récupération des promotions archivées:', error);
    throw new Error('Impossible de récupérer les promotions archivées.');
  }
}

/**
 * Archive une promotion
 * @param promoName - Nom de la promotion (ex: "P1 2022")
 * @param reason - Raison de l'archivage (optionnel)
 */
export async function archivePromotion(promoName: string, reason?: string): Promise<string> {
  try {
    const promo = await db
      .select()
      .from(promotions)
      .where(eq(promotions.name, promoName))
      .execute();

    if (promo.length === 0) {
      throw new Error(`Promotion "${promoName}" non trouvée.`);
    }

    if (promo[0].isArchived) {
      return `La promotion "${promoName}" est déjà archivée.`;
    }

    await db
      .update(promotions)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        archivedReason: reason || null
      })
      .where(eq(promotions.name, promoName))
      .execute();

    return `Promotion "${promoName}" archivée avec succès.`;
  } catch (error) {
    console.error('Erreur lors de l\'archivage de la promotion:', error);
    throw error;
  }
}

/**
 * Désarchive une promotion
 * @param promoName - Nom de la promotion (ex: "P1 2022")
 */
export async function unarchivePromotion(promoName: string): Promise<string> {
  try {
    const promo = await db
      .select()
      .from(promotions)
      .where(eq(promotions.name, promoName))
      .execute();

    if (promo.length === 0) {
      throw new Error(`Promotion "${promoName}" non trouvée.`);
    }

    if (!promo[0].isArchived) {
      return `La promotion "${promoName}" n'est pas archivée.`;
    }

    await db
      .update(promotions)
      .set({
        isArchived: false,
        archivedAt: null,
        archivedReason: null
      })
      .where(eq(promotions.name, promoName))
      .execute();

    return `Promotion "${promoName}" désarchivée avec succès.`;
  } catch (error) {
    console.error('Erreur lors de la désarchivation de la promotion:', error);
    throw error;
  }
}

/**
 * Vérifie si une promotion est archivée
 */
export async function isPromotionArchived(promoName: string): Promise<boolean> {
  try {
    const promo = await db
      .select({ isArchived: promotions.isArchived })
      .from(promotions)
      .where(eq(promotions.name, promoName))
      .execute();

    return promo.length > 0 && promo[0].isArchived === true;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'archivage:', error);
    return false;
  }
}

// ============== TRANSFERT D'ÉTUDIANTS ==============

/**
 * Transfère un étudiant d'une promotion à une autre
 * Utile pour les redoublements ou réorientations
 *
 * @param studentLogin - Login de l'étudiant
 * @param targetPromoName - Nom de la promo de destination
 * @param reason - Raison du transfert (optionnel)
 */
export async function transferStudent(
  studentLogin: string,
  targetPromoName: string,
  reason?: string
): Promise<StudentTransferResult> {
  try {
    // Vérifier que l'étudiant existe
    const student = await db
      .select({
        id: students.id,
        login: students.login,
        promoName: students.promoName,
        previousPromo: students.previousPromo
      })
      .from(students)
      .where(eq(students.login, studentLogin))
      .execute();

    if (student.length === 0) {
      return {
        success: false,
        studentId: 0,
        login: studentLogin,
        fromPromo: '',
        toPromo: targetPromoName,
        message: `Étudiant "${studentLogin}" non trouvé.`
      };
    }

    const currentStudent = student[0];
    const fromPromo = currentStudent.promoName;

    // Vérifier que la promo de destination existe
    const targetPromo = await db
      .select()
      .from(promotions)
      .where(eq(promotions.name, targetPromoName))
      .execute();

    if (targetPromo.length === 0) {
      return {
        success: false,
        studentId: currentStudent.id,
        login: studentLogin,
        fromPromo,
        toPromo: targetPromoName,
        message: `Promotion de destination "${targetPromoName}" non trouvée.`
      };
    }

    // Vérifier que la promo de destination n'est pas archivée
    if (targetPromo[0].isArchived) {
      return {
        success: false,
        studentId: currentStudent.id,
        login: studentLogin,
        fromPromo,
        toPromo: targetPromoName,
        message: `Impossible de transférer vers une promotion archivée.`
      };
    }

    // Vérifier que l'étudiant n'est pas déjà dans cette promo
    if (fromPromo === targetPromoName) {
      return {
        success: false,
        studentId: currentStudent.id,
        login: studentLogin,
        fromPromo,
        toPromo: targetPromoName,
        message: `L'étudiant est déjà dans la promotion "${targetPromoName}".`
      };
    }

    // Effectuer le transfert
    await db
      .update(students)
      .set({
        promoName: targetPromoName,
        previousPromo: fromPromo,
        // Réinitialiser le statut de perdition si c'était le cas
        isDropout: false,
        dropoutAt: null,
        dropoutReason: null,
        dropoutNotes: reason ? `Transféré depuis ${fromPromo}: ${reason}` : `Transféré depuis ${fromPromo}`
      })
      .where(eq(students.login, studentLogin))
      .execute();

    return {
      success: true,
      studentId: currentStudent.id,
      login: studentLogin,
      fromPromo,
      toPromo: targetPromoName,
      message: `Étudiant "${studentLogin}" transféré de "${fromPromo}" vers "${targetPromoName}".`
    };
  } catch (error) {
    console.error('Erreur lors du transfert de l\'étudiant:', error);
    throw error;
  }
}

/**
 * Récupère l'historique des transferts d'un étudiant
 */
export async function getStudentTransferHistory(studentLogin: string) {
  try {
    const student = await db
      .select({
        id: students.id,
        login: students.login,
        firstName: students.first_name,
        lastName: students.last_name,
        currentPromo: students.promoName,
        previousPromo: students.previousPromo,
        isDropout: students.isDropout,
        dropoutNotes: students.dropoutNotes
      })
      .from(students)
      .where(eq(students.login, studentLogin))
      .execute();

    if (student.length === 0) {
      return null;
    }

    return student[0];
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    throw error;
  }
}

/**
 * Récupère tous les étudiants transférés (qui ont un previousPromo mais ne sont PAS en perdition)
 */
export async function getTransferredStudents(promoName?: string) {
  try {
    // Condition de base : a une previousPromo ET n'est pas en perdition
    const baseConditions = and(
      sql`${students.previousPromo} IS NOT NULL`,
      or(eq(students.isDropout, false), sql`${students.isDropout} IS NULL`)
    );

    if (promoName) {
      return await db
        .select({
          id: students.id,
          login: students.login,
          firstName: students.first_name,
          lastName: students.last_name,
          currentPromo: students.promoName,
          previousPromo: students.previousPromo
        })
        .from(students)
        .where(and(
          baseConditions,
          eq(students.promoName, promoName)
        ))
        .execute();
    }

    return await db
      .select({
        id: students.id,
        login: students.login,
        firstName: students.first_name,
        lastName: students.last_name,
        currentPromo: students.promoName,
        previousPromo: students.previousPromo
      })
      .from(students)
      .where(baseConditions)
      .execute();
  } catch (error) {
    console.error('Erreur lors de la récupération des étudiants transférés:', error);
    throw error;
  }
}

/**
 * Ajoute une promotion à la base de données.
 * @param promoId - ID unique de la promotion.
 * @param name - Nom ou description de la promotion.
 * @returns Un message de succès ou une erreur si la promo existe déjà.
 */
export async function addPromotion(
  promoId: string,
  name: string
): Promise<string> {
  try {
    // Vérifie si la promotion existe déjà
    const existingPromo = await db
      .select()
      .from(promotions)
      .where(eq(promotions.promoId, promoId))
      .execute();

    if (existingPromo.length > 0) {
      return `La promotion avec l'ID "${promoId}" existe déjà.`;
    }

    // Ajoute la nouvelle promotion
    await db.insert(promotions).values({ promoId, name }).execute();

    return `Promotion "${name}" (ID: ${promoId}) ajoutée avec succès.`;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la promotion:", error);
    throw new Error("Impossible d'ajouter la promotion.");
  }
}

/**
 * Supprime une promotion de la base de données.
 * @param key - Clé de la promotion.
 * @returns Un message de succès ou une erreur si la promo n'existe pas.
 */
export async function deletePromotion(key: string): Promise<string> {
  try {
    // Vérifier si la promotion existe
    const existingPromo = await db
      .select()
      .from(promotions)
      .where(eq(promotions.name, key))
      .execute();

    if (existingPromo.length === 0) {
      return `La promotion avec le nom "${key}" n'existe pas.`;
    }

    // Supprimer la promotion
    await db.delete(promotions).where(eq(promotions.name, key)).execute();

    return `Promotion "${key}" supprimée avec succès.`;
  } catch (error) {
    console.error('Erreur lors de la suppression de la promotion:', error);
    throw new Error('Impossible de supprimer la promotion.');
  }
}

/**
 * Initialise les compteurs de statut de retard pour une promotion spécifique.
 * @param promoId L'ID unique de la promotion.
 */
export async function addDelayCountersForPromo(
  promoId: string
): Promise<string> {
  try {
    // Vérifier si la promo a déjà des compteurs dans la table delay_status
    const existingEntry = await db
      .select()
      .from(delayStatus)
      .where(eq(delayStatus.promoId, promoId));

    if (existingEntry.length > 0) {
      return `Les compteurs pour la promotion ${promoId} existent déjà.`;
    }

    // Insérer une nouvelle ligne pour la promotion avec les compteurs initialisés à 0
    await db.insert(delayStatus).values({
      promoId,
      lateCount: 0,
      goodLateCount: 0,
      advanceLateCount: 0,
      specialityCount: 0,
      lastUpdate: new Date()
    });

    return `Les compteurs pour la promotion ${promoId} ont été ajoutés avec succès.`;
  } catch (error) {
    console.error(`Erreur lors de l'ajout des compteurs :`, error);
    throw new Error(`Erreur lors de l'ajout des compteurs pour la promotion.`);
  }
}

export async function getAverageDelaysByMonth(promoId: string) {
  return await db
    .select({
      month: sql`DATE_TRUNC('month', ${delayStatus.lastUpdate})`.as('month'),
      avgLateCount: sql`AVG(${delayStatus.lateCount})`.as('avgLateCount'),
      avgGoodLateCount: sql`AVG(${delayStatus.goodLateCount})`.as(
        'avgGoodLateCount'
      )
    })
    .from(delayStatus)
    .where(sql`${delayStatus.promoId} = ${promoId}`)
    .groupBy(sql`DATE_TRUNC('month', ${delayStatus.lastUpdate})`)
    .orderBy(sql`DATE_TRUNC('month', ${delayStatus.lastUpdate})`);
}

export async function getDelayStatus(promoId: string): Promise<{
  lateCount: number;
  goodLateCount: number;
  advanceLateCount: number;
  specialityCount: number;
  validatedCount: number;
  notValidatedCount: number;
}> {
  try {
    // Récupérer les données de delayStatus en fonction du promoId
    const delayStatusData = await db
      .select({
        lateCount: delayStatus.lateCount,
        goodLateCount: delayStatus.goodLateCount,
        advanceLateCount: delayStatus.advanceLateCount,
        specialityCount: delayStatus.specialityCount,
        validatedCount: delayStatus.validatedCount,
        notValidatedCount: delayStatus.notValidatedCount
      })
      .from(delayStatus)
      .where(eq(delayStatus.promoId, promoId))
      .orderBy(sql`${delayStatus.lastUpdate} DESC`)
      .limit(1)
      .execute();

    // Vérifier si un résultat a été trouvé
    if (delayStatusData.length === 0) {
      throw new Error(
        `Aucun statut de retard trouvé pour la promotion avec l'ID "${promoId}".`
      );
    }

    // Retourner les valeurs du premier résultat trouvé
    return {
      lateCount: delayStatusData[0].lateCount || 0,
      goodLateCount: delayStatusData[0].goodLateCount || 0,
      advanceLateCount: delayStatusData[0].advanceLateCount || 0,
      specialityCount: delayStatusData[0].specialityCount || 0,
      validatedCount: delayStatusData[0].validatedCount || 0,
      notValidatedCount: delayStatusData[0].notValidatedCount || 0
    };
  } catch (error) {
    console.error(
      'Erreur lors de la recherche des compteurs de retard:',
      error
    );
    throw new Error('Impossible de trouver les compteurs de retard.');
  }
}

export async function fetchStudentsForPromo(promoKey: string, includeDropouts = false) {
  try {
    // Exclure les étudiants en perdition par défaut
    const whereCondition = includeDropouts
      ? eq(students.promoName, promoKey)
      : and(eq(students.promoName, promoKey), eq(students.isDropout, false));

    const studentsData = await db
      .select({
        id: students.id,
        last_name: students.last_name,
        first_name: students.first_name,
        login: students.login,
        promos: students.promoName,
        availableAt: students.availableAt,
        actual_project_name: studentProjects.project_name,
        progress_status: studentProjects.progress_status,
        delay_level: studentProjects.delay_level,
        golang_project: studentCurrentProjects.golang_project,
        javascript_project: studentCurrentProjects.javascript_project,
        rust_project: studentCurrentProjects.rust_project,
        golang_completed: studentSpecialtyProgress.golang_completed,
        javascript_completed: studentSpecialtyProgress.javascript_completed,
        rust_completed: studentSpecialtyProgress.rust_completed
      })
      .from(students)
      .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
      .leftJoin(
        studentCurrentProjects,
        eq(students.id, studentCurrentProjects.student_id)
      )
      .leftJoin(
        studentSpecialtyProgress,
        eq(students.id, studentSpecialtyProgress.student_id)
      )
      .where(whereCondition);

    return studentsData;
  } catch (error) {
    console.error(`Error fetching students for ${promoKey}:`, error);
    return [];
  }
}