#!/usr/bin/env tsx
/**
 * 1. Vérifie que les dates (createdAt) des audits seedés correspondent à la timeline.
 * 2. Corrige les dates si nécessaire (--fix).
 * 3. Génère un récapitulatif par étudiant (--summary).
 *
 * Usage:
 *   npx tsx scripts/audit-dates-check.ts          → vérification seule
 *   npx tsx scripts/audit-dates-check.ts --fix     → corrige les dates
 *   npx tsx scripts/audit-dates-check.ts --summary → récap par étudiant
 *   npx tsx scripts/audit-dates-check.ts --fix --summary
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { inArray, eq } from 'drizzle-orm';
import { promoConfig } from '../lib/db/schema/promoConfig';
import { projects } from '../lib/db/schema/projects';
import { audits, auditResults } from '../lib/db/schema/audits';

config();

const FIX = process.argv.includes('--fix');
const SUMMARY = process.argv.includes('--summary');
const EVENT_IDS = [32, 148, 216];
const PROMO_IDS = ['32', '148', '216'];

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

// ─── Timeline builder ─────────────────────────────────────────────────────────

interface ProjectWindow {
  projectName: string;
  track: string;
  start: Date;
  end: Date; // exclusive (début du projet suivant)
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Retourne une date déterministe dans la fenêtre projet, étalée selon l'id */
function deterministicDate(start: Date, end: Date, seed: number): Date {
  const windowMs = end.getTime() - start.getTime();
  // On utilise 10%-90% de la fenêtre pour éviter les extrêmes
  const offset = Math.floor((((seed * 2654435761) >>> 0) % 100) / 100 * windowMs * 0.8 + windowMs * 0.1);
  return new Date(start.getTime() + offset);
}

function trackStart(promo: any, track: string): Date | null {
  switch (track) {
    case 'Golang':
      return promo.start ? new Date(promo.start) : null;
    case 'Javascript':
      if (!promo.piscineJsEnd) return null;
      return addDays(new Date(promo.piscineJsEnd), 1);
    case 'Rust':
    case 'Java':
      if (!promo.piscineRustEnd) return null;
      return addDays(new Date(promo.piscineRustEnd), 1);
    default:
      return null;
  }
}

function buildTimeline(
  promo: any,
  projectsByTrack: Record<string, any[]>
): Map<string, ProjectWindow> {
  // key: `${promoEventId}::${projectName}`
  const map = new Map<string, ProjectWindow>();

  for (const track of ['Golang', 'Javascript', 'Rust', 'Java']) {
    const start = trackStart(promo, track);
    if (!start) continue;
    let cursor = new Date(start);
    for (const p of projectsByTrack[track] ?? []) {
      const winStart = new Date(cursor);
      const winEnd = addWeeks(cursor, p.projectTimeWeek);
      map.set(`${promo.eventId}::${p.name}`, {
        projectName: p.name,
        track,
        start: winStart,
        end: winEnd,
      });
      cursor = winEnd;
    }
  }
  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Récupérer configs promo
  const promos = await db
    .select()
    .from(promoConfig)
    .where(inArray(promoConfig.eventId, EVENT_IDS));
  promos.sort((a, b) => a.eventId - b.eventId);

  // 2. Récupérer tous les projets
  const allProjects = await db.select().from(projects).orderBy(projects.sort_index);
  const projectsByTrack: Record<string, typeof allProjects> = {};
  for (const p of allProjects) {
    if (!projectsByTrack[p.category]) projectsByTrack[p.category] = [];
    projectsByTrack[p.category].push(p);
  }

  // 3. Construire les timelines par promo
  const timelines = new Map<number, Map<string, ProjectWindow>>();
  for (const promo of promos) {
    timelines.set(promo.eventId, buildTimeline(promo, projectsByTrack));
  }

  // 4. Récupérer tous les audits des 3 promos
  const allAudits = await db
    .select()
    .from(audits)
    .where(inArray(audits.promoId, PROMO_IDS))
    .orderBy(audits.promoId, audits.track, audits.projectName);

  // 5. Vérification + correction
  console.log(`\n${'═'.repeat(70)}`);
  console.log('VÉRIFICATION DES DATES');
  console.log(`${'═'.repeat(70)}`);

  let ok = 0;
  let wrong = 0;
  let notFound = 0;
  const fixes: { id: number; newDate: Date; promoId: string; project: string }[] = [];

  for (const audit of allAudits) {
    const promoEventId = parseInt(audit.promoId, 10);
    const tl = timelines.get(promoEventId);
    if (!tl) continue;

    const window = tl.get(`${promoEventId}::${audit.projectName}`);
    if (!window) {
      console.log(`  ⚠ Projet introuvable dans timeline: promo=${audit.promoId} project="${audit.projectName}"`);
      notFound++;
      continue;
    }

    const auditDate = new Date(audit.createdAt);
    const inWindow = auditDate >= window.start && auditDate < window.end;

    if (inWindow) {
      ok++;
    } else {
      const correctDate = deterministicDate(window.start, window.end, audit.id);
      console.log(
        `  ✗ promo=${audit.promoId} [${audit.track}] ${audit.projectName.padEnd(20)} ` +
        `audit=${fmtDate(auditDate)} | attendu dans [${fmtDate(window.start)} → ${fmtDate(addDays(window.end, -1))}]` +
        (FIX ? ` → fix: ${fmtDate(correctDate)}` : '')
      );
      wrong++;
      fixes.push({ id: audit.id, newDate: correctDate, promoId: audit.promoId, project: audit.projectName });
    }
  }

  console.log(`\n  Résultat: ${ok} OK / ${wrong} hors-fenêtre / ${notFound} projet inconnu`);

  // 6. Correction des dates si --fix
  if (FIX && fixes.length > 0) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`CORRECTION DE ${fixes.length} AUDITS`);
    console.log(`${'═'.repeat(70)}`);
    let fixed = 0;
    for (const f of fixes) {
      await db.update(audits).set({ createdAt: f.newDate, updatedAt: f.newDate }).where(eq(audits.id, f.id));
      fixed++;
    }
    console.log(`  ✓ ${fixed} audits mis à jour.`);
  }

  // 7. Récapitulatif par étudiant si --summary
  if (SUMMARY) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log('RÉCAPITULATIF PAR ÉTUDIANT');
    console.log(`${'═'.repeat(70)}`);

    // Jointure audit_results → audits
    const results = await db
      .select({
        studentLogin: auditResults.studentLogin,
        validated: auditResults.validated,
        absent: auditResults.absent,
        promoId: audits.promoId,
        track: audits.track,
        projectName: audits.projectName,
        auditorName: audits.auditorName,
        createdAt: audits.createdAt,
      })
      .from(auditResults)
      .innerJoin(audits, eq(auditResults.auditId, audits.id))
      .where(inArray(audits.promoId, PROMO_IDS))
      .orderBy(auditResults.studentLogin, audits.promoId, audits.createdAt);

    // Grouper par étudiant
    const byStudent = new Map<string, typeof results>();
    for (const r of results) {
      if (!byStudent.has(r.studentLogin)) byStudent.set(r.studentLogin, []);
      byStudent.get(r.studentLogin)!.push(r);
    }

    const students = [...byStudent.keys()].sort();
    console.log(`\n  ${students.length} étudiants trouvés\n`);

    for (const login of students) {
      const entries = byStudent.get(login)!;
      const validatedCount = entries.filter(e => e.validated && !e.absent).length;
      const absentCount = entries.filter(e => e.absent).length;

      console.log(`\n  ── ${login} ──  (${validatedCount}/${entries.length} validés, ${absentCount} absent)`);

      // Grouper par promo
      const byPromo = new Map<string, typeof results>();
      for (const e of entries) {
        if (!byPromo.has(e.promoId)) byPromo.set(e.promoId, []);
        byPromo.get(e.promoId)!.push(e);
      }

      for (const promoId of ['32', '148', '216']) {
        const promoEntries = byPromo.get(promoId);
        if (!promoEntries) continue;
        const promoLabel = promos.find(p => String(p.eventId) === promoId)?.title ?? `Promo ${promoId}`;
        console.log(`    [Promo ${promoId} — ${promoLabel}]`);
        for (const e of promoEntries) {
          const status = e.absent ? '🔴 ABSENT' : e.validated ? '✅' : '❌';
          const date = fmtDate(new Date(e.createdAt));
          console.log(
            `      ${status}  ${String(e.track).padEnd(12)} ${String(e.projectName).padEnd(22)} ${date}  (auditeur: ${e.auditorName})`
          );
        }
      }
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
