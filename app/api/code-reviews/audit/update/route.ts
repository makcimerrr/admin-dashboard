import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { audits, auditResults } from '@/lib/db/schema/audits';
import { eq, inArray, and } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { auditId, summary, warnings, results } = body;

    if (!auditId) {
      return NextResponse.json({ success: false, error: 'Missing auditId' }, { status: 400 });
    }

    // Transactional update
    await db.transaction(async (tx) => {
      // Update main audit
      await tx.update(audits).set({ summary: summary ?? null, warnings: warnings ?? [], updatedAt: new Date() }).where(eq(audits.id, Number(auditId)));

      // Existing results
      const existing = await tx.select().from(auditResults).where(eq(auditResults.auditId, Number(auditId)));
      const existingMap = new Map(existing.map((e: any) => [e.studentLogin, e]));

      const incomingLogins = (results || []).map((r: any) => r.studentLogin);

      // Process incoming results: update if exists, insert if new
      for (const r of results || []) {
        const login = r.studentLogin;
        const payload = {
          auditId: Number(auditId),
          studentLogin: login,
          validated: !!r.validated,
          feedback: r.feedback ?? null,
          warnings: r.warnings ?? []
        };

        if (existingMap.has(login)) {
          // Update only if changed
          const ex = existingMap.get(login);
          const changed = ex.validated !== payload.validated || (ex.feedback ?? null) !== (payload.feedback ?? null) || JSON.stringify(ex.warnings || []) !== JSON.stringify(payload.warnings || []);
          if (changed) {
            await tx.update(auditResults).set(payload).where(and(eq(auditResults.auditId, Number(auditId)), eq(auditResults.studentLogin, login)));
          }
          existingMap.delete(login);
        } else {
          await tx.insert(auditResults).values(payload);
        }
      }

      // Any leftover in existingMap should be deleted in batch
      const toDelete = Array.from(existingMap.keys());
      if (toDelete.length > 0) {
        // delete where audit_id = auditId and student_login IN (..)
        await tx.delete(auditResults).where(and(eq(auditResults.auditId, Number(auditId)), inArray(auditResults.studentLogin, toDelete)));
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating audit:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
