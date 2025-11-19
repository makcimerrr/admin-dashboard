import PromoManager from '../promo-management';
import HolidayManager from '../holiday-management';
import ProjectManager from '../project-management';

export default function ConfigPage() {
  return (
    <div className="space-y-6 px-6 py-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Config</h2>
        <p className="text-muted-foreground">Configure promotions, vacations, and projects</p>
      </div>
      <PromoManager />
      <HolidayManager />
      <ProjectManager />
    </div>
  );
}