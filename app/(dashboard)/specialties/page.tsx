import { redirect } from 'next/navigation';

/**
 * Legacy URL: /specialties
 *
 * The specialties view now lives under the students namespace at
 * /students/specialties. The redirect keeps old bookmarks alive.
 */
export default function LegacySpecialtiesPage() {
  redirect('/students/specialties');
}
