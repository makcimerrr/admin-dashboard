import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, DROPOUT_REASONS } from '@/lib/db/schema/students';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/students/dropouts
 *
 * Récupère tous les étudiants en perdition
 * Query params:
 *   - promo: filtrer par promotion d'origine (optionnel)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const promo = searchParams.get('promo');

        let query = db
            .select({
                id: students.id,
                login: students.login,
                firstName: students.first_name,
                lastName: students.last_name,
                promoName: students.promoName,
                isDropout: students.isDropout,
                dropoutAt: students.dropoutAt,
                dropoutReason: students.dropoutReason,
                dropoutNotes: students.dropoutNotes,
                previousPromo: students.previousPromo
            })
            .from(students)
            .where(eq(students.isDropout, true))
            .orderBy(desc(students.dropoutAt));

        const dropouts = await query.execute();

        // Filtrer par promo si spécifié (on filtre sur previousPromo ou promoName)
        const filteredDropouts = promo
            ? dropouts.filter(d => d.previousPromo === promo || d.promoName === promo)
            : dropouts;

        return NextResponse.json({
            success: true,
            count: filteredDropouts.length,
            dropouts: filteredDropouts,
            dropoutReasons: DROPOUT_REASONS
        });
    } catch (error) {
        console.error('Error fetching dropouts:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la récupération des perditions' },
            { status: 500 }
        );
    }
}
