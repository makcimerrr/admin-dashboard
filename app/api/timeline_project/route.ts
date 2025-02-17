// Fonction GET pour obtenir des informations (optionnel)
import { displayAgenda, updateEnv } from '@/lib/timeline';

import allProjects from '../../../config/projects.json';
import holidays from '../../../config/holidays.json';
import promos from '../../../config/promoConfig.json';

export async function GET(request: Request) {
  try {
    // Démarrer le processus pour toutes les promos
    const results = await Promise.all(
      promos.map(async (promo, index) => {
        // Appeler displayAgenda pour chaque promo
        // console.log(`Processing promo ${promo}`);
        const result = await displayAgenda(promo, allProjects, holidays);
        return { promoIndex: index, success: result.success, promotionName: result.promotionName, currentProject: result.currentProject, progress: result.progress };
      })
    );

    // Retourner une réponse avec tous les résultats
    return new Response(JSON.stringify(results), { status: 200 });
  } catch (error) {
    console.error('Error in GET request:', error);
    return new Response(JSON.stringify({ success: false, message: error }), { status: 500 });
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

