import { NextResponse } from 'next/server';
import { updateLastUpdate, getAllUpdates } from '@/lib/db/services/updates'; // Import des fonctions depuis db.ts
import { getAllPromoConfig } from '@/lib/db/services/promoConfig';
import { getArchivedPromoNames } from '@/lib/db/filters';

/**
 * Fonction GET pour récupérer la dernière mise à jour avec son `event_id`.
 *
 * Chaque ligne reçoit un flag `is_archived` calculé via
 *   promo_config.event_id → promo_config.key → promotions.is_archived.
 * Le client utilise ce flag pour exclure les promos archivées du calcul
 * « out-of-delta » : une promo archivée n'est plus mise à jour par le cron,
 * donc son dernier `last_update` peut être très ancien sans que ce soit un
 * souci.
 */
export async function GET(req: Request) {
  try {
    const [allUpdates, archivedNames, promoConfigRows] = await Promise.all([
      getAllUpdates(),
      getArchivedPromoNames(),
      getAllPromoConfig(),
    ]);

    if (allUpdates.length === 0) {
      return NextResponse.json(
        { message: 'Aucune mise à jour trouvée.' },
        { status: 404 }
      );
    }

    // Build the archived event_id set once. event_id is a string in `updates`,
    // promo_config.eventId is an int — normalize to string.
    const archivedEventIds = new Set<string>();
    for (const row of promoConfigRows) {
      if (archivedNames.has(row.key)) {
        archivedEventIds.add(String(row.eventId));
      }
    }

    const enriched = allUpdates.map((u) => ({
      ...u,
      is_archived: archivedEventIds.has(u.event_id),
    }));

    return NextResponse.json(enriched);
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
    const { eventId, isAuto } = body; // Extraire l'event_id et le flag isAuto

    if (!eventId) {
      return new Response(
        JSON.stringify({ message: 'Missing event_id.' }),
        { status: 400 }
      );
    }

    const lastUpdate = await updateLastUpdate(eventId, isAuto ?? false); // Passer l'event_id et isAuto lors de la mise à jour
    return new Response(JSON.stringify({ last_update: lastUpdate.last_update, event_id: lastUpdate.event_id, is_auto: lastUpdate.is_auto }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Error updating last update.', error: error }),
      { status: 500 }
    );
  }
}