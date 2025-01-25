import React from 'react';
import PieChart from '@/components/pie-chart-student';
import BarChart from '@/components/bar-chart-student';
import promos from 'config/promoConfig.json' assert { type: 'json' };

const AnalyticsPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {promos.map((promo) => (
          <PieChart title={promo.title} eventID={promo.eventId} keyPromo={promo.key} />
        ))}
      </div>
    </div>
  );
};

export default AnalyticsPage;
