import React, { useMemo, useCallback } from 'react';
import { FiUser } from 'react-icons/fi';

// 성능 최적화: 상태 정보 헬퍼 함수
const getStatusInfo = (status) => {
  if (status === 'AI_INTERVIEW_COMPLETED' || status === 'AI_INTERVIEW_PASSED') {
    return { label: 'AI 면접 합격', color: 'text-green-600', bgColor: 'bg-green-100' };
  } else if (status === 'AI_INTERVIEW_FAILED') {
    return { label: 'AI 면접 불합격', color: 'text-red-600', bgColor: 'bg-red-100' };
  } else if (status === 'PRACTICAL_INTERVIEW_SCHEDULED') {
    return { label: 'AI 면접 통과 → 1차 면접 예정', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  } else if (status === 'PRACTICAL_INTERVIEW_IN_PROGRESS') {
    return { label: 'AI 면접 통과 → 1차 면접 진행중', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  } else if (status === 'PRACTICAL_INTERVIEW_COMPLETED') {
    return { label: 'AI 면접 통과 → 1차 면접 완료', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  } else if (status === 'PRACTICAL_INTERVIEW_PASSED') {
    return { label: 'AI 면접 통과 → 1차 면접 합격 (실무진)', color: 'text-green-600', bgColor: 'bg-green-100' };
  } else if (status === 'PRACTICAL_INTERVIEW_FAILED') {
    return { label: 'AI 면접 통과 → 1차 면접 불합격', color: 'text-red-600', bgColor: 'bg-red-100' };
  } else if (status === 'EXECUTIVE_INTERVIEW_SCHEDULED') {
    return { label: 'AI 면접 통과 → 2차 면접 예정', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  } else if (status === 'EXECUTIVE_INTERVIEW_IN_PROGRESS') {
    return { label: 'AI 면접 통과 → 2차 면접 진행중', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  } else if (status === 'EXECUTIVE_INTERVIEW_COMPLETED') {
    return { label: 'AI 면접 통과 → 2차 면접 완료', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  } else if (status === 'EXECUTIVE_INTERVIEW_PASSED') {
    return { label: 'AI 면접 통과 → 2차 면접 합격 (임원진)', color: 'text-green-600', bgColor: 'bg-green-100' };
  } else if (status === 'EXECUTIVE_INTERVIEW_FAILED') {
    return { label: 'AI 면접 통과 → 2차 면접 불합격', color: 'text-red-600', bgColor: 'bg-red-100' };
  } else if (status === 'FINAL_INTERVIEW_SCHEDULED') {
    return { label: 'AI 면접 통과 → 최종 면접 예정', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  } else if (status === 'FINAL_INTERVIEW_IN_PROGRESS') {
    return { label: 'AI 면접 통과 → 최종 면접 진행중', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  } else if (status === 'FINAL_INTERVIEW_COMPLETED') {
    return { label: 'AI 면접 통과 → 최종 면접 완료', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  } else if (status === 'FINAL_INTERVIEW_PASSED') {
    return { label: 'AI 면접 통과 → 최종 합격', color: 'text-green-600', bgColor: 'bg-green-100' };
  } else if (status === 'FINAL_INTERVIEW_FAILED') {
    return { label: 'AI 면접 통과 → 최종 불합격', color: 'text-red-600', bgColor: 'bg-red-100' };
  } else if (status && status.startsWith('PRACTICAL_INTERVIEW_')) {
    return { label: 'AI 면접 통과 → 1차 면접 (실무진)', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  } else if (status && status.startsWith('EXECUTIVE_INTERVIEW_')) {
    return { label: 'AI 면접 통과 → 2차 면접 (임원진)', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  } else if (status && status.startsWith('FINAL_INTERVIEW_')) {
    return { label: 'AI 면접 통과 → 최종 면접', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  } else {
    return { label: '대기중', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
};

// 면접 상태에 따른 버튼 정보 헬퍼 함수
const getButtonInfo = (status) => {
  if (status === 'PRACTICAL_INTERVIEW_SCHEDULED' || status === 'EXECUTIVE_INTERVIEW_SCHEDULED' || status === 'FINAL_INTERVIEW_SCHEDULED') {
    return { 
      text: '면접 시작', 
      bgColor: 'bg-blue-600', 
      hoverColor: 'hover:bg-blue-700',
      disabled: false,
      action: 'start'
    };
  } else if (status === 'PRACTICAL_INTERVIEW_IN_PROGRESS' || status === 'EXECUTIVE_INTERVIEW_IN_PROGRESS' || status === 'FINAL_INTERVIEW_IN_PROGRESS') {
    return { 
      text: '면접 완료', 
      bgColor: 'bg-orange-600', 
      hoverColor: 'hover:bg-orange-700',
      disabled: false,
      action: 'complete'
    };
  } else if (status === 'PRACTICAL_INTERVIEW_COMPLETED' || status === 'EXECUTIVE_INTERVIEW_COMPLETED' || status === 'FINAL_INTERVIEW_COMPLETED' ||
             status === 'PRACTICAL_INTERVIEW_PASSED' || status === 'EXECUTIVE_INTERVIEW_PASSED' || status === 'FINAL_INTERVIEW_PASSED' ||
             status === 'PRACTICAL_INTERVIEW_FAILED' || status === 'EXECUTIVE_INTERVIEW_FAILED' || status === 'FINAL_INTERVIEW_FAILED') {
    return { 
      text: '면접 평가 보기', 
      bgColor: 'bg-green-600', 
      hoverColor: 'hover:bg-green-700',
      disabled: false,
      action: 'view'
    };
  } else if (status === 'AI_INTERVIEW_COMPLETED' || status === 'AI_INTERVIEW_PASSED' || status === 'AI_INTERVIEW_FAILED') {
    return { 
      text: 'AI 면접 결과 보기', 
      bgColor: 'bg-purple-600', 
      hoverColor: 'hover:bg-purple-700',
      disabled: false,
      action: 'view'
    };
  } else {
    return { 
      text: '면접 평가 보기', 
      bgColor: 'bg-gray-600', 
      hoverColor: 'hover:bg-gray-700',
      disabled: false,
      action: 'view'
    };
  }
};

// 실무진 면접 합격 여부 확인 헬퍼 함수
const getPracticalInterviewResult = (practicalStatus) => {
  if (!practicalStatus || practicalStatus === 'PENDING') {
    return {
      isPassed: null,
      label: '평가 대기중',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200'
    };
  } else if (practicalStatus === 'SCHEDULED') {
    return {
      isPassed: null,
      label: '면접 일정 확정',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200'
    };
  } else if (practicalStatus === 'IN_PROGRESS') {
    return {
      isPassed: null,
      label: '면접 진행중',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200'
    };
  } else if (practicalStatus === 'COMPLETED') {
    return {
      isPassed: null,
      label: '면접 완료',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-200'
    };
  } else if (practicalStatus === 'PASSED') {
    return {
      isPassed: true,
      label: '실무진 면접 합격',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200'
    };
  } else if (practicalStatus === 'FAILED') {
    return {
      isPassed: false,
      label: '실무진 면접 불합격',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-200'
    };
  } else {
    return {
      isPassed: null,
      label: '알 수 없음',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200'
    };
  }
};

// 성능 최적화: 지원자 카드 컴포넌트를 메모이제이션
const ApplicantCard = React.memo(({ applicant, isSelected, onClick }) => {
  const statusInfo = useMemo(() => getStatusInfo(applicant.interview_status), 
    [applicant.interview_status]);
  
  const buttonInfo = useMemo(() => getButtonInfo(applicant.interview_status), 
    [applicant.interview_status]);

  const practicalResult = useMemo(() => getPracticalInterviewResult(applicant.practical_interview_status), 
    [applicant.practical_interview_status]);

  // 성능 최적화: 클릭 핸들러를 useCallback으로 최적화
  const handleEvaluationClick = useCallback(() => {
    onClick(applicant);
  }, [onClick, applicant]);

  // AI 면접 결과 확인 핸들러 (면접 진행 관리 제거)
  const handleViewResults = useCallback(() => {
    onClick(applicant);
  }, [onClick, applicant]);

  return (
    <div 
      className={`p-4 border rounded-lg transition-all duration-200 ${
        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FiUser className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{applicant.name}</h3>
            <p className="text-sm text-gray-600">{applicant.email}</p>
            {applicant.phone && (
              <p className="text-xs text-gray-500">{applicant.phone}</p>
            )}
            {applicant.created_at && (
              <p className="text-xs text-blue-600">
                지원일: {new Date(applicant.created_at).toLocaleDateString()}
              </p>
            )}
            {!applicant.resume_id && (
              <p className="text-xs text-orange-600">
                ⚠️ 이력서 정보 없음
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.label}
          </div>
          <p className="text-xs text-gray-500 mt-1">AI점수: {applicant.ai_interview_score || 'NULL'}</p>
          
          {/* 실무진 면접 합격 여부 표시 */}
          <div className={`mt-2 px-3 py-2 rounded-lg border ${practicalResult.bgColor} ${practicalResult.borderColor}`}>
            <div className={`text-xs font-medium ${practicalResult.textColor}`}>
              {practicalResult.label}
            </div>
          </div>
          
          {/* 임원진 면접 상태 표시 */}
          {applicant.executive_interview_status && applicant.executive_interview_status !== 'PENDING' && (
            <div className={`mt-1 px-3 py-2 rounded-lg border ${
              applicant.executive_interview_status === 'PASSED' ? 'bg-green-100 border-green-200' :
              applicant.executive_interview_status === 'FAILED' ? 'bg-red-100 border-red-200' :
              applicant.executive_interview_status === 'IN_PROGRESS' ? 'bg-yellow-100 border-yellow-200' :
              applicant.executive_interview_status === 'COMPLETED' ? 'bg-orange-100 border-orange-200' :
              'bg-blue-100 border-blue-200'
            }`}>
              <div className={`text-xs font-medium ${
                applicant.executive_interview_status === 'PASSED' ? 'text-green-800' :
                applicant.executive_interview_status === 'FAILED' ? 'text-red-800' :
                applicant.executive_interview_status === 'IN_PROGRESS' ? 'text-yellow-800' :
                applicant.executive_interview_status === 'COMPLETED' ? 'text-orange-800' :
                'text-blue-800'
              }`}>
                임원진: {applicant.executive_interview_status === 'PASSED' ? '합격' :
                         applicant.executive_interview_status === 'FAILED' ? '불합격' :
                         applicant.executive_interview_status === 'IN_PROGRESS' ? '진행중' :
                         applicant.executive_interview_status === 'COMPLETED' ? '완료' :
                         applicant.executive_interview_status === 'SCHEDULED' ? '일정확정' : '대기중'}
              </div>
            </div>
          )}
          
          {/* AI 면접 결과 확인 버튼 */}
          <button
            onClick={handleViewResults}
            className="mt-2 w-full px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            결과 보기
          </button>
        </div>
      </div>
    </div>
  );
});

ApplicantCard.displayName = 'ApplicantCard';

export default ApplicantCard;
export { getStatusInfo };
