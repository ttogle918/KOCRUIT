import React, { useState, useEffect } from 'react';
import { 
  CheckCircle as CheckIcon, 
  Cancel as CancelIcon, 
  Schedule as PendingIcon, 
  PlayArrow as ProgressIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { Button, Chip, LinearProgress } from '@mui/material';

const InterviewStatisticsPanel = ({ 
  applicants = [], 
  interviewStage = 'practice',
  onNavigateToStage 
}) => {
  const [statistics, setStatistics] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0,
    inProgress: 0,
    scheduled: 0
  });

  // 면접 단계별 라벨
  const stageLabels = {
    ai: 'AI',
    practice: '실무진',
    executive: '임원진'
  };

  // 면접 단계별 상태 필드
  const stageStatusFields = {
    ai: 'ai_interview_status',
    practice: 'practical_interview_status',
    executive: 'executive_interview_status'
  };

  // 통계 계산
  useEffect(() => {
    if (!applicants || applicants.length === 0) return;

    const statusField = stageStatusFields[interviewStage];
    const stats = {
      total: applicants.length,
      passed: 0,
      failed: 0,
      pending: 0,
      inProgress: 0,
      scheduled: 0
    };

    applicants.forEach(applicant => {
      const status = applicant[statusField] || 'PENDING';
      switch (status) {
        case 'PASSED':
          stats.passed++;
          break;
        case 'FAILED':
          stats.failed++;
          break;
        case 'IN_PROGRESS':
          stats.inProgress++;
          break;
        case 'SCHEDULED':
          stats.scheduled++;
          break;
        default:
          stats.pending++;
          break;
      }
    });

    setStatistics(stats);
  }, [applicants, interviewStage]);

  // 진행률 계산
  const progressPercentage = statistics.total > 0 
    ? Math.round(((statistics.passed + statistics.failed + statistics.inProgress) / statistics.total) * 100)
    : 0;

  // 합격률 계산
  const passRate = statistics.total > 0 
    ? Math.round((statistics.passed / statistics.total) * 100)
    : 0;

  // 오늘 면접 일정 (예시 데이터)
  const todayInterviews = [
    { time: '09:00', name: '김철수', type: '실무진' },
    { time: '10:30', name: '이영희', type: '실무진' },
    { time: '14:00', name: '박민수', type: '임원진' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 h-full overflow-y-auto">
      {/* 제목 */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {stageLabels[interviewStage]} 전형 현황
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          전체 {statistics.total}명 중 {statistics.passed + statistics.failed}명 완료
        </p>
      </div>

      {/* 주요 통계 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {statistics.passed}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">전형 합격</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
            {statistics.failed}
          </div>
          <div className="text-sm text-red-700 dark:text-red-300">전형 불합격</div>
        </div>
      </div>

      {/* 진행률 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            전체 진행률
          </span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {progressPercentage}%
          </span>
        </div>
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage}
          sx={{ 
            height: 8, 
            borderRadius: 4,
            backgroundColor: '#e5e7eb',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: '#3b82f6'
            }
          }}
        />
      </div>

      {/* 상세 통계 */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="flex items-center gap-2">
            <PendingIcon className="text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">대기중</span>
          </div>
          <Chip 
            label={`${statistics.pending}명`} 
            size="small" 
            variant="outlined"
            sx={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', color: '#d97706' }}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="flex items-center gap-2">
            <CalendarIcon className="text-blue-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">일정 확정</span>
          </div>
          <Chip 
            label={`${statistics.scheduled}명`} 
            size="small" 
            variant="outlined"
            sx={{ backgroundColor: '#dbeafe', borderColor: '#3b82f6', color: '#1d4ed8' }}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="flex items-center gap-2">
            <ProgressIcon className="text-yellow-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">진행중</span>
          </div>
          <Chip 
            label={`${statistics.inProgress}명`} 
            size="small" 
            variant="outlined"
            sx={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', color: '#d97706' }}
          />
        </div>
      </div>

      {/* 합격률 */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 mb-6 text-center">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
          {passRate}%
        </div>
        <div className="text-sm text-green-700 dark:text-green-300">
          {stageLabels[interviewStage]} 전형 합격률
        </div>
      </div>

      {/* 오늘 면접 일정 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            오늘 면접 일정
          </h3>
        </div>
        <div className="space-y-2">
          {todayInterviews.length > 0 ? (
            todayInterviews.map((interview, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {interview.time}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {interview.name}
                  </div>
                </div>
                <Chip 
                  label={interview.type} 
                  size="small" 
                  variant="outlined"
                  sx={{ backgroundColor: '#dbeafe', borderColor: '#3b82f6', color: '#1d4ed8' }}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              오늘 예정된 면접이 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 다른 전형으로 이동 버튼 */}
      <div className="space-y-2">
        {interviewStage !== 'ai' && (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TrendingIcon />}
            onClick={() => onNavigateToStage && onNavigateToStage('ai')}
            sx={{ 
              borderColor: '#10b981', 
              color: '#10b981',
              '&:hover': { borderColor: '#059669', backgroundColor: '#ecfdf5' }
            }}
          >
            AI 면접 현황 보기
          </Button>
        )}
        
        {interviewStage !== 'practice' && (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TrendingIcon />}
            onClick={() => onNavigateToStage && onNavigateToStage('practice')}
            sx={{ 
              borderColor: '#3b82f6', 
              color: '#3b82f6',
              '&:hover': { borderColor: '#2563eb', backgroundColor: '#eff6ff' }
            }}
          >
            실무진 면접 현황 보기
          </Button>
        )}
        
        {interviewStage !== 'executive' && (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TrendingIcon />}
            onClick={() => onNavigateToStage && onNavigateToStage('executive')}
            sx={{ 
              borderColor: '#8b5cf6', 
              color: '#8b5cf6',
              '&:hover': { borderColor: '#7c3aed', backgroundColor: '#faf5ff' }
            }}
          >
            임원진 면접 현황 보기
          </Button>
        )}
      </div>
    </div>
  );
};

export default InterviewStatisticsPanel;
