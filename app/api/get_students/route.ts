import { NextResponse } from 'next/server';
import { getStudents } from '@/lib/db/services/students';

export async function GET(request: Request) {
  try {
    // Parse the query string from the URL
    const url = new URL(request.url);

    // Extraire les paramètres depuis l'URL
    const search = url.searchParams.get('q') || ''; // Rechercher par mot-clé (par défaut '')
    const offsetNumber = parseInt(url.searchParams.get('offset') || '0', 10); // Pagination (par défaut 0)
    const promo = url.searchParams.get('promo') || ''; // Promo (par défaut '')
    const filter = url.searchParams.get('filter') || ''; // Colonne à trier (par défaut '')
    const direction = url.searchParams.get('direction') || 'asc'; // Direction du tri (par défaut 'asc')
    const status = url.searchParams.get('status') || ''; // Statut (par défaut '')
    const delayLevel = url.searchParams.get('delay_level') || ''; // Niveau de retard (par défaut '')
    const track = url.searchParams.get('track') || null; // Tronc (par défaut null)
    const trackCompleted = url.searchParams.get('track_completed') || null; // Tronc terminé (par défaut null)
    const limitParam = url.searchParams.get('limit'); // Limite par page (par défaut 20, -1 pour tous)
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const dropoutFilter = (url.searchParams.get('dropout_filter') || 'active') as 'active' | 'dropout' | 'all';

    // Appel à la fonction getStudents dans la base de données
    const {
      students,
      newOffset,
      totalStudents,
      previousOffset,
      currentOffset
    } = await getStudents(search, offsetNumber, promo, filter, direction, status, delayLevel, track, trackCompleted, limit, dropoutFilter);

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
    console.error('Error retrieving students:', error);
    return NextResponse.json(
      { message: 'Error retrieving students', error: error },
      { status: 500 }
    );
  }
}
