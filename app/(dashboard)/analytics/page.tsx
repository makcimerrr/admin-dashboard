import React from 'react';
import ChartStudent from '@/components/chart-student';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Analytics</h1>
      <ChartStudent />
    </div>
  );
};

export default AnalyticsPage;