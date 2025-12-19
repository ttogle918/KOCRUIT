import React from 'react';
import { Typography, Alert, Chip, List, ListItem, ListItemText, Divider } from '@mui/material';

const GuidelineTab = ({ guideline, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!guideline) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 text-center py-10 text-gray-500">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 overflow-y-auto">
      <Typography variant="h5" className="mb-4 font-bold flex items-center gap-2">
        <span>📖</span> 면접 가이드라인
      </Typography>
      <div className="space-y-6">
        <Alert severity="info" className="mb-4">
          <Typography variant="subtitle2" className="font-bold">면접 접근 방식</Typography>
          {guideline.interview_approach}
        </Alert>
        <div>
          <Typography variant="subtitle1" className="font-bold text-slate-800 mb-3">카테고리별 주요 질문</Typography>
          <div className="space-y-4">
            {Object.entries(guideline.key_questions_by_category || {}).map(([cat, qs], i) => (
              <div key={i}>
                <Chip label={cat} size="small" color="primary" className="mb-2" />
                <List dense>
                  {qs.map((q, j) => <ListItem key={j}><ListItemText primary={q} /></ListItem>)}
                </List>
              </div>
            ))}
          </div>
        </div>
        <Divider />
        <div>
          <Typography variant="subtitle1" className="font-bold text-slate-800 mb-3">시간 배분 제안</Typography>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(guideline.time_allocation || {}).map(([task, time], i) => (
              <Chip key={i} label={`${task}: ${time}`} variant="outlined" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidelineTab;

