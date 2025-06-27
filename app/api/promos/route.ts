import { NextResponse } from 'next/server';
import { getAllPromoConfig, upsertPromoConfig, deletePromoConfig } from '@/lib/db/services/promoConfig';

function isDateValid(date: string): boolean {
  return !isNaN(Date.parse(date));
}

function isDateInRange(date: string, start: string, end: string): boolean {
  if (!isDateValid(date)) return false;
  const d = new Date(date);
  return d >= new Date(start) && d <= new Date(end);
}

export async function GET(req: Request) {
  try {
    const promos = await getAllPromoConfig();
    // Adapter le format pour inclure les dates imbriquées comme dans l'ancien JSON
    const formattedPromos = promos.map((promo: any) => ({
      key: promo.key,
      eventId: promo.eventId,
      title: promo.title,
      dates: {
        start: promo.start,
        'piscine-js-start': promo.piscineJsStart || 'NaN',
        'piscine-js-end': promo.piscineJsEnd || 'NaN',
        'piscine-rust-start': promo.piscineRustStart || 'NaN',
        'piscine-rust-end': promo.piscineRustEnd || 'NaN',
        end: promo.end,
      },
    }));
    return NextResponse.json({ promos: formattedPromos }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des promos :', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de la récupération des promotions.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const newPromo = await req.json();
    const {
      key,
      eventId,
      title,
      dates: {
        start = '',
        end = '',
        'piscine-js-start': piscineJsStart = 'NaN',
        'piscine-js-end': piscineJsEnd = 'NaN',
        'piscine-rust-start': piscineRustStart = 'NaN',
        'piscine-rust-end': piscineRustEnd = 'NaN',
      } = {},
    } = newPromo;

    // Validation des champs obligatoires
    if (!key || !eventId || !title || !start || !end) {
      return NextResponse.json(
        { error: 'Les champs obligatoires (clé, ID, titre, début et fin) doivent être remplis.' },
        { status: 400 }
      );
    }

    if (!isDateValid(start) || !isDateValid(end)) {
      return NextResponse.json(
        { error: 'Les dates de début ou de fin sont invalides.' },
        { status: 400 }
      );
    }

    if (new Date(start) >= new Date(end)) {
      return NextResponse.json(
        { error: 'La date de début doit être avant la date de fin.' },
        { status: 400 }
      );
    }

    // Validation des dates de piscine si elles sont renseignées
    const errorMessages: string[] = [];

    if (piscineJsStart !== '' && !isDateInRange(piscineJsStart, start, end)) {
      errorMessages.push('La date de début de la piscine JS doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineJsEnd !== '' && !isDateInRange(piscineJsEnd, start, end)) {
      errorMessages.push('La date de fin de la piscine JS doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineRustStart !== '' && !isDateInRange(piscineRustStart, start, end)) {
      errorMessages.push('La date de début de la piscine Rust doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineRustEnd !== '' && !isDateInRange(piscineRustEnd, start, end)) {
      errorMessages.push('La date de fin de la piscine Rust doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineJsStart !== '' && piscineJsEnd !== 'NaN' && new Date(piscineJsStart) >= new Date(piscineJsEnd)) {
      errorMessages.push('La date de début de la piscine JS doit être avant la date de fin.');
    }

    if (piscineRustStart !== '' && piscineRustEnd !== 'NaN' && new Date(piscineRustStart) >= new Date(piscineRustEnd)) {
      errorMessages.push('La date de début de la piscine Rust doit être avant la date de fin.');
    }

    // Vérification de l'ordre des piscines
    if (
      piscineJsStart !== '' &&
      piscineJsEnd !== '' &&
      piscineRustStart !== '' &&
      piscineRustEnd !== ''
    ) {
      if (new Date(piscineJsEnd) >= new Date(piscineRustStart)) {
        errorMessages.push('La piscine JS doit se terminer avant le début de la piscine Rust.');
      }
    }

    if (errorMessages.length > 0) {
      return NextResponse.json(
        { error: errorMessages.join(' ') },
        { status: 400 }
      );
    }

    // Upsert la promotion dans la base de données
    await upsertPromoConfig({
      key,
      eventId: Number(eventId),
      title,
      start,
      piscineJsStart: piscineJsStart !== 'NaN' ? piscineJsStart : null,
      piscineJsEnd: piscineJsEnd !== 'NaN' ? piscineJsEnd : null,
      piscineRustStart: piscineRustStart !== 'NaN' ? piscineRustStart : null,
      piscineRustEnd: piscineRustEnd !== 'NaN' ? piscineRustEnd : null,
      end,
    });

    return NextResponse.json(
      { message: 'Promotion ajoutée ou mise à jour avec succès.' },
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

export async function DELETE(req: Request) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { error: 'La clé de la promotion est requise.' },
        { status: 400 }
      );
    }

    await deletePromoConfig(key);

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