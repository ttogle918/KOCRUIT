import React from 'react';
import { Typography, Paper, Chip, Divider, List, ListItem, ListItemText } from '@mui/material';

const CriteriaTab = ({ criteria, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!criteria) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 text-center py-10 text-gray-500">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 overflow-y-auto">
      <Typography variant="h5" className="mb-4 font-bold flex items-center gap-2">
        <span>🎯</span> 평가 기준 및 항목
      </Typography>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {criteria.suggested_criteria?.map((c, i) => (
            <Paper key={i} className="p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <Typography variant="subtitle1" className="font-bold text-blue-800">{c.criterion}</Typography>
                <Chip label={`${c.max_score}점 만점`} size="small" />
              </div>
              <Typography variant="body2" className="text-gray-600 mb-3">{c.description}</Typography>
              {criteria.weight_recommendations?.find(w => w.criterion === c.criterion) && (
                <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded">
                  <strong>가중치:</strong> {(criteria.weight_recommendations.find(w => w.criterion === c.criterion).weight * 100).toFixed(0)}%
                  <span className="ml-2">({criteria.weight_recommendations.find(w => w.criterion === c.criterion).reason})</span>
                </div>
              )}
            </Paper>
          ))}
        </div>
        <Divider />
        <div>
          <Typography variant="subtitle1" className="font-bold text-slate-800 mb-3">추천 면접 질문</Typography>
          <List dense>
            {criteria.evaluation_questions?.map((q, i) => (
              <ListItem key={i}><ListItemText primary={q} /></ListItem>
            ))}
          </List>
        </div>
      </div>
    </div>
  );
};

export default CriteriaTab;

