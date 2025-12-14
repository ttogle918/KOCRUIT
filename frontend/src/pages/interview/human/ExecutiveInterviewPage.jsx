import React from 'react';
import InterviewWorkspace from '../../../../../components/interview/common/InterviewWorkspace';
import useInterviewData from '../../../../../hooks/useInterviewData';

// 임원진 면접 전용 페이지 (기존 InterviewPanel 복사본, 향후 커스터마이징 분리)
export default function ExecutiveInterviewPage() {
  const { questions, application, loading, error } = useInterviewData('executive');

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
        {/* 임원진 면접 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">임원진 면접</h1>
          <p className="mt-2 text-gray-600">
            지원자의 리더십, 비전, 조직 융합성을 평가하는 최종 면접입니다.
          </p>
          <div className="mt-4 flex items-center space-x-4">
            <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
              임원진 면접
            </div>
            <div className="text-sm text-gray-500">
              리더십, 비전 및 조직 융합성 평가
            </div>
          </div>
        </div>
        
        {/* InterviewPanel에 임원진 면접 타입 전달 */}
        <InterviewWorkspace 
          questions={questions}
          applicantName={application?.applicantName}
          jobInfo={{ title: application?.job_title || '직무 정보 없음' }}
          resumeInfo={application} 
          interviewType="executive"
          interviewStage="executive"
        />
      </div>
    </div>
  );
}
