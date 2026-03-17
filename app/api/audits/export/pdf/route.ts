import { NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { getAllAuditsForExport } from '@/lib/db/services/auditsExport';
import { AuditReportDocument } from '@/lib/pdf/AuditReportDocument';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import React, { type ReactElement, type JSXElementConstructor } from 'react';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    // ?cover=false      → pas de page de couverture
    // ?exclude=123,456  → promoIds à exclure (virgule-séparées)
    const includeCover = searchParams.get('cover') !== 'false';
    const excludeIds = (searchParams.get('exclude') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const rawData = await getAllAuditsForExport();
    const data = {
      ...rawData,
      promos: excludeIds.length
        ? rawData.promos.filter((p) => !excludeIds.includes(p.promoId))
        : rawData.promos,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(AuditReportDocument, { data, includeCover }) as any;
    const buffer = await renderToBuffer(element);

    const filename = `audits-export-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('PDF export error:', error);
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}
