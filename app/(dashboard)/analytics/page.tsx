import React from 'react';
import PieChart from '@/components/pie-chart-student';
import BarChartStacked from '@/components/bar-chart-student-stacked';
import promos from 'config/promoConfig.json' assert { type: 'json' };

export default function AnalyticsPage() {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Analytics</h1>
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
    </div>
  );
}
