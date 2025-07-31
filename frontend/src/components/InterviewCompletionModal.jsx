import React from 'react';
import { 
  FiCheckCircle, 
  FiUsers, 
  FiAward, 
  FiArrowRight,
  FiAlertTriangle 
} from 'react-icons/fi';

const InterviewCompletionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  interviewType, 
  completedCount, 
  totalCount,
  passedCount,
  isLoading = false 
}) => {
  if (!isOpen) return null;

  const getInterviewTypeInfo = () => {
    switch (interviewType) {
      case 'FIRST_INTERVIEW':
        return {
          title: '1차 면접 (실무진)',
          description: '실무진 면접이 완료되었습니다.',
          icon: <FiUsers className="text-blue-500" size={24} />
        };
      case 'SECOND_INTERVIEW':
        return {
          title: '2차 면접 (임원진)',
          description: '임원진 면접이 완료되었습니다.',
          icon: <FiAward className="text-purple-500" size={24} />
        };
      case 'AI_INTERVIEW':
        return {
          title: 'AI 면접',
          description: 'AI 면접이 완료되었습니다.',
          icon: <FiCheckCircle className="text-green-500" size={24} />
        };
      default:
        return {
          title: '면접',
          description: '면접이 완료되었습니다.',
          icon: <FiCheckCircle className="text-gray-500" size={24} />
        };
    }
  };

  const interviewInfo = getInterviewTypeInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          {interviewInfo.icon}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {interviewInfo.title} 완료
            </h3>
            <p className="text-sm text-gray-600">
              {interviewInfo.description}
            </p>
          </div>
        </div>

        {/* 통계 정보 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {completedCount}/{totalCount}
              </div>
              <div className="text-sm text-gray-600">면접 완료</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {passedCount}
              </div>
              <div className="text-sm text-gray-600">합격자</div>
            </div>
          </div>
        </div>

        {/* 경고 메시지 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <div className="flex items-start gap-2">
            <FiAlertTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">면접 상태를 확정하시겠습니까?</p>
              <p className="mt-1">
                확정 후에는 면접 결과를 수정할 수 없으며, 
                다음 단계로 자동으로 진행됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                처리중...
              </>
            ) : (
              <>
                <FiArrowRight size={16} />
                확정 및 다음 단계
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewCompletionModal; 