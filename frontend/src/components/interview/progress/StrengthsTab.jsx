import React from 'react';
import { Typography, Paper, Divider, Chip } from '@mui/material';

const StrengthsTab = ({ strengths, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!strengths) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 text-center py-10 text-gray-500">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 overflow-y-auto">
      <Typography variant="h5" className="mb-4 font-bold flex items-center gap-2">
        <span>💪</span> 직무 기반 강점/약점 (전체)
      </Typography>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Typography variant="subtitle1" className="font-bold text-blue-600">주요 역량 강점</Typography>
            {strengths.strengths?.map((s, i) => (
              <Paper key={i} className="p-3 bg-blue-50/30 border border-blue-100">
                <Typography variant="subtitle2" className="font-bold">{s.area || s.item_name}</Typography>
                <Typography variant="body2" className="text-gray-600 text-xs">{s.description}</Typography>
              </Paper>
            ))}
          </div>
          <div className="space-y-3">
            <Typography variant="subtitle1" className="font-bold text-red-600">예상되는 약점/보완점</Typography>
            {strengths.weaknesses?.map((w, i) => (
              <Paper key={i} className="p-3 bg-red-50/30 border border-red-100">
                <Typography variant="subtitle2" className="font-bold">{w.area || w.item_name}</Typography>
                <Typography variant="body2" className="text-gray-600 text-xs">{w.description}</Typography>
              </Paper>
            ))}
          </div>
        </div>
        <Divider />
        <div>
          <Typography variant="subtitle1" className="font-bold text-indigo-600 mb-3">직무 경쟁 우위 요소</Typography>
          <div className="flex gap-2 flex-wrap">
            {strengths.competitive_advantages?.map((adv, i) => (
              <Chip key={i} label={adv} color="secondary" variant="outlined" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrengthsTab;

