#!/usr/bin/env tsx
/**
 * Exporte vers Excel :
 *  - Une feuille par promo avec la timeline des projets (Golang, JS, Rust, Java)
 *  - Une feuille par promo avec le récap des audits par étudiant
 *
 * Usage: npx tsx scripts/export-excel.ts
 * Génère: exports/timeline-audits.xlsx
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { inArray, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { promoConfig } from '../lib/db/schema/promoConfig';
import { projects } from '../lib/db/schema/projects';
import { audits, auditResults } from '../lib/db/schema/audits';

config();

const EVENT_IDS = [32, 148, 216];
const PROMO_IDS = ['32', '148', '216'];
const TRACKS = ['Golang', 'Javascript', 'Rust', 'Java'] as const;

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const TRACK_COLORS: Record<string, { bg: string; font: string }> = {
  Golang:     { bg: 'FF00ADD8', font: 'FFFFFFFF' },
  Javascript: { bg: 'FFF7DF1E', font: 'FF1A1A1A' },
  Rust:       { bg: 'FFCE4A1E', font: 'FFFFFFFF' },
  Java:       { bg: 'FF007396', font: 'FFFFFFFF' },
};

const HEADER_BG     = 'FF2D3748';
const HEADER_FONT   = 'FFFFFFFF';
const ROW_ALT_BG    = 'FFF7FAFC';
const ROW_EVEN_BG   = 'FFFFFFFF';
const SECTION_BG    = 'FFEDF2F7';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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

function applyHeader(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    bottom: { style: 'thin', color: { argb: 'FF718096' } },
  };
}

function applyTrackLabel(cell: ExcelJS.Cell, track: string) {
  const colors = TRACK_COLORS[track] ?? { bg: 'FF718096', font: 'FFFFFFFF' };
  cell.value = track;
  cell.font = { bold: true, color: { argb: colors.font }, size: 10 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

function applyRowBg(row: ExcelJS.Row, isAlt: boolean) {
  const bg = isAlt ? ROW_ALT_BG : ROW_EVEN_BG;
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (!cell.fill || (cell.fill as any).fgColor?.argb === ROW_ALT_BG || (cell.fill as any).fgColor?.argb === ROW_EVEN_BG) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    }
    cell.alignment = { vertical: 'middle', ...cell.alignment };
  });
}

// ─── Feuille TIMELINE ─────────────────────────────────────────────────────────

async function writeTimelineSheet(
  sheet: ExcelJS.Worksheet,
  promo: any,
  projectsByTrack: Record<string, any[]>
) {
  sheet.properties.defaultRowHeight = 20;

  // ── En-tête promo ──
  const infoRow = sheet.addRow([
    `Promotion : ${promo.title}`,
    '', '', '', '',
    `Début promo : ${promo.start}`,
    `Fin promo : ${promo.end}`,
  ]);
  infoRow.height = 24;
  infoRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1A202C' } };
  infoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.mergeCells(infoRow.number, 1, infoRow.number, 5);
  [6, 7].forEach(col => {
    infoRow.getCell(col).font = { italic: true, size: 10, color: { argb: 'FF4A5568' } };
    infoRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  });

  // Piscines
  const piscineRow = sheet.addRow([
    `Piscine JS : ${promo.piscineJsStart ?? 'N/A'} → ${promo.piscineJsEnd ?? 'N/A'}`,
    '', '', '', '',
    `Piscine Rust/Java : ${promo.piscineRustStart ?? 'N/A'} → ${promo.piscineRustEnd ?? 'N/A'}`,
  ]);
  piscineRow.height = 18;
  sheet.mergeCells(piscineRow.number, 1, piscineRow.number, 5);
  [1, 6].forEach(col => {
    piscineRow.getCell(col).font = { italic: true, size: 10, color: { argb: 'FF4A5568' } };
    piscineRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } };
  });

  sheet.addRow([]); // espace

  // ── En-têtes colonnes ──
  const headers = ['Track', 'Projet', 'Durée (sem.)', 'Début', 'Fin'];
  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;
  headers.forEach((_, i) => applyHeader(headerRow.getCell(i + 1), headers[i]));

  // ── Colonnes width ──
  sheet.columns = [
    { key: 'track',    width: 16 },
    { key: 'project',  width: 28 },
    { key: 'weeks',    width: 14 },
    { key: 'start',    width: 16 },
    { key: 'end',      width: 16 },
  ];

  // ── Données ──
  let rowIdx = 0;
  for (const track of TRACKS) {
    const trackProjects = projectsByTrack[track] ?? [];
    if (trackProjects.length === 0) continue;

    const start = trackStart(promo, track);
    if (!start) continue;

    let cursor = new Date(start);

    for (const p of trackProjects) {
      const winStart = new Date(cursor);
      const winEnd = addWeeks(cursor, p.projectTimeWeek);
      const winEndDisplay = addDays(winEnd, -1);

      const dataRow = sheet.addRow([
        track,
        p.name,
        p.projectTimeWeek,
        fmtDate(winStart),
        fmtDate(winEndDisplay),
      ]);
      dataRow.height = 20;

      // Track coloré
      applyTrackLabel(dataRow.getCell(1), track);

      // Données
      const isAlt = rowIdx % 2 === 1;
      const bg = isAlt ? ROW_ALT_BG : ROW_EVEN_BG;
      [2, 3, 4, 5].forEach(col => {
        const cell = dataRow.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { vertical: 'middle', horizontal: col === 3 ? 'center' : 'left' };
        cell.font = { size: 10, color: { argb: 'FF1A202C' } };
        if (col === 3) cell.numFmt = '0';
      });

      cursor = winEnd;
      rowIdx++;
    }
  }

  // Freeze header
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];
}

// ─── Feuille ÉTUDIANTS ────────────────────────────────────────────────────────

async function writeStudentsSheet(
  sheet: ExcelJS.Worksheet,
  promo: any,
  studentRows: any[]
) {
  sheet.properties.defaultRowHeight = 20;

  // ── En-tête promo ──
  const infoRow = sheet.addRow([`Promotion : ${promo.title} — Récapitulatif des audits par étudiant`]);
  infoRow.height = 24;
  infoRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1A202C' } };
  infoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.mergeCells(infoRow.number, 1, infoRow.number, 7);

  sheet.addRow([]); // espace

  // ── En-têtes ──
  const headers = ['Étudiant', 'Track', 'Projet', 'Date audit', 'Auditeur', 'Validé', 'Absent'];
  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;
  headers.forEach((_, i) => applyHeader(headerRow.getCell(i + 1), headers[i]));

  sheet.columns = [
    { key: 'student',  width: 22 },
    { key: 'track',    width: 15 },
    { key: 'project',  width: 26 },
    { key: 'date',     width: 14 },
    { key: 'auditor',  width: 22 },
    { key: 'valid',    width: 10 },
    { key: 'absent',   width: 10 },
  ];

  // Grouper par étudiant
  const byStudent = new Map<string, typeof studentRows>();
  for (const r of studentRows) {
    if (!byStudent.has(r.studentLogin)) byStudent.set(r.studentLogin, []);
    byStudent.get(r.studentLogin)!.push(r);
  }

  const students = [...byStudent.keys()].sort();
  let studentIdx = 0;

  for (const login of students) {
    const entries = byStudent.get(login)!;
    const validatedCount = entries.filter(e => e.validated && !e.absent).length;
    const absentCount = entries.filter(e => e.absent).length;
    const studentBg = studentIdx % 2 === 0 ? 'FFEDF2F7' : 'FFF7FAFC';

    // Ligne de sous-titre étudiant (fusionnée)
    const studentLabelRow = sheet.addRow([
      `${login}`,
      `${validatedCount}/${entries.length} validés${absentCount > 0 ? ` | ${absentCount} absent(s)` : ''}`,
    ]);
    studentLabelRow.height = 22;
    studentLabelRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF2D3748' } };
    studentLabelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: studentBg } };
    studentLabelRow.getCell(2).font = { italic: true, size: 10, color: { argb: 'FF4A5568' } };
    studentLabelRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: studentBg } };
    sheet.mergeCells(studentLabelRow.number, 2, studentLabelRow.number, 7);

    // Ligne par audit
    let rowIdx = 0;
    for (const e of entries) {
      const isAlt = rowIdx % 2 === 1;
      const bg = isAlt ? 'FFFFFFFF' : 'FFF0F4F8';

      const dataRow = sheet.addRow([
        '',
        e.track,
        e.projectName,
        fmtDate(new Date(e.createdAt)),
        e.auditorName,
        e.validated && !e.absent ? 'Oui' : 'Non',
        e.absent ? 'Oui' : 'Non',
      ]);
      dataRow.height = 19;

      // Track coloré
      applyTrackLabel(dataRow.getCell(2), e.track);

      [1, 3, 4, 5, 6, 7].forEach(col => {
        const cell = dataRow.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { vertical: 'middle', horizontal: col >= 6 ? 'center' : 'left' };
        cell.font = { size: 10, color: { argb: 'FF1A202C' } };
      });

      // Couleur statut
      const validCell = dataRow.getCell(6);
      if (e.absent) {
        dataRow.getCell(7).font = { bold: true, size: 10, color: { argb: 'FFCC0000' } };
      } else if (e.validated) {
        validCell.font = { bold: true, size: 10, color: { argb: 'FF276749' } };
      } else {
        validCell.font = { bold: true, size: 10, color: { argb: 'FFCC0000' } };
      }

      rowIdx++;
    }

    studentIdx++;
  }

  // Freeze
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Données DB
  const promos = await db.select().from(promoConfig).where(inArray(promoConfig.eventId, EVENT_IDS));
  promos.sort((a, b) => a.eventId - b.eventId);

  const allProjects = await db.select().from(projects).orderBy(projects.sort_index);
  const projectsByTrack: Record<string, typeof allProjects> = {};
  for (const p of allProjects) {
    if (!projectsByTrack[p.category]) projectsByTrack[p.category] = [];
    projectsByTrack[p.category].push(p);
  }

  // Tous les audit_results par promo
  const allResults = await db
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
    .orderBy(auditResults.studentLogin, audits.createdAt);

  // Créer le workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Admin Dashboard';
  wb.created = new Date();

  for (const promo of promos) {
    const promoId = String(promo.eventId);
    const shortTitle = promo.title.replace('Promotion ', 'P').replace(' - Année ', ' ');

    // Feuille Timeline
    const tlSheet = wb.addWorksheet(`${shortTitle} – Timeline`, {
      pageSetup: { orientation: 'landscape', fitToPage: true },
    });
    await writeTimelineSheet(tlSheet, promo, projectsByTrack);

    // Feuille Étudiants
    const studSheet = wb.addWorksheet(`${shortTitle} – Étudiants`, {
      pageSetup: { orientation: 'portrait', fitToPage: true },
    });
    const promoResults = allResults.filter(r => r.promoId === promoId);
    await writeStudentsSheet(studSheet, promo, promoResults);
  }

  // Écrire le fichier
  const outDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, 'timeline-audits.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`\n✓ Fichier généré : ${outPath}`);
  console.log(`  ${promos.length * 2} feuilles (${promos.length} timelines + ${promos.length} récaps étudiants)`);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
