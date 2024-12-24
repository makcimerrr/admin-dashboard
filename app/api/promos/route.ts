import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Chemin vers le fichier JSON contenant les promotions
const promoFilePath = path.join(process.cwd(), 'config', 'promoConfig.json');

// Fonction utilitaire pour charger les promotions existantes
function getExistingPromos() {
  return JSON.parse(fs.readFileSync(promoFilePath, 'utf8'));
}

// Gestionnaire pour la méthode POST
export async function POST(req: Request) {
  try {
    const newPromo = await req.json(); // Récupérer les données du corps de la requête
    const { key, eventId, title } = newPromo;

    // Validation des champs obligatoires
    if (!key || !eventId || !title) {
      return NextResponse.json(
        { error: 'Tous les champs (key, eventId, title) doivent être remplis.' },
        { status: 400 }
      );
    }

    const promos = getExistingPromos();

    // Vérification de l'unicité de la promo
    const existingPromo = promos.find(
      (promo: { key: string; eventId: number; title: string }) =>
        promo.key === key || promo.eventId === Number(eventId) || promo.title === title
    );

    if (existingPromo) {
      const conflictField = existingPromo.key === key
        ? 'key'
        : existingPromo.eventId === Number(eventId)
          ? 'eventId'
          : 'title';

      return NextResponse.json(
        { error: `Une promotion avec le même ${conflictField} existe déjà.` },
        { status: 400 }
      );
    }

    // Ajouter la nouvelle promotion
    promos.push({ key, eventId: Number(eventId), title });
    fs.writeFileSync(promoFilePath, JSON.stringify(promos, null, 2));

    return NextResponse.json(
      { message: 'Promotion ajoutée avec succès.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la promo :', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de l\'ajout de la promotion.' },
      { status: 500 }
    );
  }
}

// Gestionnaire pour la méthode DELETE
export async function DELETE(req: Request) {
  try {
    const { key } = await req.json(); // Récupérer la clé de la promo à supprimer

    // Validation de la présence de la clé
    if (!key) {
      return NextResponse.json(
        { error: 'La clé de la promotion est requise.' },
        { status: 400 }
      );
    }

    const promos = getExistingPromos();

    // Vérifier si la promotion avec la clé spécifiée existe
    const promoIndex = promos.findIndex(
      (promo: { key: string }) => promo.key === key
    );

    if (promoIndex === -1) {
      return NextResponse.json(
        { error: 'Aucune promotion trouvée avec cette clé.' },
        { status: 404 }
      );
    }

    // Supprimer la promotion
    promos.splice(promoIndex, 1);

    // Écrire la nouvelle version du fichier JSON
    fs.writeFileSync(promoFilePath, JSON.stringify(promos, null, 2));

    return NextResponse.json(
      { message: 'Promotion supprimée avec succès.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de la promo :', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de la suppression de la promotion.' },
      { status: 500 }
    );
  }
}