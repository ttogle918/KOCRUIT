import React from 'react';
import { Typography, List, ListItem, ListItemText, Divider, Box } from '@mui/material';

const ChecklistTab = ({ checklist, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 데이터가 문자열로 오면 파싱 시도
  let data = checklist;
  if (typeof checklist === 'string') {
    try {
      data = JSON.parse(checklist.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.error('Checklist parsing error:', e);
    }
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 text-center py-10 text-gray-500">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex-1 overflow-y-auto">
      <Typography variant="h5" className="mb-4 font-bold flex items-center gap-2">
        <span>📋</span> 면접 체크리스트
      </Typography>
      <div className="space-y-6">
        {data.pre_interview_checklist && (
          <>
            <div>
              <Typography variant="subtitle1" className="font-bold text-blue-600 mb-2">면접 전</Typography>
              <List dense>
                {data.pre_interview_checklist.map((item, i) => (
                  <ListItem key={i}><ListItemText primary={item} /></ListItem>
                ))}
              </List>
            </div>
            <Divider />
          </>
        )}
        
        {data.during_interview_checklist && (
          <>
            <div>
              <Typography variant="subtitle1" className="font-bold text-green-600 mb-2">면접 중</Typography>
              <List dense>
                {data.during_interview_checklist.map((item, i) => (
                  <ListItem key={i}><ListItemText primary={item} /></ListItem>
                ))}
              </List>
            </div>
            <Divider />
          </>
        )}

        {(data.red_flags_to_watch || data.green_flags_to_confirm) && (
          <div className="grid grid-cols-2 gap-4">
            {data.red_flags_to_watch && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <Typography variant="subtitle2" className="text-red-700 font-bold mb-1">주의해야 할 Red Flags</Typography>
                <ul className="text-xs text-red-600 list-disc ml-4">
                  {data.red_flags_to_watch.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            {data.green_flags_to_confirm && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <Typography variant="subtitle2" className="text-green-700 font-bold mb-1">확인해야 할 Green Flags</Typography>
                <ul className="text-xs text-green-600 list-disc ml-4">
                  {data.green_flags_to_confirm.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecklistTab;

