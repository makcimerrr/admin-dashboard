import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { addPromotion, deletePromotion } from '@/lib/db/services/promotions';

const promoFilePath = path.join(process.cwd(), 'config', 'promoConfig.json');

function getExistingPromos() {
  return JSON.parse(fs.readFileSync(promoFilePath, 'utf8'));
}

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
    // Retrieve existing promotions
    const promos = getExistingPromos();

    // Send the promotions as a response
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

    if (piscineRustJavaStart !== '' && !isDateInRange(piscineRustJavaStart, start, end)) {
      errorMessages.push('La date de début de la piscine Rust/Java doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineRustJavaEnd !== '' && !isDateInRange(piscineRustJavaEnd, start, end)) {
      errorMessages.push('La date de fin de la piscine Rust/Java doit être comprise entre le début et la fin de la promotion.');
    }

    if (piscineJsStart !== '' && piscineJsEnd !== 'NaN' && new Date(piscineJsStart) >= new Date(piscineJsEnd)) {
      errorMessages.push('La date de début de la piscine JS doit être avant la date de fin.');
    }

    if (piscineRustJavaStart !== '' && piscineRustJavaEnd !== 'NaN' && new Date(piscineRustJavaStart) >= new Date(piscineRustJavaEnd)) {
      errorMessages.push('La date de début de la piscine Rust/Java doit être avant la date de fin.');
    }

    // Vérification de l'ordre des piscines
    if (
      piscineJsStart !== '' &&
      piscineJsEnd !== '' &&
      piscineRustJavaStart !== '' &&
      piscineRustJavaEnd !== ''
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

    // Ajout de la promotion après validation dans la base de données
    const dbResult = await addPromotion(eventId, key);

    if (dbResult.includes('existe déjà')) {
      return NextResponse.json(
        { error: `Une promotion avec cet ID ou ce titre existe déjà dans la base de données.` },
        { status: 400 }
      );
    }

    // Ajout de la promotion après validation
    const promoToAdd = {
      key,
      eventId: Number(eventId),
      title,
      dates: {
        start,
        'piscine-js-start': piscineJsStart || 'NaN',
        'piscine-js-end': piscineJsEnd || 'NaN',
        'piscine-rust-java-start': piscineRustJavaStart || 'NaN',
        'piscine-rust-java-end': piscineRustJavaEnd || 'NaN',
        end,
      },
    };

    const promos = getExistingPromos();

    // Vérification des conflits
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

    promos.push(promoToAdd);
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

export async function DELETE(req: Request) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { error: 'La clé de la promotion est requise.' },
        { status: 400 }
      );
    }

    const promos = getExistingPromos();
    const promoIndex = promos.findIndex(
      (promo: { key: string }) => promo.key === key
    );

    if (promoIndex === -1) {
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

    promos.splice(promoIndex, 1);
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