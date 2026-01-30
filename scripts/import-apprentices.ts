#!/usr/bin/env tsx

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';

import { students } from '../lib/db/schema/students';
import {
  alternantDocuments,
  DOCUMENT_TYPES,
  DocumentType
} from '../lib/db/schema/alternants';

config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

const db = drizzle(pool);

type CsvRow = {
  Photo: string;
  Nom: string;
  'Prénom': string;
  CERFA: string;
  'Convention alternance': string;
  'Planning Alternance': string;
  'Date Début Alt/Stag': string;
  'Date fin Alt/Stag': string;
  'Nb année Alt': string;
  Promo: string;
  Entreprises: string;
  Login: string;
};

function parseFrenchDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('/');
  if (parts.length !== 3) {
    console.warn(`⚠️ Date au format inattendu: "${input}"`);
    return null;
  }

  const [dayStr, monthStr, yearStr] = parts;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (!day || !month || !year) {
    console.warn(`⚠️ Date invalide: "${input}"`);
    return null;
  }

  return new Date(year, month - 1, day);
}

function buildFileUrl(path: string): string {
  const base = process.env.ALTERNANT_DOCS_BASE_URL || '';
  // Si le chemin est déjà une URL absolue, on le garde tel quel
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${base}${path}`;
}

function normalizeDocumentsList(value: string | undefined | null): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  // Les champs peuvent contenir plusieurs fichiers séparés par des virgules
  return trimmed
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function guessMimeType(filePath: string): string | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}

function safeDocumentType(type: DocumentType | string): DocumentType {
  // Si déjà connu, on renvoie tel quel
  if ((DOCUMENT_TYPES as readonly string[]).includes(type)) {
    return type as DocumentType;
  }
  return 'autre';
}

async function ensureTablesExist() {
  // Vérifier si la table alternant_documents existe
  const checkTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'alternant_documents'
    );
  `);

  if (!checkTable.rows[0].exists) {
    console.log('⚠️  Les tables alternants n\'existent pas. Application de la migration...\n');
    const migrationPath = resolve(process.cwd(), 'drizzle/migrations/0009_add_alternant_contracts_documents.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    await pool.query(migrationSQL);
    console.log('✅ Migration appliquée avec succès!\n');
  }
}

async function importApprentices() {
  console.log('🔄 Import des alternants depuis "BDD Apprentices.csv"...\n');

  // S'assurer que les tables existent
  await ensureTablesExist();

  const csvPath = resolve(process.cwd(), 'BDD Apprentices.csv');
  const fileContent = readFileSync(csvPath, 'utf8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as CsvRow[];

  const results = {
    processed: 0,
    updatedStudents: 0,
    createdDocuments: 0,
    skippedNoLogin: 0,
    skippedStudentNotFound: 0
  };

  for (const row of records) {
    results.processed++;
    const login = (row.Login || '').trim();

    if (!login) {
      results.skippedNoLogin++;
      console.warn('⚠️ Ligne ignorée (pas de login):', row.Nom, row['Prénom']);
      continue;
    }

    const existing = await db
      .select({
        id: students.id
      })
      .from(students)
      .where(eq(students.login, login))
      .limit(1);

    if (existing.length === 0) {
      results.skippedStudentNotFound++;
      console.warn(`⚠️ Étudiant non trouvé pour le login "${login}" (${row.Nom} ${row['Prénom']})`);
      continue;
    }

    const studentId = existing[0].id;

    const startDate = parseFrenchDate(row['Date Début Alt/Stag']);
    const endDate = parseFrenchDate(row['Date fin Alt/Stag']);

    const companyRaw = (row.Entreprises || '').trim();
    // On enlève le lien Notion éventuel : on garde tout avant la première parenthèse
    const companyNameOnly = companyRaw
      ? companyRaw.split(' (')[0].trim().replace(/,$/, '')
      : '';

    await db
      .update(students)
      .set({
        isAlternant: true,
        alternantStartDate: startDate ?? null,
        alternantEndDate: endDate ?? null,
        companyName: companyNameOnly || null
      })
      .where(eq(students.id, studentId));

    results.updatedStudents++;

    const docsToInsert: {
      documentType: DocumentType;
      title: string;
      description?: string | null;
      rawPaths: string[];
    }[] = [];

    const cerfaList = normalizeDocumentsList(row.CERFA);
    if (cerfaList.length > 0) {
      docsToInsert.push({
        documentType: safeDocumentType('contrat'),
        title: 'CERFA',
        description: null,
        rawPaths: cerfaList
      });
    }

    const conventionList = normalizeDocumentsList(row['Convention alternance']);
    if (conventionList.length > 0) {
      docsToInsert.push({
        documentType: safeDocumentType('convention'),
        title: 'Convention alternance',
        description: null,
        rawPaths: conventionList
      });
    }

    const planningList = normalizeDocumentsList(row['Planning Alternance']);
    if (planningList.length > 0) {
      docsToInsert.push({
        documentType: safeDocumentType('autre'),
        title: 'Planning alternance',
        description: null,
        rawPaths: planningList
      });
    }

    const photoList = normalizeDocumentsList(row.Photo);
    if (photoList.length > 0) {
      docsToInsert.push({
        documentType: safeDocumentType('autre'),
        title: 'Photo alternant',
        description: null,
        rawPaths: photoList
      });
    }

    for (const docGroup of docsToInsert) {
      for (const rawPath of docGroup.rawPaths) {
        const cleanedPath = rawPath.trim();
        if (!cleanedPath) continue;

        const fileUrl = buildFileUrl(cleanedPath);
        const fileName =
          cleanedPath.split('/').filter(Boolean).pop() || cleanedPath;
        const mimeType = guessMimeType(cleanedPath);

        await db.insert(alternantDocuments).values({
          studentId,
          contractId: null,
          documentType: docGroup.documentType,
          title: docGroup.title,
          description: docGroup.description ?? null,
          fileName,
          fileUrl,
          fileSize: null,
          mimeType: mimeType ?? null,
          uploadedAt: new Date(),
          validUntil: null,
          isArchived: false
        });

        results.createdDocuments++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Résultat de l\'import alternants');
  console.log('='.repeat(60));
  console.log(`Lignes lues        : ${results.processed}`);
  console.log(`Étudiants MAJ      : ${results.updatedStudents}`);
  console.log(`Documents créés    : ${results.createdDocuments}`);
  console.log(`Ignorés (sans login): ${results.skippedNoLogin}`);
  console.log(`Ignorés (non trouvés): ${results.skippedStudentNotFound}`);
  console.log('='.repeat(60));

  await pool.end();
  process.exit(0);
}

importApprentices().catch(async (error) => {
  console.error('❌ Erreur fatale lors de l\'import des alternants:', error);
  await pool.end();
  process.exit(1);
});

