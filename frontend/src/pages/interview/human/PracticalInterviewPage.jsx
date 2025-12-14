import React from 'react';
import InterviewWorkspace from '../../../../../components/interview/common/InterviewWorkspace';
import useInterviewData from '../../../../../hooks/useInterviewData';

// 실무진 면접 전용 페이지 (기존 InterviewPanel 복사본, 향후 커스터마이징 분리)
export default function PracticalInterviewPage() {
  const { questions, application, loading, error } = useInterviewData('practical');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">면접 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-red-600">데이터 로딩 중 오류가 발생했습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 실무진 면접 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">실무진 면접</h1>
          <p className="mt-2 text-gray-600">
            지원자의 실무 역량과 기술적 능력을 평가하는 면접입니다.
          </p>
          <div className="mt-4 flex items-center space-x-4">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              실무진 면접
            </div>
            <div className="text-sm text-gray-500">
              기술적 의사소통 및 문제해결능력 평가
            </div>
          </div>
        </div>
        
        {/* InterviewPanel에 실무진 면접 타입 전달 */}
        <InterviewWorkspace 
          questions={questions}
          applicantName={application?.applicantName}
          jobInfo={{ title: application?.job_title || '직무 정보 없음' }}
          resumeInfo={application} 
          interviewType="practical"
          interviewStage="practical"
        />
      </div>
    </div>
  );
}
