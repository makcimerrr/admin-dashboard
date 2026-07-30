import { pgTable, text, timestamp, serial, integer, boolean } from 'drizzle-orm/pg-core';
import { students } from './students';

/**
 * Tirage au sort mensuel « café » : 9–10 apprenants (toutes promos actives,
 * hors archivés / perdition / alternants) invités à un café d'échange.
 *
 * Phase de test : on tire au sort et on affiche la liste sur la page d'accueil
 * du hub. Pas encore de message Discord ni de réactions oui/non — les colonnes
 * `status` (draw) et `participants.status` sont là pour accueillir ce flux plus
 * tard sans nouvelle migration :
 *   - draw.status        : draft → sent → closed
 *   - participant.status : drawn → accepted → declined → replaced
 */
export const coffeeDraws = pgTable('coffee_draws', {
  id: serial('id').primaryKey(),
  // Mois du tirage au format 'YYYY-MM' (informatif : la home affiche le dernier).
  month: text('month').notNull(),
  // Quota effectivement tiré (peut être < demandé si le vivier est plus petit).
  quota: integer('quota').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const coffeeDrawParticipants = pgTable('coffee_draw_participants', {
  id: serial('id').primaryKey(),
  drawId: integer('draw_id')
    .notNull()
    .references(() => coffeeDraws.id, { onDelete: 'cascade' }),
  studentId: integer('student_id')
    .notNull()
    .references(() => students.id),
  // Snapshot des infos d'affichage au moment du tirage : la liste reste lisible
  // même si l'apprenant change de promo / est archivé ensuite.
  login: text('login').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  promoName: text('promo_name').notNull(),
  // Snapshot du statut alternant au moment du tirage → tag affiché en face du nom.
  isAlternant: boolean('is_alternant').notNull().default(false),
  status: text('status').notNull().default('drawn'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type CoffeeDraw = typeof coffeeDraws.$inferSelect;
export type CoffeeDrawParticipant = typeof coffeeDrawParticipants.$inferSelect;
