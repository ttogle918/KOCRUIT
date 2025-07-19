import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaStar, FaRegStar, FaEnvelope, FaPhone, FaCalendarAlt } from 'react-icons/fa';
import api from '../api/api';
import { calculateAge } from '../utils/resumeUtils';
import GrowthPredictionCard from './GrowthPredictionCard';

const PassReasonCard = ({ applicant, onBack, onStatusChange }) => {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(applicant?.isBookmarked === 'Y');
  const [rejecting, setRejecting] = useState(false);
  const [aiScore, setAiScore] = useState(applicant?.ai_score || 0);
  const [aiPassReason, setAiPassReason] = useState(applicant?.pass_reason || '');
  const [aiFailReason, setAiFailReason] = useState(applicant?.fail_reason || '');

  // AI 질문 상태
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [questionRequested, setQuestionRequested] = useState(false);

  // GrowthPredictionCard 노출 상태
  const [showGrowthPrediction, setShowGrowthPrediction] = useState(false);
  // applicationId 추출
  const applicationId = applicant?.application_id || applicant?.applicationId;

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
        console.error('Error fetching resume:', error);
        setLoading(false);
      }
    };
    fetchResume();
  }, [applicant]);

  // AI 평가 결과가 이미 완료된 상태이므로 바로 표시
  useEffect(() => {
    if (applicant?.ai_score !== undefined) {
      setAiScore(applicant.ai_score);
      setAiPassReason(applicant.pass_reason || '');
      setAiFailReason(applicant.fail_reason || '');
    }
  }, [applicant?.ai_score, applicant?.pass_reason, applicant?.fail_reason]);

  // AI 기반 이력서 질문 생성 (버튼 클릭 시에만)
  const handleRequestQuestions = async () => {
    if (!applicant?.application_id && !applicant?.applicationId) return;
    setQuestionLoading(true);
    setQuestionError(null);
    setAiQuestions([]);
    setQuestionRequested(true);
    try {
      const response = await api.post('/interview-questions/job-questions', {
        application_id: applicant.application_id || applicant.applicationId,
        company_name: applicant.companyName || applicant.company_name || '회사'
      });
      let q = response.data?.question_bundle || response.data?.question_categories || response.data?.questions || {};
      if (Array.isArray(q)) q = { "AI 질문": q };
      setAiQuestions(q);
    } catch (err) {
      setQuestionError('AI 질문 생성 중 오류가 발생했습니다.');
    } finally {
      setQuestionLoading(false);
    }
  };

  // applicant가 바뀌면 질문 상태 초기화
  useEffect(() => {
    setAiQuestions([]);
    setQuestionError(null);
    setQuestionLoading(false);
    setQuestionRequested(false);
  }, [applicant?.application_id, applicant?.applicationId]);

  const handleBookmarkToggle = async () => {
    try {
      const newBookmarkStatus = !isBookmarked;
      await api.put(`/applications/${applicant.id}/bookmark`, {
        isBookmarked: newBookmarkStatus ? 'Y' : 'N'
      });
      setIsBookmarked(newBookmarkStatus);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('정말로 이 지원자를 서류 불합격 처리하시겠습니까?')) return;
    setRejecting(true);
    try {
      await api.put(`/applications/${applicant.id}/status`, { document_status: 'REJECTED' });
      alert('서류 불합격 처리되었습니다.');
      if (onStatusChange) onStatusChange('REJECTED');
      onBack();
    } catch (error) {
      alert('불합격 처리에 실패했습니다.');
      setRejecting(false);
    }
  };

  const handlePass = async () => {
    if (!window.confirm('정말로 이 지원자를 서류 합격 처리하시겠습니까?')) return;
    setRejecting(true);
    try {
      await api.put(`/applications/${applicant.id}/status`, { document_status: 'PASSED' });
      alert('서류 합격 처리되었습니다.');
      if (onStatusChange) onStatusChange('PASSED');
      onBack();
    } catch (error) {
      alert('합격 처리에 실패했습니다.');
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <FaArrowLeft />
          <span>목록으로</span>
        </button>
        <button
          onClick={handleBookmarkToggle}
          className="text-2xl"
        >
          {isBookmarked ? (
            <FaStar className="text-yellow-400" />
          ) : (
            <FaRegStar className="text-gray-400" />
          )}
        </button>
      </div>

      {/* Applicant Basic Info */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
            <i className="fa-solid fa-user text-white text-2xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {applicant?.name} ({calculateAge(applicant?.birthDate)}세)
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {applicant?.applicationSource || 'DIRECT'} 지원
            </p>
          </div>
        </div>
        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <FaEnvelope />
            <span>{applicant?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <FaPhone />
            <span>{applicant?.phone || 'N/A'}</span>
          </div>
        </div>
        {/* Application Date */}
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <FaCalendarAlt />
          <span>지원일: {new Date(applicant?.appliedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Resume Details */}
      {resume && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">이력서 정보</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">학력</span>
              <p className="text-gray-800 dark:text-white">{resume.education || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">경력</span>
              <p className="text-gray-800 dark:text-white">{resume.experience || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">자격증</span>
              <p className="text-gray-800 dark:text-white">{resume.certifications || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">기술스택</span>
              <p className="text-gray-800 dark:text-white">{resume.skills || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Score */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">AI 평가 점수</h3>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {aiScore}점
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {aiScore >= 70 ? '합격 기준 충족' : '합격 기준 미충족'}
            </div>
          </div>
        </div>
        {/* 성장 가능성 예측 버튼 및 결과 */}
        {applicationId && (
          <div className="mt-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => setShowGrowthPrediction((prev) => !prev)}
            >
              {showGrowthPrediction ? '예측 결과 숨기기' : '성장 가능성 예측'}
            </button>
            {showGrowthPrediction && (
              <div className="mt-4">
                <GrowthPredictionCard applicationId={applicationId} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pass/Reject Reason */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
          {applicant?.status === 'PASSED' ? '합격 사유' : '불합격 사유'}
        </h3>
        <div className={`rounded-lg p-4 ${applicant?.status === 'PASSED' ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
          <p className="text-gray-700 dark:text-gray-300">
            {applicant?.status === 'PASSED'
              ? (aiPassReason || '서류 심사에서 우수한 성과를 보여 합격 처리되었습니다.')
              : (aiFailReason || '서류 심사 결과 불합격 처리되었습니다.')}
          </p>
        </div>
      </div>

      {/* 이력서 기반 개인별 질문 - 합격/불합격 모두 버튼 노출 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">이력서 기반 개인별 질문</h3>
        {!questionRequested ? (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-2"
            onClick={handleRequestQuestions}
            disabled={questionLoading}
          >
            {questionLoading ? 'AI 질문 생성 중...' : 'AI 질문 생성'}
          </button>
        ) : questionLoading ? (
          <div className="text-blue-500">AI 질문 생성 중...</div>
        ) : questionError ? (
          <div className="text-red-500">{questionError}</div>
        ) : aiQuestions && Object.keys(aiQuestions).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(aiQuestions).map(([category, questions]) => (
              <div key={category}>
                <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">{category}</div>
                <ul className="list-disc pl-6">
                  {Array.isArray(questions) && questions.map((q, idx) => (
                    <li key={idx} className="text-gray-700 dark:text-gray-300">{q}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">AI 질문이 없습니다.</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {applicant?.status === 'PASSED' ? (
          <button
            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            onClick={handleReject}
            disabled={rejecting}
          >
            {rejecting ? '처리 중...' : '서류 불합격 처리'}
          </button>
        ) : (
          <button
            className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            onClick={handlePass}
            disabled={rejecting}
          >
            {rejecting ? '처리 중...' : '서류 합격 처리'}
          </button>
        )}
      </div>
    </div>
  );
};

export default PassReasonCard; 