import React, { useState, useEffect } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../../api/api';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';

export default function ResumePlagiarismAccordion({ resumeId }) {
  const [plagiarism, setPlagiarism] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 표절률 분석 요청
  const fetchPlagiarism = async () => {
    if (!resumeId) return;
    setLoading(true);
    setError(null);
    setPlagiarism(null);
    try {
      const res = await api.post(`/resume-plagiarism/check-resume/${resumeId}`);
      setPlagiarism(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // 강제 재검사 요청
  const forceRecheck = async () => {
    if (!resumeId) return;
    setLoading(true);
    setError(null);
    setPlagiarism(null);
    try {
      const res = await api.post(`/resume-plagiarism/check-resume/${resumeId}?force=true`);
      setPlagiarism(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // 열릴 때마다 분석 (refreshKey로 재분석)
  useEffect(() => {
    if (open) fetchPlagiarism();
    // eslint-disable-next-line
  }, [open, resumeId, refreshKey]);

  // 가장 유사한 이력서/공고명/유사도 추출
  const mostSimilar = plagiarism?.most_similar_resume;
  const similarity = mostSimilar ? Math.round((mostSimilar.similarity || 0) * 100) : null;

  return (
    <Accordion expanded={open} onChange={() => setOpen(v => !v)} className="mt-4">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography className="font-bold text-red-700 dark:text-red-300">표절률 분석</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {loading ? (
          <div className="flex items-center gap-2 text-blue-500"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>분석 중...</div>
        ) : error ? (
          <div className="text-red-500">분석 실패: {error}</div>
        ) : plagiarism ? (
          <div className="space-y-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-200">가장 유사한 이력서:</span>{' '}
              {mostSimilar ? (
                <>
                  <span className="text-blue-700 dark:text-blue-300">{mostSimilar.resume_owner_name || mostSimilar.resume_id}</span>
                  <span className="ml-2 text-gray-500">({similarity}% 유사)</span>
                  {mostSimilar.jobpost_title && (
                    <span className="ml-2 text-gray-600">[{mostSimilar.jobpost_title}]</span>
                  )}
                </>
              ) : (
                <span className="text-gray-400">유사 이력서 없음</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-200">표절 의심:</span>{' '}
              <span className={plagiarism.plagiarism_suspected ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                {plagiarism.plagiarism_suspected ? '의심됨' : '안전'}
              </span>
            </div>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={forceRecheck}
              disabled={loading}
            >
              {loading ? '재검사 중...' : '재검사'}
            </button>
          </div>
        ) : (
          <div className="text-gray-500">분석 결과가 없습니다.</div>
        )}
      </AccordionDetails>
    </Accordion>
  );
} 