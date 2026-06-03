import { NextRequest, NextResponse } from 'next/server';
import {
  getStudentsWithGiteaProfiles,
  getGiteaProfile,
  getSkillsByLogin,
} from '@/lib/db/services/studentSkills';

/**
 * Chantier A — lecture skills/appétence pour l'UI.
 *  - ?login=<login> → { profile, skills } d'un étudiant
 *  - ?promo=<key> (ou rien / all) → { students: [...] } avec leur snapshot
 */
export async function GET(request: NextRequest) {
  try {
    const login = request.nextUrl.searchParams.get('login');

    if (login) {
      const [profile, skills] = await Promise.all([
        getGiteaProfile(login),
        getSkillsByLogin(login),
      ]);
      return NextResponse.json({ success: true, profile, skills });
    }

    const promo = request.nextUrl.searchParams.get('promo');
    const students = await getStudentsWithGiteaProfiles(
      promo && promo !== 'all' ? promo : undefined,
    );
    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error('GET /api/students/skills error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des compétences.' },
      { status: 500 },
    );
  }
}
