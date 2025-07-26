import React from 'react';
import ResumeCard from '../../components/ResumeCard';
import ResumeAnalysisAccordion from './ResumeAnalysisAccordion';
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

export default function ResumePage({ resume, loading, error, jobpostId, applicationId, isInterviewMode = false, onApplicantSelect }) {
  // applicationId를 props로 받거나 resume에서 가져오기
  const effectiveApplicationId = applicationId || resume?.applicationId || resume?.application_id;

  // 지원자 선택 핸들러
  const handleApplicantSelect = (selectedApplicationId, applicantInfo) => {
    if (onApplicantSelect) {
      // 상위 컴포넌트에 지원자 선택 이벤트 전달
      onApplicantSelect(selectedApplicationId, applicantInfo);
    } else {
      // 기본 동작: 현재 창에서 해당 지원자 이력서로 이동
      const currentUrl = window.location.pathname;
      const baseUrl = currentUrl.split('/').slice(0, -1).join('/'); // application_id 부분 제거
      window.location.href = `${baseUrl}/${selectedApplicationId}`;
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto p-4">
      {loading ? (
        <div className="text-blue-500 font-bold text-xl">로딩 중...</div>
      ) : error ? (
        <div className="text-red-500">이력서 로드 실패: {error}</div>
      ) : resume ? (
        <>
          <ResumeAnalysisAccordion 
            resumeId={resume.id} 
            applicationId={effectiveApplicationId} 
            isInterviewMode={isInterviewMode}
            onApplicantSelect={handleApplicantSelect}
          />
          <ResumeCard resume={resume} loading={false} jobpostId={jobpostId} applicationId={effectiveApplicationId} />
        </>
      ) : (
        <div className="text-gray-500">이력서 정보를 불러올 수 없습니다.</div>
      )}
    </div>
  );
} 