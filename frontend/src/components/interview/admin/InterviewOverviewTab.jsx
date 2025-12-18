import React from 'react';
import { FaUsers, FaBrain, FaCrown } from 'react-icons/fa';
import { MdOutlineBusinessCenter } from 'react-icons/md';

const InterviewOverviewTab = ({ statistics, setActiveTab, setFilterStatus, setShowBatchModal, StageName }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">전체 채용 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div 
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => {
              setActiveTab('applicants');
            }}
          >
            <div className="flex items-center">
              <FaUsers className="text-blue-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-blue-600">전체 지원</p>
                <p className="text-2xl font-bold text-blue-700">{statistics.total}명</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-purple-50 border border-purple-200 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors"
            onClick={() => {
              setActiveTab('applicants');
              setFilterStatus('AI_INTERVIEW');
            }}
          >
            <div className="flex items-center">
              <FaBrain className="text-purple-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-purple-600">AI 면접</p>
                <p className="text-2xl font-bold text-purple-700">{statistics.aiInterview.total}명</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => {
              setActiveTab('applicants');
              setFilterStatus('PRACTICAL_INTERVIEW');
            }}
          >
            <div className="flex items-center">
              <MdOutlineBusinessCenter className="text-green-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-green-600">실무진 면접</p>
                <p className="text-2xl font-bold text-green-700">{statistics.practical.total}명</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-colors"
            onClick={() => {
              setActiveTab('applicants');
              setFilterStatus('EXECUTIVE_INTERVIEW');
            }}
          >
            <div className="flex items-center">
              <FaCrown className="text-yellow-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-yellow-600">임원진 면접</p>
                <p className="text-2xl font-bold text-yellow-700">{statistics.executive.total}명</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-orange-50 border border-orange-200 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
            onClick={() => {
              setActiveTab('applicants');
              setFilterStatus('FINAL_RESULT');
            }}
          >
            <div className="flex items-center">
              <FaCrown className="text-orange-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-orange-600">최종 합격자</p>
                <p className="text-2xl font-bold text-orange-700">{statistics.final.total}명</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">AI 면접 통계</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">통과:</span>
                <span className="font-medium text-green-600">{statistics.aiInterview.passed}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">불합격:</span>
                <span className="font-medium text-red-600">{statistics.aiInterview.failed}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">대기중:</span>
                <span className="font-medium text-yellow-600">{statistics.aiInterview.pending}명</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">실무진 면접 통계</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">합격:</span>
                <span className="font-medium text-green-600">{statistics.practical.passed}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">불합격:</span>
                <span className="font-medium text-red-600">{statistics.practical.failed}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">진행중:</span>
                <span className="font-medium text-yellow-600">{statistics.practical.inProgress}명</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">임원진 면접 통계</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">합격:</span>
                <span className="font-medium text-green-600">{statistics.executive.passed}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">불합격:</span>
                <span className="font-medium text-red-600">{statistics.executive.failed}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">진행중:</span>
                <span className="font-medium text-yellow-600">{statistics.executive.inProgress}명</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">단계별 면접 진행 관리</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">AI 면접 단계</h3>
            <p className="text-sm text-gray-600 mb-3">
              현재 {statistics.aiInterview.passed}명 통과, {statistics.aiInterview.failed}명 불합격
            </p>
            <button 
              onClick={() => {
                setActiveTab('applicants');
                setFilterStatus('AI_INTERVIEW_PASSED');
              }}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              AI 면접 보기
            </button>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">실무진 면접 단계</h3>
            <p className="text-sm text-gray-600 mb-3">
              현재 {statistics.practical.passed}명 합격, {statistics.practical.inProgress}명 진행중
            </p>
            <button 
              onClick={() => {
                setActiveTab('applicants');
                setFilterStatus('PRACTICAL_INTERVIEW_PASSED');
              }}
              className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              실무진 면접 보기
            </button>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">임원진 면접 단계</h3>
            <p className="text-sm text-gray-600 mb-3">
              현재 {statistics.executive.passed}명 합격, {statistics.executive.inProgress}명 진행중
            </p>
            <button 
              onClick={() => {
                setActiveTab('applicants');
                setFilterStatus('EXECUTIVE_INTERVIEW_PASSED');
              }}
              className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              임원진 면접 보기
            </button>
          </div>
          
        </div>
      </div>

      {statistics.practical.total > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">단계별 일괄 관리</h2>
          <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">실무진 면접 마감</h3>
                <p className="text-sm text-gray-600 mt-1">
                  실무진 면접 단계를 한번에 마감하고 다음 단계로 진행합니다. ({statistics.practical.total}명)
                </p>
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ 진행중인 면접은 완료로, 완료된 면접은 합격으로 처리됩니다.
                </p>
              </div>
              <button
                onClick={() => setShowBatchModal(true)}
                className="px-6 py-3 text-white rounded-lg font-medium transition-colors bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                실무진 면접 마감
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewOverviewTab;
