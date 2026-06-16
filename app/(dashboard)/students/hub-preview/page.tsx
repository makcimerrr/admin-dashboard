import { redirect } from 'next/navigation';
import { resolveUser } from '@/lib/api/with-auth';
import { isAdminRole } from '@/lib/nav-apps';
import { NonAdminLanding } from '@/components/non-admin-landing';

export const dynamic = 'force-dynamic';

/**
 * Aperçu (admin-gated) du hub d'un étudiant.
 *
 * Rend la landing étudiant (widgets Émargement / 01 Deck / Intra) avec les
 * VRAIES données de l'étudiant ciblé, en passant son login aux endpoints
 * /api/me/* via la prop `asLogin` (override honoré uniquement pour un admin).
 * Aucune impersonation/session : c'est l'admin qui reste authentifié.
 */
export default async function HubPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string; name?: string }>;
}) {
  const user = await resolveUser();
  if (!isAdminRole(user?.role)) {
    redirect('/');
  }

  const { login, name } = await searchParams;
  if (!login) {
    redirect('/students');
  }

  return (
    <NonAdminLanding
      asLogin={login}
      previewName={name ?? login}
      userName={name ?? login}
    />
  );
}
