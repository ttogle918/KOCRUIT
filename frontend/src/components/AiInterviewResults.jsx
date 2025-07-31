import React, { useState, useEffect } from 'react';
import AiInterviewApi from '../api/aiInterviewApi';

const AiInterviewResults = ({ applicationId, jobPostId }) => {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (applicationId) {
      loadEvaluation();
    }
  }, [applicationId]);

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const result = await AiInterviewApi.getAiInterviewEvaluation(applicationId);
      setEvaluation(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case '상': return 'text-green-600 bg-green-100';
      case '중': return 'text-yellow-600 bg-yellow-100';
      case '하': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getGradeIcon = (grade) => {
    switch (grade) {
      case '상': return '✅';
      case '중': return '⚠️';
      case '하': return '❌';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">AI 면접 결과를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">오류 발생</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluation || evaluation.status === 'no_evaluation') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">AI 면접 결과 없음</h3>
            <div className="mt-2 text-sm text-yellow-700">
              {evaluation?.message || 'AI 면접 평가 결과가 아직 없습니다.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 평가 데이터가 있는 경우
  const evaluations = evaluation.evaluations || [];
  const evaluation_items = evaluations.length > 0 ? evaluations[0].evaluation_items || [] : [];

  // 등급별 개수 계산
  const gradeCounts = evaluation_items.reduce((acc, item) => {
    acc[item.grade] = (acc[item.grade] || 0) + 1;
    return acc;
  }, {});

  // 합격 여부 판정
  const totalItems = evaluation_items.length;
  const lowThreshold = Math.max(2, Math.floor(totalItems * 0.15));
  const passed = (gradeCounts['하'] || 0) < lowThreshold;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          AI 면접 평가 결과
        </h2>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p><strong>지원자 ID:</strong> {evaluation.application_id}</p>
            <p><strong>평가일:</strong> {evaluation.evaluation_date ? new Date(evaluation.evaluation_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {passed ? '✅ 합격' : '❌ 불합격'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              총점: {evaluation.total_score || 0}점
            </div>
          </div>
        </div>
      </div>

      {/* 등급별 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{gradeCounts['상'] || 0}</div>
          <div className="text-sm text-green-700">상 등급</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{gradeCounts['중'] || 0}</div>
          <div className="text-sm text-yellow-700">중 등급</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{gradeCounts['하'] || 0}</div>
          <div className="text-sm text-red-700">하 등급</div>
        </div>
      </div>

      {/* 판정 기준 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">판정 기준</h3>
        <p className="text-sm text-blue-700">
          하 등급이 {lowThreshold}개 미만이면 합격 (전체 {totalItems}개 중 15% 미만)
        </p>
      </div>

      {/* 평가 항목 상세 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">평가 항목 상세</h3>
        <div className="space-y-3">
          {evaluation_items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{item.evaluate_type}</h4>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getGradeColor(item.grade)}`}>
                    {getGradeIcon(item.grade)} {item.grade}
                  </span>
                  <span className="text-sm text-gray-600">
                    {item.evaluate_score}점
                  </span>
                </div>
              </div>
              {item.comment && (
                <p className="text-sm text-gray-600">{item.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 요약 */}
      {evalData.summary && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">평가 요약</h3>
          <p className="text-sm text-gray-700">{evalData.summary}</p>
        </div>
      )}
    </div>
  );
};

export default AiInterviewResults; 