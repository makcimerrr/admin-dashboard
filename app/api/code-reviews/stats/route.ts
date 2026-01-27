import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { audits, auditResults } from '@/lib/db/schema/audits';
import { count, eq } from 'drizzle-orm';

/**
 * GET /api/code-reviews/stats
 * Retourne les statistiques globales des audits
 */
export async function GET() {
    try {
        // Compter les audits
        const [auditsCount] = await db.select({ count: count() }).from(audits);

        // Compter les résultats étudiants
        const [resultsCount] = await db.select({ count: count() }).from(auditResults);

        // Récupérer quelques exemples de résultats
        const sampleResults = await db.query.auditResults.findMany({
            limit: 15,
            with: {
                audit: true,
            },
        });

        // Stats par promo
        const allAudits = await db.query.audits.findMany();
        const byPromo: Record<string, number> = {};
        const byTrack: Record<string, number> = {};
        const byAuditor: Record<string, number> = {};

        for (const a of allAudits) {
            byPromo[a.promoId] = (byPromo[a.promoId] || 0) + 1;
            byTrack[a.track] = (byTrack[a.track] || 0) + 1;
            byAuditor[a.auditorName] = (byAuditor[a.auditorName] || 0) + 1;
        }

        return NextResponse.json({
            totalAudits: auditsCount.count,
            totalStudentResults: resultsCount.count,
            byPromo,
            byTrack,
            byAuditor,
            sampleStudents: sampleResults.map(r => ({
                login: r.studentLogin,
                validated: r.validated,
                project: r.audit?.projectName,
                track: r.audit?.track,
            })),
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
