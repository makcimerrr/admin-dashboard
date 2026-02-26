import { NextResponse } from 'next/server';
import { addPromotion, deletePromotion } from '@/lib/db/services/promotions';
import { getAllPromotions, dbRowToPromoConfig } from '@/lib/config/promotions';
import { upsertPromoConfig, deletePromoConfig, getPromoConfigByKey } from '@/lib/db/services/promoConfig';

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
    const promos = await getAllPromotions();
    return NextResponse.json({ promos }, { status: 200 });
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
        'piscine-rust-java-start': piscineRustJavaStart = 'NaN',
        'piscine-rust-java-end': piscineRustJavaEnd = 'NaN',
      } = {},
    } = newPromo;

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

    const errorMessages: string[] = [];

    if (piscineJsStart !== '' && piscineJsStart !== 'NaN' && !isDateInRange(piscineJsStart, start, end)) {
      errorMessages.push('La date de début de la piscine JS doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineJsEnd !== '' && piscineJsEnd !== 'NaN' && !isDateInRange(piscineJsEnd, start, end)) {
      errorMessages.push('La date de fin de la piscine JS doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineRustJavaStart !== '' && piscineRustJavaStart !== 'NaN' && !isDateInRange(piscineRustJavaStart, start, end)) {
      errorMessages.push('La date de début de la piscine Rust/Java doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineRustJavaEnd !== '' && piscineRustJavaEnd !== 'NaN' && !isDateInRange(piscineRustJavaEnd, start, end)) {
      errorMessages.push('La date de fin de la piscine Rust/Java doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineJsStart !== 'NaN' && piscineJsEnd !== 'NaN' && new Date(piscineJsStart) >= new Date(piscineJsEnd)) {
      errorMessages.push('La date de début de la piscine JS doit être avant la date de fin.');
    }

    if (piscineRustJavaStart !== 'NaN' && piscineRustJavaEnd !== 'NaN' && new Date(piscineRustJavaStart) >= new Date(piscineRustJavaEnd)) {
      errorMessages.push('La date de début de la piscine Rust/Java doit être avant la date de fin.');
    }

    if (
      piscineJsStart !== 'NaN' &&
      piscineJsEnd !== 'NaN' &&
      piscineRustJavaStart !== 'NaN' &&
      piscineRustJavaEnd !== 'NaN'
    ) {
      if (new Date(piscineJsEnd) >= new Date(piscineRustJavaStart)) {
        errorMessages.push('La piscine JS doit se terminer avant le début de la piscine Rust/Java.');
      }
    }

    if (errorMessages.length > 0) {
      return NextResponse.json(
        { error: errorMessages.join(' ') },
        { status: 400 }
      );
    }

    // Check for conflicts in promoConfig DB
    const existing = await getPromoConfigByKey(key);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Une promotion avec le même key existe déjà.` },
        { status: 400 }
      );
    }

    // Add to promotions table
    const dbResult = await addPromotion(String(eventId), key);
    if (dbResult.includes('existe déjà')) {
      return NextResponse.json(
        { error: `Une promotion avec cet ID ou ce titre existe déjà dans la base de données.` },
        { status: 400 }
      );
    }

    // Add to promoConfig table
    await upsertPromoConfig({
      key,
      eventId: Number(eventId),
      title,
      start,
      end,
      piscineJsStart: piscineJsStart !== 'NaN' ? piscineJsStart : null,
      piscineJsEnd: piscineJsEnd !== 'NaN' ? piscineJsEnd : null,
      piscineRustStart: piscineRustJavaStart !== 'NaN' ? piscineRustJavaStart : null,
      piscineRustEnd: piscineRustJavaEnd !== 'NaN' ? piscineRustJavaEnd : null,
    });

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

export async function DELETE(req: Request) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { error: 'La clé de la promotion est requise.' },
        { status: 400 }
      );
    }

    const existing = await getPromoConfigByKey(key);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Aucune promotion trouvée avec cette clé.' },
        { status: 404 }
      );
    }

    const dbResult = await deletePromotion(key);
    if (dbResult.includes('n\'existe pas')) {
      return NextResponse.json(
        { error: 'La promotion n\'existe pas dans la base de données.' },
        { status: 404 }
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
