import React from 'react';
import ResumeCard from '../../components/ResumeCard';
import ResumeAnalysisAccordion from './ResumeAnalysisAccordion';
import GrowthPredictionCard from '../../components/GrowthPredictionCard';
import HighlightedText from '../../components/HighlightedText';
import axios from 'axios';
import { useState, useEffect } from 'react';
import ResumePlagiarismAccordion from './ResumePlagiarismAccordion';

// 예시: 자기소개서 하이라이트 표시용 코드 (기존 코드 아래에 추가)
function ResumeSelfIntroHighlight({ selfIntroText }) {
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    if (!selfIntroText) return;
    axios.post('/api/v1/highlight', { text: selfIntroText })
      .then(res => setHighlights(res.data.highlights))
      .catch(() => setHighlights([]));
  }, [selfIntroText]);

  return (
    <HighlightedText text={selfIntroText} highlights={highlights} />
  );
}

export default function ResumePage({ resume, loading, error, jobpostId, applicationId }) {
  // applicationId를 props로 받거나 resume에서 가져오기
  const effectiveApplicationId = applicationId || resume?.applicationId || resume?.application_id;

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto p-4">
      {loading ? (
        <div className="text-blue-500 font-bold text-xl">로딩 중...</div>
      ) : error ? (
        <div className="text-red-500">이력서 로드 실패: {error}</div>
      ) : resume ? (
        <>
          <ResumePlagiarismAccordion resumeId={resume.id || resume.resume_id || resume.application_id} />
          <ResumeAnalysisAccordion resumeId={resume.id} />
          <ResumeCard resume={resume} loading={false} jobpostId={jobpostId} applicationId={effectiveApplicationId} />
          {/* 성장 가능성 예측 카드 삽입 */}
          {effectiveApplicationId && <GrowthPredictionCard applicationId={effectiveApplicationId} />}
        </>
      ) : (
        <div className="text-gray-500">이력서 정보를 불러올 수 없습니다.</div>
      )}
    </div>
  );
} 