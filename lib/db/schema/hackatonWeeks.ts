import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const hackatonWeeks = pgTable("hackaton_weeks", {
  weekKey: text("week_key").primaryKey(),
  isHackaton: boolean("is_hackaton").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type HackatonWeek = typeof hackatonWeeks.$inferSelect;
export type NewHackatonWeek = typeof hackatonWeeks.$inferInsert; 