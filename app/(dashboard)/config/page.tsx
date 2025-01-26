import PromoManager from '../promo-management';
import HolidayManager from '../holiday-management';
import ProjectManager from '../project-management';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

export default function ConfigPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Config</CardTitle>
        <CardDescription>Configure promotions, vacations, and projects</CardDescription>
      </CardHeader>
      <CardContent>
        <PromoManager />
        <HolidayManager />
        <ProjectManager />
      </CardContent>
    </Card>
  );
}