import { NextResponse } from 'next/server';
import { upsertPromoStatus } from '@/lib/db/services/promoStatus';

export async function GET(req: Request) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Récupère les données de l’API timeline
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/timeline_project`);
    if (!res.ok) {
      console.error('Erreur fetch timeline_project :', res.status, await res.text());
    }
    const data = await res.json();
    const promos = Array.isArray(data?.data) ? data.data : [];
    console.log('Promos reçues :', JSON.stringify(promos));

    // Mets à jour chaque promo dans la DB
    if (!Array.isArray(promos)) {
      console.error('Format inattendu pour promos:', promos);
      return new Response('Invalid promos format', { status: 500 });
    }

    for (const promo of promos) {
        let currentProject = promo.currentProjects;

        if (typeof currentProject === 'object' && currentProject !== null) {
            currentProject = JSON.stringify(currentProject);
        }

      await upsertPromoStatus({
        promoKey: promo.promotion?.name ?? 'unknown',
        status: promo.status === 'success' ? 'OK' : 'ERROR',
        promotionName: `Promo ${promo.promotion?.name ?? 'unknown'}`,
        currentProject: currentProject ? JSON.stringify(currentProject) : null,
        progress: promo.timeline?.progress ?? 0,
        agenda: promo.timeline ?? null,
        // startDate / endDate : à mapper si dispo
        lastUpdated: new Date()
      });
    }

    console.log('✅ Cron exécuté et DB mise à jour !');
    return NextResponse.json({ success: true, updated: promos.length });
  } catch (error) {
    console.error('❌ Erreur cron :', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
