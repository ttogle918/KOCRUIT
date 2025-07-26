import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaStar, FaRegStar, FaEnvelope } from 'react-icons/fa';
import api from '../api/api';
import { calculateAge } from '../utils/resumeUtils';
import GrowthPredictionCard from './GrowthPredictionCard';

const PassReasonCard = ({ applicant, onBack, onStatusChange, feedbacks }) => {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(applicant?.isBookmarked === 'Y');
  const [aiScore, setAiScore] = useState(applicant?.ai_score || 0);
  const [aiPassReason, setAiPassReason] = useState(applicant?.pass_reason || '');
  const [aiFailReason, setAiFailReason] = useState(applicant?.fail_reason || '');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [questionRequested, setQuestionRequested] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [showFullReason, setShowFullReason] = useState(false);
  const applicationId = applicant?.application_id || applicant?.applicationId;
  const passReason = applicant?.pass_reason || '';

  useEffect(() => {
    const fetchResume = async () => {
      if (!applicant?.resumeId) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/resumes/${applicant.resumeId}`);
        setResume(response.data);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchResume();
  }, [applicant]);

  useEffect(() => {
    if (applicant?.ai_score !== undefined) {
      setAiScore(applicant.ai_score);
      setAiPassReason(applicant.pass_reason || '');
      setAiFailReason(applicant.fail_reason || '');
    }
  }, [applicant?.ai_score, applicant?.pass_reason, applicant?.fail_reason]);

  useEffect(() => {
    if (!passReason) return;
    setSummaryLoading(true);
    setSummaryError(null);
    setSummary('');
    api.post('/ai-evaluate/summary', { pass_reason: passReason })
      .then(res => {
        if (res.data && res.data.summary) {
          setSummary(res.data.summary);
        } else {
          setSummaryError('요약 데이터가 없습니다.');
        }
      })
      .catch((error) => {
        console.error('합격 요약 API 오류:', error);
        setSummaryError(error.response?.data?.detail || '요약 생성 중 오류가 발생했습니다.');
      })
      .finally(() => setSummaryLoading(false));
  }, [passReason]);

  // AI 질문 생성 로직 복원
  const handleRequestQuestions = async () => {
    if (!applicant?.application_id && !applicant?.applicationId) return;
    setQuestionLoading(true);
    setQuestionError(null);
    setAiQuestions([]);
    setQuestionRequested(true);
    
    console.log('AI 질문 생성 시작:', {
      application_id: applicant.application_id || applicant.applicationId,
      company_name: applicant.companyName || applicant.company_name || '회사'
    });
    
    try {
      const response = await api.post('/interview-questions/job-questions', {
        application_id: applicant.application_id || applicant.applicationId,
        company_name: applicant.companyName || applicant.company_name || '회사'
      });
      
      console.log('AI 질문 생성 응답:', response.data);
      
      let q = response.data?.question_bundle || response.data?.question_categories || response.data?.questions || {};
      if (Array.isArray(q)) q = { "AI 질문": q };
      setAiQuestions(q);
    } catch (err) {
      console.error('AI 질문 생성 오류:', err);
      setQuestionError('AI 질문 생성 중 오류가 발생했습니다.');
    } finally {
      setQuestionLoading(false);
    }
  };

  useEffect(() => {
    setAiQuestions([]);
    setQuestionError(null);
    setQuestionLoading(false);
    setQuestionRequested(false);
  }, [applicant?.application_id, applicant?.applicationId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 h-full flex items-center justify-center min-h-[600px]">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 h-full flex flex-col gap-6 overflow-hidden max-w-full min-h-[700px] justify-between">
      {/* 상단 프로필/이름/나이/이메일/지원경로 */}
      <div className="flex items-center gap-6 border-b pb-6 min-w-0">
        <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-3xl text-white shrink-0">
          <i className="fa-solid fa-user" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-xl text-gray-800 dark:text-white truncate">{applicant?.name}</span>
            <span className="text-base text-gray-500 dark:text-gray-300">({calculateAge(applicant?.birthDate)}세)</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">{applicant?.applicationSource || 'DIRECT'} 지원</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-300 text-sm min-w-0">
            <FaEnvelope className="inline-block mr-1" />
            <span className="truncate">{applicant?.email || 'N/A'}</span>
          </div>
        </div>
        <button onClick={onBack} className="ml-auto flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors text-lg">
          <FaArrowLeft />
          <span className="text-base font-medium">목록</span>
        </button>
      </div>

      {/* 점수/합격/AI예측 강조 카드 */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-8 shadow-inner w-full overflow-visible flex-grow-0">
        <div className="flex flex-col items-center flex-1 min-w-0">
          <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-300 mb-1 break-words">{aiScore}점</div>
          <div className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">합격</div>
          <div className="flex gap-2">
            
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center md:items-end min-w-0">
          {applicationId && <GrowthPredictionCard applicationId={applicationId} />}
        </div>
      </div>

      {/* 합격 포인트 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-blue-100 dark:border-blue-900/40 shadow-sm max-h-[300px] overflow-y-auto">
        <div className="text-lg font-bold text-gray-800 dark:text-white mb-2">합격 포인트</div>
        {summaryLoading ? (
          <div className="text-blue-500">요약 중...</div>
        ) : summaryError ? (
          <div className="text-red-500">{summaryError}</div>
        ) : summary ? (
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-200 text-base space-y-1 break-words">
            {summary.split(/\n|•|\-/).filter(Boolean).map((point, idx) => (
              <li key={idx}>{point.trim()}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2">
          <button onClick={() => setShowFullReason(true)} className="text-blue-600 hover:underline text-sm font-medium">자세히 보기</button>
        </div>
        {/* 전체 pass_reason 모달 */}
        {showFullReason && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-xl relative">
              <button onClick={() => setShowFullReason(false)} className="absolute top-2 right-4 text-gray-400 hover:text-blue-500 text-lg">✕</button>
              <div className="text-lg font-bold mb-2">전체 합격 사유</div>
              <div className="whitespace-pre-line text-gray-800 text-base max-h-96 overflow-y-auto">{passReason}</div>
            </div>
          </div>
        )}
      </div>

      {/* 이 지원자에게 물어볼 만한 질문 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-900/40 shadow-sm max-w-full">
        <div className="text-base font-bold text-blue-700 dark:text-blue-300 mb-2">이 지원자에게 물어볼 만한 질문 (예시)</div>
        {/* 예시 질문 placeholder */}
        {!questionRequested && (
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-200 text-base space-y-1 mb-4 break-words">
            <li>지원 동기와 향후 목표에 대해 말씀해 주세요.</li>
            <li>프로젝트 경험 중 가장 도전적이었던 사례는 무엇인가요?</li>
            <li>관련 자격증 취득 과정에서 배운 점은?</li>
          </ul>
        )}
        {/* AI 질문 생성 버튼/로딩/에러/질문 목록 */}
        {!questionRequested ? (
          <button
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={handleRequestQuestions}
            disabled={questionLoading}
            style={{ minWidth: 220 }}
          >
            {questionLoading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {questionLoading ? 'AI 질문 생성 중...' : 'AI 질문 생성'}
          </button>
        ) : questionError ? (
          <div className="text-red-500 mt-2">{questionError}</div>
        ) : aiQuestions && Object.keys(aiQuestions).length > 0 ? (
          <div className="space-y-2 mt-2">
            {Object.entries(aiQuestions).map(([category, questions]) => (
              <div key={category}>
                <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">{category}</div>
                <ul className="list-disc pl-6">
                  {Array.isArray(questions) && questions.map((q, idx) => (
                    <li key={idx} className="text-gray-700 dark:text-gray-300 break-words">{q}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 mt-2">AI 질문이 없습니다.</div>
        )}
      </div>
    </div>
  );
};

export default PassReasonCard; 