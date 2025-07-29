import React from 'react';
import PieChart from '@/components/pie-chart-student';
import BarChartStacked from '@/components/bar-chart-student-stacked';
import promos from 'config/promoConfig.json' assert { type: 'json' };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 px-6 py-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">Track key metrics for each promotion</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {promos.map((promo) => (
          <PieChart
            key={promo.key}
            title={promo.title}
            eventID={promo.eventId}
            keyPromo={promo.key}
          />
        ))}
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {promos.map((promo) => (
          <BarChartStacked
            key={promo.key}
            title={promo.title}
            eventID={promo.eventId}
            keyPromo={promo.key}
          />
        ))}
      </div>
    </div>
  );
}