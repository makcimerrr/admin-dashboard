import { NextResponse } from 'next/server';
import { updateLastUpdate, getAllUpdates } from '@/lib/db/services/updates'; // Import des fonctions depuis db.ts

/**
 * Fonction GET pour récupérer la dernière mise à jour avec son `event_id`.
 */
export async function GET(req: Request) {
  try {
    // Récupérer toutes les mises à jour
    const updates = await getAllUpdates();

    if (updates.length === 0) {
      return NextResponse.json(
        { message: 'Aucune mise à jour trouvée.' },
        { status: 404 }
      );
    }

    return NextResponse.json(updates);
  } catch (error) {
    return NextResponse.json(
      { message: 'Erreur lors de la récupération des mises à jour.', error: error },
      { status: 500 }
    );
  }
}

/**
 * Fonction POST pour mettre à jour la dernière mise à jour avec un `event_id`.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId } = body; // Extraire l'event_id de la requête

    if (!eventId) {
      return new Response(
        JSON.stringify({ message: 'Missing event_id.' }),
        { status: 400 }
      );
    }

    const lastUpdate = await updateLastUpdate(eventId); // Passer l'event_id lors de la mise à jour
    return new Response(JSON.stringify({ last_update: lastUpdate.last_update, event_id: lastUpdate.event_id }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Error updating last update.', error: error }),
      { status: 500 }
    );
  }
}