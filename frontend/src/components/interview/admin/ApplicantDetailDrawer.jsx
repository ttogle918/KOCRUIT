import React from 'react';
import { FaTimesCircle } from 'react-icons/fa';
import { FiUser } from 'react-icons/fi';

const ApplicantDetailDrawer = ({ 
  isOpen, 
  onClose, 
  applicant, 
  handleViewDetails, 
  handleReAnalyze 
}) => {
  if (!isOpen || !applicant) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-0 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white h-full overflow-y-auto">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">지원자 상세 정보</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimesCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FiUser className="text-blue-600 text-xl" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{applicant.name}</h4>
                <p className="text-sm text-gray-600">{applicant.email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">직무 공고:</span>
                <span className="text-sm font-medium">{applicant.job_post?.title || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">지원일:</span>
                <span className="text-sm font-medium">{new Date(applicant.applied_at || applicant.created_at).toLocaleDateString()}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>전형별 점수</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <p className="text-[10px] text-purple-600">AI</p>
                    <p className="font-bold text-purple-700">{applicant.ai_interview_score || '-'}</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="text-[10px] text-green-600">실무</p>
                    <p className="font-bold text-green-700">{applicant.practical_interview_score || '-'}</p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <p className="text-[10px] text-orange-600">임원</p>
                    <p className="font-bold text-orange-700">{applicant.executive_interview_score || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">주요 강점</h4>
            <div className="space-y-2">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">✅ AI 면접에서 높은 점수 획득</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">✅ 실무진 면접 통과</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">✅ 적극적인 지원 태도</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">개선점</h4>
            <div className="space-y-2">
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">⚠️ 임원진 면접 지연</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">최근 점수 변화</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">AI 면접:</span>
                <span className="font-medium text-blue-600">{applicant.ai_interview_score || 'N/A'}점</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">실무진 면접:</span>
                <span className="font-medium text-green-600">합격</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">임원진 면접:</span>
                <span className="font-medium text-gray-600">대기중</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">리스크 플래그</h4>
            <div className="space-y-2">
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="text-sm text-red-800">⚠️ 임원진 면접 지연</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">이전 평가 결과</h4>
            <div className="border rounded-lg">
              <div className="border-b">
                <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                  서류 전형
                </button>
              </div>
              <div className="border-b">
                <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                  직무 적성
                </button>
              </div>
              <div>
                <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                  AI 면접
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                handleViewDetails(applicant);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              전체 프로세스 보기
            </button>
            <button
              onClick={() => {
                onClose();
                handleReAnalyze(applicant);
              }}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              재분석
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetailDrawer;

