import React, { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../../api/api';

export default function ResumeAnalysisAccordion({ resumeId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  // 버튼 클릭 시에만 분석 요청
  const handleRequestAnalysis = () => {
    if (!resumeId || typeof resumeId !== 'number') return;
    setAnalysis(null);
    setError(null);
    setLoading(true);
    setRequested(true);
    api.post('/interview-questions/resume-analysis', { resume_id: resumeId })
      .then(res => setAnalysis(res.data))
      .catch(err => setError(err?.response?.data?.detail || err.message))
      .finally(() => setLoading(false));
  };

  // resumeId가 바뀌면 상태 초기화
  React.useEffect(() => {
    setAnalysis(null);
    setError(null);
    setLoading(false);
    setRequested(false);
  }, [resumeId]);

  return (
    <Accordion expanded={open} onChange={() => setOpen(v => !v)} className="mt-4">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography className="font-bold text-blue-700 dark:text-blue-300">이력서 분석</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {!requested ? (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-2"
            onClick={handleRequestAnalysis}
            disabled={loading}
          >
            {loading ? '분석 중...' : '이력서 분석/질문 생성'}
          </button>
        ) : loading ? (
          <div className="flex items-center gap-2 text-blue-500"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>분석 중...</div>
        ) : error ? (
          <div className="text-red-500">분석 실패: {error}</div>
        ) : analysis ? (
          <div className="space-y-4 text-sm">
            {analysis.resume_summary && (
              <div>
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">이력서 요약</h4>
                <p className="text-gray-700 dark:text-gray-200">{analysis.resume_summary}</p>
              </div>
            )}
            {analysis.key_projects && (
              <div>
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">주요 프로젝트</h4>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                  {analysis.key_projects.map((project, i) => <li key={i}>{project}</li>)}
                </ul>
              </div>
            )}
            {analysis.technical_skills && (
              <div>
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">기술 스택</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.technical_skills.map((skill, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.interview_focus_areas && (
              <div>
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">면접 집중 영역</h4>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                  {analysis.interview_focus_areas.map((area, i) => <li key={i}>{area}</li>)}
                </ul>
              </div>
            )}
            {analysis.job_matching_score && (
              <div>
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">직무 매칭 점수</h4>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-blue-600 rounded-full" 
                      style={{ width: `${analysis.job_matching_score * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm">{(analysis.job_matching_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">이력서 분석 정보를 불러올 수 없습니다.</div>
        )}
      </AccordionDetails>
    </Accordion>
  );
} 