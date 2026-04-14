/**
 * Script one-shot pour ajouter Nass comme auditeur/reviewer.
 *
 * Usage: npx tsx scripts/add-nass-auditor.ts
 *
 * Requires .env.local with POSTGRES_URL
 */
import 'dotenv/config';
import { db } from '../lib/db/config';
import { reviewers } from '../lib/db/schema/reviewers';
import { eq } from 'drizzle-orm';

async function main() {
  // Check if Nass already exists
  const existing = await db
    .select()
    .from(reviewers)
    .where(eq(reviewers.name, 'Nass'))
    .limit(1);

  if (existing.length > 0) {
    console.log('Nass already exists as reviewer:', existing[0]);
    process.exit(0);
  }

  const [created] = await db
    .insert(reviewers)
    .values({
      name: 'Nass',
      planningUrl: '', // TODO: fill with actual Google Calendar URL
      tracks: ['Golang', 'Javascript', 'Rust', 'Java'],
      excludedPromos: [],
      isActive: true,
    })
    .returning();

  console.log('Created reviewer:', created);
  console.log('NOTE: Update planningUrl via the Config > Reviewers UI.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
