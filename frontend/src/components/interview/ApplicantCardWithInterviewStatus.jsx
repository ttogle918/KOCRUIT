import React from 'react';
import ApplicantCard from '../ApplicantCard';
import { FaCalendarAlt, FaPlay, FaCheck, FaTimes, FaClock } from 'react-icons/fa';

const ApplicantCardWithInterviewStatus = ({ 
  applicant, 
  index,
  isSelected,
  onClick,
  onBookmarkToggle,
  calculateAge,
  compact = false,
  resumeId,
  showInterviewStatus = true,
  interviewStage = 'practice' // 'ai', 'practice', 'executive'
}) => {
  // 면접 상태 매핑
  const getInterviewStatusConfig = (status, stage) => {
    const stageLabels = {
      ai: 'AI',
      practice: '실무진',
      executive: '임원진'
    };
    
    const configs = {
      PENDING: {
        label: `${stageLabels[stage]} 전형 대기`,
        icon: <FaClock className="text-gray-400" />,
        color: 'bg-gray-100 text-gray-600',
        bgColor: 'bg-gray-50'
      },
      SCHEDULED: {
        label: `전형 일정 확정`,
        icon: <FaCalendarAlt className="text-blue-500" />,
        color: 'bg-blue-100 text-blue-600',
        bgColor: 'bg-blue-50'
      },
      IN_PROGRESS: {
        label: `전형 진행 중`,
        icon: <FaPlay className="text-yellow-500" />,
        color: 'bg-yellow-100 text-yellow-600',
        bgColor: 'bg-yellow-50'
      },
      COMPLETED: {
        label: `전형 완료`,
        icon: <FaCheck className="text-green-500" />,
        color: 'bg-green-100 text-green-600',
        bgColor: 'bg-green-50'
      },
      PASSED: {
        label: `전형 합격`,
        icon: <FaCheck className="text-green-500" />,
        color: 'bg-green-200 text-green-700',
        bgColor: 'bg-green-100'
      },
      FAILED: {
        label: `전형 불합격`,
        icon: <FaTimes className="text-red-500" />,
        color: 'bg-red-200 text-red-700',
        bgColor: 'bg-red-100'
      },
      CANCELLED: {
        label: `전형 취소`,
        icon: <FaTimes className="text-red-500" />,
        color: 'bg-red-100 text-red-600',
        bgColor: 'bg-red-50'
      }
    };
    
    return configs[status] || configs.PENDING;
  };

  // 면접 단계별 상태 가져오기
  const getInterviewStatus = () => {
    console.log('🔍 ApplicantCardWithInterviewStatus - applicant:', applicant);
    console.log('🔍 ApplicantCardWithInterviewStatus - interviewStage:', interviewStage);
    console.log('🔍 ApplicantCardWithInterviewStatus - practical_interview_status:', applicant?.practical_interview_status);
    
    switch (interviewStage) {
      case 'ai':
        return applicant?.ai_interview_status || 'PENDING';
      case 'practice':
        return applicant?.practical_interview_status || 'PENDING';
      case 'executive':
        return applicant?.executive_interview_status || 'PENDING';
      default:
        return 'PENDING';
    }
  };

  const interviewStatus = getInterviewStatus();
  const statusConfig = getInterviewStatusConfig(interviewStatus, interviewStage);

  return (
    <div className="relative">
      {/* 기존 ApplicantCard */}
      <ApplicantCard
        applicant={applicant}
        index={index}
        isSelected={isSelected}
        onClick={onClick}
        onBookmarkToggle={onBookmarkToggle}
        calculateAge={calculateAge}
        compact={compact}
        resumeId={resumeId}
      />
      
      {/* 면접 상태 배지 (우측 상단에 오버레이) */}
      {showInterviewStatus && (
        <div className="absolute top-2 right-2 z-10">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md border ${statusConfig.color} ${statusConfig.bgColor}`}>
            {statusConfig.icon}
            <span className="hidden sm:inline whitespace-nowrap">{statusConfig.label}</span>
            <span className="sm:hidden whitespace-nowrap">
              {interviewStatus === 'PASSED' ? '합격' : 
               interviewStatus === 'FAILED' ? '불합격' : 
               interviewStatus === 'IN_PROGRESS' ? '진행중' : 
               interviewStatus === 'COMPLETED' ? '완료' : 
               interviewStatus === 'SCHEDULED' ? '일정확정' : 
               interviewStatus === 'CANCELLED' ? '취소' : '대기'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantCardWithInterviewStatus;
