// Fonction GET pour obtenir des informations (optionnel)
import { displayAgenda, updateEnv } from '@/lib/timeline';
import fs from 'fs';
import path from 'path';

import allProjects from '../../../config/projects.json';
import holidays from '../../../config/holidays.json';
import promos from '../../../config/promoConfig.json';

export async function GET(request: Request) {
  try {
    // Lire le fichier promoStatus.json pour récupérer les projets actuels
    const promoStatusPath = path.join(process.cwd(), 'config', 'promoStatus.json');
    let promoStatus: Record<string, string | { rust?: string; java?: string }> = {};

    if (fs.existsSync(promoStatusPath)) {
      const data = fs.readFileSync(promoStatusPath, 'utf8');
      promoStatus = JSON.parse(data);
    }

    // Démarrer le processus pour toutes les promos
    const results = await Promise.all(
      promos.map(async (promo) => {
        // Appeler displayAgenda pour chaque promo
        const result = await displayAgenda(promo, allProjects, holidays);

        // Récupérer le statut actuel depuis promoStatus.json
        const currentStatus = promoStatus[promo.key];
        let currentProjects: { rust?: string; java?: string } | null = null;

        // Déterminer si on a un single track ou multi-track
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
          currentProjects: currentProjects ? {
            rust: currentProjects.rust || null,
            java: currentProjects.java || null
          } : {
            single: result.currentProject
          },
          status: result.success ? 'success' : 'error'
        };
      })
    );

    // Retourner une réponse formatée avec tous les résultats
    return new Response(JSON.stringify({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in GET request:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Fonction POST pour traiter des données venant du corps de la requête
export async function POST(request: Request) {
  try {
    // Récupérer les données du corps de la requête
    const { projectName, promotion } = await request.json();

    if (!projectName || !promotion) {
      return new Response(JSON.stringify({ success: false, message: 'Données manquantes dans la requête' }), { status: 400 });
    }

    // Mettre à jour le fichier en fonction des données envoyées
    const result = await updateEnv(projectName, promotion);

    // Retourner une réponse en fonction du succès ou de l'échec
    return new Response(JSON.stringify(result), { status: result.success ? 200 : 500 });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: `Erreur: ${err}` }), { status: 500 });
  }
}

