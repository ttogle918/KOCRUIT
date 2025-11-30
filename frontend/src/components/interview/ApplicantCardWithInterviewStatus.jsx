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
    <div 
      className={`
        relative group cursor-pointer transition-all duration-300 ease-out
        rounded-xl border mb-3 overflow-hidden
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-[0_8px_20px_-6px_rgba(59,130,246,0.4)] -translate-y-1' 
          : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-lg hover:-translate-y-1'
        }
      `}
      onClick={onClick}
    >
      {/* 카드 입체감을 위한 하단 두께 효과 */}
      <div className={`absolute bottom-0 left-0 w-full h-1 ${isSelected ? 'bg-blue-500' : 'bg-gray-100 group-hover:bg-blue-200'} transition-colors duration-300`}></div>

      {/* 내용 영역 (패딩 추가) */}
      <div className="p-1 pb-2">
        <ApplicantCard
          applicant={applicant}
          index={index}
          isSelected={isSelected}
          // onClick은 상위 div에서 처리하므로 여기선 제외하거나 전파 방지
          // onClick={onClick} 
          onBookmarkToggle={onBookmarkToggle}
          calculateAge={calculateAge}
          compact={compact}
          resumeId={resumeId}
          // 기존 스타일 무력화를 위해 className 전달 가능 시 사용
        />
      </div>
      
      {/* 면접 상태 배지 (카드 내부 우측 상단, 디자인 개선) */}
      {showInterviewStatus && (
        <div className="absolute top-3 right-3 z-10">
          <div className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm border
            backdrop-blur-sm bg-opacity-90 transition-all duration-300
            ${statusConfig.color.replace('text-', 'text-opacity-100 text-')} 
            ${statusConfig.bgColor}
            border-opacity-20 border-gray-400
          `}>
            {statusConfig.icon}
            <span className="hidden sm:inline whitespace-nowrap">{statusConfig.label}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantCardWithInterviewStatus;
