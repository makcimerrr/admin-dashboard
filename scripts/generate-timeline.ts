#!/usr/bin/env tsx
/**
 * Génère une timeline complète des projets par track et par promo.
 * Pour les promos avec l'eventId 32, 148, 216.
 *
 * Usage: npx tsx scripts/generate-timeline.ts
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { inArray } from 'drizzle-orm';
import { promoConfig } from '../lib/db/schema/promoConfig';
import { projects } from '../lib/db/schema/projects';

config();

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

const EVENT_IDS = [32, 148, 216];
const TRACKS = ['Golang', 'Javascript', 'Rust', 'Java'] as const;

// Date de début par track en fonction des dates de la promo
function trackStartDate(promo: any, track: string): Date | null {
  switch (track) {
    case 'Golang':
      return promo.start ? new Date(promo.start) : null;
    case 'Javascript':
      // Les projets JS commencent le lendemain de la fin de la piscine JS
      if (!promo.piscineJsEnd) return null;
      const jsEnd = new Date(promo.piscineJsEnd);
      jsEnd.setDate(jsEnd.getDate() + 1);
      return jsEnd;
    case 'Rust':
    case 'Java':
      // Les projets Rust/Java commencent le lendemain de la fin de la piscine Rust/Java
      if (!promo.piscineRustEnd) return null;
      const rustEnd = new Date(promo.piscineRustEnd);
      rustEnd.setDate(rustEnd.getDate() + 1);
      return rustEnd;
    default:
      return null;
  }
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  // 1. Récupérer les configs des promos ciblées
  const promos = await db
    .select()
    .from(promoConfig)
    .where(inArray(promoConfig.eventId, EVENT_IDS));

  if (promos.length === 0) {
    console.error('Aucune promo trouvée pour les eventIds:', EVENT_IDS);
    await pool.end();
    return;
  }

  // Trier par eventId
  promos.sort((a, b) => a.eventId - b.eventId);

  // 2. Récupérer tous les projets triés par sort_index
  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(projects.sort_index);

  // Grouper par catégorie
  const projectsByTrack: Record<string, typeof allProjects> = {};
  for (const p of allProjects) {
    if (!projectsByTrack[p.category]) projectsByTrack[p.category] = [];
    projectsByTrack[p.category].push(p);
  }

  // 3. Générer la timeline
  for (const promo of promos) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`PROMO: ${promo.title} (eventId: ${promo.eventId})`);
    console.log(`  Début promo      : ${promo.start}`);
    console.log(`  Piscine JS       : ${promo.piscineJsStart ?? 'N/A'} → ${promo.piscineJsEnd ?? 'N/A'}`);
    console.log(`  Piscine Rust/Java: ${promo.piscineRustStart ?? 'N/A'} → ${promo.piscineRustEnd ?? 'N/A'}`);
    console.log(`  Fin promo        : ${promo.end}`);
    console.log();

    for (const track of TRACKS) {
      const trackProjects = projectsByTrack[track] ?? [];
      if (trackProjects.length === 0) {
        console.log(`  [${track}] Aucun projet trouvé.`);
        continue;
      }

      const start = trackStartDate(promo, track);
      if (!start) {
        console.log(`  [${track}] Dates de piscine manquantes, impossible de calculer la timeline.`);
        continue;
      }

      console.log(`  ── ${track} ─── (début track: ${fmtDate(start)})`);

      let cursor = new Date(start);
      for (const project of trackProjects) {
        const projectStart = new Date(cursor);
        const projectEnd = addWeeks(cursor, project.projectTimeWeek);
        // La fin = début du projet suivant - 1 jour (pour affichage inclusif)
        const projectEndDisplay = new Date(projectEnd);
        projectEndDisplay.setDate(projectEndDisplay.getDate() - 1);

        console.log(
          `    ${String(project.name).padEnd(25)} ${fmtDate(projectStart)} → ${fmtDate(projectEndDisplay)}  (${project.projectTimeWeek}s)`
        );

        cursor = projectEnd;
      }
      console.log();
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
