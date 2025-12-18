import React from 'react';
import { FiUser } from 'react-icons/fi';
import { FaEye, FaBrain } from 'react-icons/fa';
import { MdOutlineBusinessCenter } from 'react-icons/md';
import { FaCrown, FaFileAlt } from 'react-icons/fa';
import { FiTarget } from 'react-icons/fi';

const ApplicantProcessCard = ({ applicant, onViewDetails, StageName, OverallStatus, StageStatus }) => {
  const getStageInfo = (currentStage) => {
    switch (currentStage) {
      case StageName.WRITTEN_TEST:
      case StageName.AI_INTERVIEW:
        return { stage: 'AI 면접', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <FaBrain /> };
      case StageName.PRACTICAL_INTERVIEW:
        return { stage: '실무진 면접', color: 'text-green-600', bgColor: 'bg-green-100', icon: <MdOutlineBusinessCenter /> };
      case StageName.EXECUTIVE_INTERVIEW:
        return { stage: '임원진 면접', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: <FaCrown /> };
      case StageName.FINAL_RESULT:
        return { stage: '최종 결과', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <FiTarget /> };
      default:
        return { stage: '서류 전형', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <FaFileAlt /> };
    }
  };

  const getStatusColor = (overallStatus, stageStatus) => {
    if (overallStatus === OverallStatus.PASSED) return 'text-green-600';
    if (overallStatus === OverallStatus.REJECTED) return 'text-red-600';
    if (overallStatus === OverallStatus.CANCELED) return 'text-gray-500';
    
    if (stageStatus === StageStatus.PASSED) return 'text-green-600';
    if (stageStatus === StageStatus.FAILED) return 'text-red-600';
    if (stageStatus === StageStatus.COMPLETED) return 'text-blue-600';
    if (stageStatus === StageStatus.IN_PROGRESS) return 'text-yellow-600';
    
    return 'text-gray-600';
  };

  const stageInfo = getStageInfo(applicant.current_stage);
  const statusColor = getStatusColor(applicant.overall_status, applicant.stage_status);

  return (
    <div className="p-4 border rounded-lg transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FiUser className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{applicant.name}</h3>
            <p className="text-sm text-gray-600">{applicant.email}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stageInfo.bgColor} ${stageInfo.color}`}>
            {stageInfo.icon} <span className="ml-1">{stageInfo.stage}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">AI점수: {applicant.ai_interview_score || 'N/A'}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">지원일:</span>
          <span className="font-medium">{new Date(applicant.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">현재 상태:</span>
          <span className={`font-medium ${statusColor}`}>
            {applicant.overall_status === OverallStatus.IN_PROGRESS 
              ? (applicant.stage_status || '진행중') 
              : applicant.overall_status}
          </span>
        </div>
      </div>
      
      <button
        onClick={() => onViewDetails(applicant)}
        className="mt-3 w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        <FaEye className="inline w-4 h-4 mr-2" />
        전체 프로세스 보기
      </button>
    </div>
  );
};

export default ApplicantProcessCard;