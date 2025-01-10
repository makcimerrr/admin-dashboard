import fs from 'fs';
import path from 'path';

// Fonction pour mettre à jour le fichier JSON avec le projet et la promotion
async function updateEnv(projectName: string, promotion: string) {
  // Obtenir le répertoire courant du fichier
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const rootDir = path.join(__dirname, '../../../'); // En remontant jusqu'à la racine du projet
  const jsonFilePath = path.join(rootDir, 'config', 'promoStatus.json'); // Chemin vers config/promoStatus.json

  try {
    // Vérifier si le fichier existe déjà, sinon le créer avec un objet vide
    if (!fs.existsSync(jsonFilePath)) {
      // console.log('Le fichier n\'existe pas, création du fichier avec un objet vide');
      fs.writeFileSync(jsonFilePath, JSON.stringify({}, null, 2), 'utf8');
    }

    // Lire le contenu actuel du fichier JSON
    let data = fs.readFileSync(jsonFilePath, 'utf8');
    // console.log('Contenu initial du fichier JSON:', data); // Log du contenu initial

    // Parser le JSON en objet JavaScript
    let jsonData = JSON.parse(data);

    // Déterminer la clé de promotion
    let promotionKey: string;
    if (promotion === "2023-05-22") {
      promotionKey = 'PROJECT_P1_2023';
    } else if (promotion === "2023-11-06") {
      promotionKey = 'PROJECT_P2_2023';
    } else if (promotion === "2024-06-03") {
      promotionKey = 'PROJECT_P1_2024';
    } else {
      throw new Error(`Promotion non reconnue: ${promotion}`);
    }

    // Vérifier si la clé existe déjà dans l'objet JSON
    if (jsonData[promotionKey]) {
      // Si elle existe, mettre à jour la valeur avec le projet
      // console.log(`La clé ${promotionKey} existe déjà, mise à jour avec le projet: ${projectName}`);
      jsonData[promotionKey] = projectName;
    } else {
      // Sinon, l'ajouter avec la valeur
      // console.log(`La clé ${promotionKey} n'existe pas, ajout du projet: ${projectName}`);
      jsonData[promotionKey] = projectName;
    }

    // Vérifier et loguer les données avant de les écrire
    // console.log('Données JSON mises à jour:', JSON.stringify(jsonData, null, 2));

    // Sauvegarder le fichier JSON mis à jour
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf8');
    // console.log('Fichier JSON mis à jour avec succès');

    // Retourner un message de succès
    return { success: true, message: `La variable ${promotionKey} a été mise à jour avec le projet: ${projectName}` };

  } catch (err) {
    // En cas d'erreur, loguer le message d'erreur
    console.error('Erreur lors de la gestion du fichier JSON:', err);
    return { success: false, message: `Erreur: ${err}` };
  }
}

// Fonction GET pour obtenir des informations (optionnel)
export async function GET(request: Request) {
  // Accéder à la route mettra à jour le projet avec la promotion
  // Ici on passe en dur les valeurs projectName et promotion pour exemple
  const result = await updateEnv("Projet Exemples", "2024-06-03");

  // Retourner une réponse
  return new Response(JSON.stringify(result), { status: result.success ? 200 : 500 });
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