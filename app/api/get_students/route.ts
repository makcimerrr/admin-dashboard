import { NextResponse } from 'next/server';
import { getStudents } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Parse the query string from the URL
    const url = new URL(request.url);

    // Extraire les paramètres depuis l'URL
    const search = url.searchParams.get('q') || '';  // Valeur par défaut: ''
    const offsetNumber = parseInt(url.searchParams.get('offset') || '0', 10);  // Valeur par défaut: 0
    const promo = url.searchParams.get('promo') || '';  // Valeur par défaut: ''

    // Appel à la fonction getStudents dans la base de données
    const { students, newOffset, totalStudents, previousOffset, currentOffset } = await getStudents(search, offsetNumber, promo);

    // Envoi des résultats sous forme JSON
    return NextResponse.json({
      students,
      newOffset,
      totalStudents,
      previousOffset,
      currentOffset
    });
  } catch (error) {
    // Gestion des erreurs éventuelles
    return NextResponse.json({ message: 'Error retrieving students', error: error }, { status: 500 });
  }
}