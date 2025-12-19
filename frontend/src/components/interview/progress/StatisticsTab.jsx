import React from 'react';
import InterviewStatistics from '../InterviewStatistics';

const StatisticsTab = ({ statistics, loading }) => {
  return (
    <div className="flex-1 overflow-auto bg-white rounded-lg shadow-lg p-6">
      <InterviewStatistics 
        statistics={statistics}
        loading={loading}
      />
    </div>
  );
};

export default StatisticsTab;

