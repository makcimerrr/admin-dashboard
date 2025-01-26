import PromoManager from '../promo-management';
import HolidayManager from '../holiday-management';
import ProjectManager from '../project-management';

export default function ConfigPage() {
  return (
    <div className="p-6">
      <PromoManager />
      <HolidayManager />
      <ProjectManager />
    </div>
  );
}