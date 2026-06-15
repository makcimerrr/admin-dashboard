import { displayAgenda, updateEnv } from '@/lib/timeline';
import { getAllPromotions } from '@/lib/config/promotions';
import { getAllProjects } from '@/lib/config/projects';
import { getHolidaysConfig } from '@/lib/config/holidays';
import { getAllPromoStatus } from '@/lib/db/services/promoStatus';
import { getArchivedPromotions } from '@/lib/db/services/promotions';

export async function GET(request: Request) {
  try {
    const [allPromos, allProjects, holidays, allStatus, archivedPromos] = await Promise.all([
      getAllPromotions(),
      getAllProjects(),
      getHolidaysConfig(),
      getAllPromoStatus(),
      getArchivedPromotions(),
    ]);

    // Exclure les promotions archivées du suivi de timeline (bot /timeline inclus).
    const archivedNames = new Set(archivedPromos.map((p) => p.name));
    const promos = allPromos.filter((p) => !archivedNames.has(p.key));

    // Build promoStatus map from DB
    const promoStatusMap: Record<string, string | { rust?: string; java?: string }> = {};
    for (const s of allStatus) {
      if (!s.currentProject) continue;
      try {
        promoStatusMap[s.promoKey] = JSON.parse(s.currentProject);
      } catch {
        promoStatusMap[s.promoKey] = s.currentProject;
      }
    }

    // Les projets optionnels ne comptent PAS dans le calcul de timeline
    // (échéance, progression, projet courant) : on les retire avant le calcul.
    const mandatoryProjects = {} as typeof allProjects;
    for (const track of Object.keys(allProjects) as (keyof typeof allProjects)[]) {
      mandatoryProjects[track] = (allProjects[track] || []).filter((p) => !p.optional);
    }

    const results = await Promise.all(
      promos.map(async (promo) => {
        const result = await displayAgenda(promo, mandatoryProjects, holidays);
        const currentStatus = promoStatusMap[promo.key];
        let currentProjects: { rust?: string; java?: string } | null = null;

        if (typeof currentStatus === 'object' && currentStatus !== null) {
          currentProjects = currentStatus;
        }

        return {
          promotion: {
            key: promo.key,
            eventId: promo.eventId,
            title: promo.title,
            dates: promo.dates
          },
          timeline: {
            agenda: result.agenda,
            progress: result.progress
          },
          currentProjects: currentProjects
            ? { rust: currentProjects.rust || null, java: currentProjects.java || null }
            : { single: result.currentProject },
          status: result.success ? 'success' : 'error'
        };
      })
    );

    return new Response(
      JSON.stringify({ success: true, data: results, timestamp: new Date().toISOString() }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in GET request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, null, 2),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { projectName, promotion } = await request.json();

    if (!projectName || !promotion) {
      return new Response(
        JSON.stringify({ success: false, message: 'Données manquantes dans la requête' }),
        { status: 400 }
      );
    }

    const result = await updateEnv(projectName, promotion);
    return new Response(JSON.stringify(result), { status: result.success ? 200 : 500 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: `Erreur: ${err}` }), { status: 500 });
  }
}
