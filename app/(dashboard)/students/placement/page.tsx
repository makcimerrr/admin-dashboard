import { Briefcase } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StudentsSubnav } from '../_components/students-subnav';
import { getPlacementProfiles } from '@/lib/db/services/audits';
import { PlacementClient } from './placement-client';

// Données live (notes/tags évoluent à chaque CR saisie).
export const dynamic = 'force-dynamic';

/**
 * Vue « Placement alternance » : tous les profils apprenants avec note
 * moyenne de CR et tags points forts / points faibles agrégés, filtrables
 * par tag (« un profil leader », « un profil IA »…).
 */
export default async function PlacementPage() {
  const profiles = await getPlacementProfiles();

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={Briefcase}
        title="Placement alternance"
        description="Profils des apprenants — note moyenne de CR et points forts/faibles agrégés"
      />
      <StudentsSubnav />
      <PlacementClient profiles={profiles} />
    </div>
  );
}
