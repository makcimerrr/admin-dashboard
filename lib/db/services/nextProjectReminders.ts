import { db } from '../config';
import { nextProjectReminders, type NextProjectReminder } from '../schema/nextProjectReminders';
import { and, eq } from 'drizzle-orm';

/**
 * Enregistre (ou récupère) la détection « fini-précédent + sans-groupe-suivant »
 * pour un (étudiant, promo, projet suivant).
 *
 * `onConflictDoNothing` préserve le `detectedAt` initial (date de 1ʳᵉ détection),
 * ce qui permet de mesurer le délai de grâce. Retourne la ligne complète.
 */
export async function upsertDetection(
  login: string,
  promoId: string,
  nextProjectName: string,
): Promise<NextProjectReminder> {
  await db
    .insert(nextProjectReminders)
    .values({ login, promoId, nextProjectName })
    .onConflictDoNothing({
      target: [
        nextProjectReminders.login,
        nextProjectReminders.promoId,
        nextProjectReminders.nextProjectName,
      ],
    });

  const rows = await db
    .select()
    .from(nextProjectReminders)
    .where(
      and(
        eq(nextProjectReminders.login, login),
        eq(nextProjectReminders.promoId, promoId),
        eq(nextProjectReminders.nextProjectName, nextProjectName),
      ),
    )
    .limit(1);

  return rows[0];
}

/**
 * Marque le DM comme envoyé (idempotence : on ne renotifiera plus).
 */
export async function markNextProjectNotified(
  login: string,
  promoId: string,
  nextProjectName: string,
): Promise<void> {
  await db
    .update(nextProjectReminders)
    .set({ notifiedAt: new Date() })
    .where(
      and(
        eq(nextProjectReminders.login, login),
        eq(nextProjectReminders.promoId, promoId),
        eq(nextProjectReminders.nextProjectName, nextProjectName),
      ),
    );
}
