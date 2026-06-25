import { NextResponse } from 'next/server';
import { upsertPromoStatus, deletePromoStatus } from '@/lib/db/services/promoStatus';

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

    for (const promo of promos.filter((p: any) => p.promotion?.name)) {
        // Normalise currentProject AU FORMAT ATTENDU PAR LES LECTEURS
        // (update-students + Update manuel : JSON.parse une seule fois) :
        //  - mono-track  → NOM du projet BRUT (string ; JSON.parse échoue → string gardée)
        //  - multi-track → {rust, java} stringifié UNE seule fois (JSON.parse → objet)
        // ⚠️ Bug historique : double JSON.stringify + wrapping {single:…} →
        // les lecteurs obtenaient une string non-parsable → delay_level faux
        // ('bien' pour tout le monde) au passage du cron auto.
        const cp = promo.currentProjects;
        let currentProject: string | null = null;
        if (cp && typeof cp === 'object') {
            if (typeof cp.single !== 'undefined') {
                currentProject = cp.single ?? null;
            } else {
                currentProject = JSON.stringify(cp);
            }
        } else if (typeof cp === 'string') {
            currentProject = cp;
        }

      await upsertPromoStatus({
        promoKey: promo.promotion?.name ?? 'unknown',
        status: promo.status === 'success' ? 'OK' : 'ERROR',
        promotionName: `Promo ${promo.promotion?.name ?? 'unknown'}`,
        currentProject,
        progress: promo.timeline?.progress ?? 0,
        agenda: promo.timeline ?? null,
        // startDate / endDate : à mapper si dispo
        lastUpdated: new Date()
      });
    }

    // Nettoyage de l'entrée "unknown" si elle existe
    await deletePromoStatus('unknown');

    console.log('✅ Cron exécuté et DB mise à jour !');
    return NextResponse.json({ success: true, updated: promos.length });
  } catch (error) {
    console.error('❌ Erreur cron :', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
