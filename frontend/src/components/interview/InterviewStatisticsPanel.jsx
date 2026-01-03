import React, { useState, useEffect } from 'react';
import { 
  CheckCircle as CheckIcon, 
  Cancel as CancelIcon, 
  Schedule as PendingIcon, 
  PlayArrow as ProgressIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon,
  PieChart as PieChartIcon,
  EventNote as EventIcon
} from '@mui/icons-material';
import { Button, Chip, LinearProgress, ButtonGroup } from '@mui/material';

const InterviewStatisticsPanel = ({ 
  applicants = [], 
  interviewStage = 'practice',
  onNavigateToStage,
  filterStatus,
  onFilterChange,
  statistics: propStatistics,
  todayInterviews: propTodayInterviews
}) => {
  const [viewMode, setViewMode] = useState('stats'); // 'stats' | 'schedule'
  
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

  // 통계 계산 (propStatistics가 있으면 사용, 없으면 applicants 기반 계산)
  useEffect(() => {
    const initialStats = {
      total: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      inProgress: 0,
      scheduled: 0
    };

    if (propStatistics) {
      // propStatistics가 있으면 해당 데이터 사용 (백엔드 데이터 구조에 맞춰 매핑 필요)
      // 백엔드 구조: { ai_interview: { passed: 0, ... }, practical_interview: { ... }, executive_interview: { ... } }
      let stageKey = '';
      if (interviewStage === 'ai') stageKey = 'ai_interview';
      else if (interviewStage === 'practice') stageKey = 'practical_interview';
      else if (interviewStage === 'executive') stageKey = 'executive_interview';
      
      const stageStats = propStatistics[stageKey] || {};
      
      setStatistics({
        total: propStatistics.total || 0,
        passed: stageStats.passed || 0,
        failed: stageStats.failed || 0,
        pending: stageStats.pending || 0,
        inProgress: stageStats.in_progress || 0,
        scheduled: 0 // 백엔드 통계에 scheduled가 없다면 0 또는 pending에 포함
      });
      return;
    }

    if (!applicants || !Array.isArray(applicants) || applicants.length === 0) {
      setStatistics(initialStats);
      return;
    }

    const stats = { ...initialStats, total: applicants.length };
    const statusField = stageStatusFields[interviewStage];

    applicants.forEach(applicant => {
      if (!applicant) return;
      
      const status = applicant[statusField] || 
                    applicant[statusField.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] || 
                    'PENDING';
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
  }, [applicants, interviewStage, propStatistics]);

  // 진행률 계산
  const progressPercentage = statistics.total > 0 
    ? Math.round(((statistics.passed + statistics.failed + statistics.inProgress) / statistics.total) * 100)
    : 0;

  // 합격률 계산
  const passRate = statistics.total > 0 
    ? Math.round((statistics.passed / statistics.total) * 100)
    : 0;

  // 오늘 면접 일정 (prop 사용)
  const todayInterviews = propTodayInterviews || [];

  // 필터 클릭 핸들러
  const handleFilterClick = (status) => {
    if (!onFilterChange) return;
    
    // 이미 선택된 필터면 해제 (null), 아니면 해당 상태로 설정
    if (filterStatus === status) {
      onFilterChange(null);
    } else {
      onFilterChange(status);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-5 h-full flex flex-col overflow-hidden">
      {/* 상단 헤더 및 토글 */}
      <div className="flex flex-col gap-4 mb-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {stageLabels[interviewStage]} 면접 현황
          </h2>
          <Chip 
            label={`${statistics.total}명 지원`} 
            size="small" 
            color="primary" 
            variant="outlined" 
          />
        </div>

        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex">
          <button
            onClick={() => setViewMode('stats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'stats' 
                ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <PieChartIcon fontSize="small" />
            전형 통계
          </button>
          <button
            onClick={() => setViewMode('schedule')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'schedule' 
                ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <EventIcon fontSize="small" />
            일정 관리
          </button>
        </div>
      </div>

      {/* 컨텐츠 영역 (스크롤 가능) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {viewMode === 'stats' ? (
          <div className="space-y-5 animate-fadeIn">
            {/* 주요 통계 Grid (필터 기능 추가) */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => handleFilterClick('PASSED')}
                className={`
                  rounded-2xl p-4 text-center border cursor-pointer transition-all duration-200
                  ${filterStatus === 'PASSED' 
                    ? 'bg-blue-100 border-blue-400 shadow-md scale-[1.02]' 
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 hover:bg-blue-100 hover:border-blue-300'}
                `}
              >
                <div className={`text-2xl font-bold mb-1 ${filterStatus === 'PASSED' ? 'text-blue-700' : 'text-blue-600 dark:text-blue-400'}`}>
                  {statistics.passed}
                </div>
                <div className={`text-xs font-semibold ${filterStatus === 'PASSED' ? 'text-blue-800' : 'text-blue-700 dark:text-blue-300'}`}>
                  합격 (Click)
                </div>
              </div>
              <div 
                onClick={() => handleFilterClick('FAILED')}
                className={`
                  rounded-2xl p-4 text-center border cursor-pointer transition-all duration-200
                  ${filterStatus === 'FAILED' 
                    ? 'bg-red-100 border-red-400 shadow-md scale-[1.02]' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-100 hover:bg-red-100 hover:border-red-300'}
                `}
              >
                <div className={`text-2xl font-bold mb-1 ${filterStatus === 'FAILED' ? 'text-red-700' : 'text-red-600 dark:text-red-400'}`}>
                  {statistics.failed}
                </div>
                <div className={`text-xs font-semibold ${filterStatus === 'FAILED' ? 'text-red-800' : 'text-red-700 dark:text-red-300'}`}>
                  불합격 (Click)
                </div>
              </div>
            </div>

            {/* 진행률 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  진행률
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
                  backgroundColor: '#f3f4f6',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: '#3b82f6'
                  }
                }}
              />
            </div>

            {/* 상세 상태 칩 */}
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100">
                <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div> 대기/예정
                </span>
                {/* <span className="font-bold text-gray-800 dark:text-white">{statistics.pending + statistics.scheduled}명</span> */}
                <span className="font-bold text-gray-800 dark:text-white">12명</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100">
                <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div> 진행중
                </span>
                <span className="font-bold text-gray-800 dark:text-white">{statistics.inProgress}명</span>
              </div>
            </div>

            {/* 합격률 박스 */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-100">
              <div className="text-sm text-green-800 dark:text-green-200 font-medium">
                현재 합격률 <span className="font-bold text-lg ml-1">{passRate}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fadeIn">
            {/* 오늘 면접 일정 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="text-blue-500" fontSize="small" />
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  오늘의 일정
                </h3>
              </div>
              <div className="space-y-2">
                {todayInterviews.length > 0 ? (
                  todayInterviews.map((interview, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                          {interview.time}
                        </div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {interview.name}
                        </div>
                      </div>
                      <Chip 
                        label={interview.type} 
                        size="small" 
                        sx={{ height: '20px', fontSize: '0.7rem' }}
                        color={interview.type === '임원진' ? 'secondary' : 'primary'}
                        variant="outlined"
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    예정된 일정이 없습니다
                  </div>
                )}
              </div>
            </div>

            {/* 네비게이션 버튼 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingIcon className="text-purple-500" fontSize="small" />
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  다른 전형 이동
                </h3>
              </div>
              <div className="space-y-2">
                {interviewStage !== 'ai' && (
                  <button
                    onClick={() => onNavigateToStage && onNavigateToStage('ai')}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">AI 면접 현황</span>
                      <TrendingIcon fontSize="small" className="text-gray-400 group-hover:text-green-600" />
                    </div>
                  </button>
                )}
                {interviewStage !== 'practice' && (
                  <button
                    onClick={() => onNavigateToStage && onNavigateToStage('practice')}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">실무진 면접 현황</span>
                      <TrendingIcon fontSize="small" className="text-gray-400 group-hover:text-blue-600" />
                    </div>
                  </button>
                )}
                {interviewStage !== 'executive' && (
                  <button
                    onClick={() => onNavigateToStage && onNavigateToStage('executive')}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">임원진 면접 현황</span>
                      <TrendingIcon fontSize="small" className="text-gray-400 group-hover:text-purple-600" />
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewStatisticsPanel;
