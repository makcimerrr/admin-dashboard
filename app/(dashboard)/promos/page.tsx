import PromoManager from '../promo-management';
import HolidayManager from '../holiday-management';
import ProjectManager from '../project-management';

export default function PromoPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Gestion des Promotions</h1>
      <PromoManager />
      <h1 className="text-xl font-bold mb-4">Gestion des Vacances</h1>
      <HolidayManager />
      <h1 className="text-xl font-bold mb-4">Gestion des Projets</h1>
      <ProjectManager />
    </div>
  );
}