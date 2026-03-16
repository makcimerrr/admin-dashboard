import { NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { getAllAuditsForExport } from '@/lib/db/services/auditsExport';
import { AuditReportDocument } from '@/lib/pdf/AuditReportDocument';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import React, { type ReactElement, type JSXElementConstructor } from 'react';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const data = await getAllAuditsForExport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(AuditReportDocument, { data }) as any;
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
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 });
  }
}
