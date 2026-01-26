import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { importAuditsFromCsv, clearAllAudits, type CsvAuditRow } from '@/lib/services/import-audits';

/**
 * POST /api/code-reviews/import
 *
 * Importe les audits depuis le fichier CSV à la racine du projet.
 * Cette version matche les étudiants aux vrais groupes Zone01.
 *
 * Query params:
 * - clear=true : Supprime tous les audits existants avant l'import
 */
export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const shouldClear = searchParams.get('clear') === 'true';

        // Optionally clear existing audits
        let clearedCount = 0;
        if (shouldClear) {
            clearedCount = await clearAllAudits();
        }

        // Lire le fichier CSV
        const csvPath = path.join(process.cwd(), 'BDD Code Review 21edf8ebc8e780169caef523ad74e3aa_all.csv');

        let csvContent: string;
        try {
            csvContent = await fs.readFile(csvPath, 'utf-8');
        } catch {
            return NextResponse.json(
                { error: 'Fichier CSV non trouvé à la racine du projet' },
                { status: 404 }
            );
        }

        // Parser le CSV
        const parseResult = Papa.parse<CsvAuditRow>(csvContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
        });

        if (parseResult.errors.length > 0) {
            return NextResponse.json(
                {
                    error: 'Erreurs de parsing CSV',
                    details: parseResult.errors.slice(0, 10),
                },
                { status: 400 }
            );
        }

        // Importer les données
        const result = await importAuditsFromCsv(parseResult.data);

        return NextResponse.json({
            success: true,
            clearedBefore: clearedCount,
            ...result,
            // Limiter les détails retournés
            details: {
                matched: result.details.matched.slice(0, 20),
                unmatched: result.details.unmatched.slice(0, 50),
                hasMoreMatched: result.details.matched.length > 20,
                hasMoreUnmatched: result.details.unmatched.length > 50,
            },
            errors: result.errors.slice(0, 20),
            hasMoreErrors: result.errors.length > 20,
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erreur interne' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/code-reviews/import
 *
 * Supprime tous les audits existants.
 */
export async function DELETE() {
    try {
        const count = await clearAllAudits();
        return NextResponse.json({
            success: true,
            deleted: count,
        });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erreur interne' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/code-reviews/import
 *
 * Retourne un aperçu du fichier CSV sans importer.
 */
export async function GET() {
    try {
        const csvPath = path.join(process.cwd(), 'BDD Code Review 21edf8ebc8e780169caef523ad74e3aa_all.csv');

        let csvContent: string;
        try {
            csvContent = await fs.readFile(csvPath, 'utf-8');
        } catch {
            return NextResponse.json(
                { error: 'Fichier CSV non trouvé' },
                { status: 404 }
            );
        }

        const parseResult = Papa.parse<CsvAuditRow>(csvContent, {
            header: true,
            skipEmptyLines: true,
            preview: 10, // Seulement les 10 premières lignes
        });

        // Analyser les promotions uniques
        const fullParse = Papa.parse<CsvAuditRow>(csvContent, {
            header: true,
            skipEmptyLines: true,
        });

        const promos = new Set<string>();
        const projets = new Set<string>();
        const auditeurs = new Set<string>();

        fullParse.data.forEach(row => {
            if (row.Promotion) {
                row.Promotion.split(',').forEach(p => promos.add(p.trim()));
            }
            if (row.Projet) projets.add(row.Projet);
            if (row['Effectuée par']) auditeurs.add(row['Effectuée par']);
        });

        return NextResponse.json({
            totalRows: fullParse.data.length,
            preview: parseResult.data,
            stats: {
                promotions: Array.from(promos).sort(),
                projets: Array.from(projets).sort(),
                auditeurs: Array.from(auditeurs).sort(),
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erreur' },
            { status: 500 }
        );
    }
}
