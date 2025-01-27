import React from 'react';
import PieChart from '@/components/pie-chart-student';
import BarChartStacked from '@/components/bar-chart-student-stacked';
import promos from 'config/promoConfig.json' assert { type: 'json' };
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

export default function AnalyticsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
        <CardDescription>Track key metrics for each promotion</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {promos.map((promo) => (
            <PieChart
              title={promo.title}
              eventID={promo.eventId}
              keyPromo={promo.key}
            />
          ))}
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {promos.map((promo) => (
            <BarChartStacked
              title={promo.title}
              eventID={promo.eventId}
              keyPromo={promo.key}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
