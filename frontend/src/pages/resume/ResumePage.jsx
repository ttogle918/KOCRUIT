import React from 'react';
import ResumeCard from '../../components/ResumeCard';
import ResumeAnalysisAccordion from './ResumeAnalysisAccordion';
import GrowthPredictionCard from '../../components/GrowthPredictionCard';

export default function ResumePage({ resume, loading, error }) {
  // applicationId는 resume.applicationId 또는 resume.application_id에서 가져와야 함
  // 실제 데이터 구조에 따라 아래를 조정하세요
  const applicationId = resume?.applicationId || resume?.application_id;

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto p-4">
      {loading ? (
        <div className="text-blue-500 font-bold text-xl">로딩 중...</div>
      ) : error ? (
        <div className="text-red-500">이력서 로드 실패: {error}</div>
      ) : resume ? (
        <>
          <ResumeAnalysisAccordion resumeId={resume.id} />
          <ResumeCard resume={resume} loading={false} />
          {/* 성장 가능성 예측 카드 삽입 */}
          {applicationId && <GrowthPredictionCard applicationId={applicationId} />}
        </>
      ) : (
        <div className="text-gray-500">이력서 정보를 불러올 수 없습니다.</div>
      )}
    </div>
  );
} 