import React from 'react';
import { FaCheck, FaStar } from 'react-icons/fa';
import InterviewEvaluationItems from '../../InterviewEvaluationItems';

const EvaluationForm = ({
  isLoadingResult,
  isEvaluationCompleted,
  evaluationResult,
  resumeId,
  applicationId,
  interviewType,
  interviewStage,
  onScoreChange,
  overallMemo,
  onOverallMemoChange,
  onSaveEvaluation,
  onEditEvaluation
}) => {
  if (isLoadingResult) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">평가 결과를 확인하는 중...</p>
      </div>
    );
  }

  // 평가 완료 후 결과 표시
  if (isEvaluationCompleted && evaluationResult) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <FaCheck className="text-green-600 mr-2" />
            <h3 className="font-semibold text-green-800">평가 완료</h3>
          </div>
          <p className="text-green-700 text-sm mt-1">
            이 지원자의 {interviewType === 'practical' ? '실무진' : '임원진'} 면접 평가가 완료되었습니다.
          </p>
        </div>

        {/* 평가 결과 요약 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">평가 결과 요약</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">총점</p>
              <p className="text-2xl font-bold text-blue-600">
                {evaluationResult.total_score || 0}점
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">평가일</p>
              <p className="text-sm font-medium">
                {evaluationResult.created_at ? 
                  new Date(evaluationResult.created_at).toLocaleDateString() : 
                  '날짜 정보 없음'
                }
              </p>
            </div>
          </div>
        </div>

        {/* 상세 평가 항목 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">상세 평가 항목</h3>
          <div className="space-y-3">
            {evaluationResult.evaluation_items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">{item.evaluate_type}</p>
                  {item.comment && (
                    <p className="text-sm text-gray-600 mt-1">{item.comment}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{item.evaluate_score}점</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 전체 메모 */}
        {evaluationResult.summary && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">전체 메모</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{evaluationResult.summary}</p>
          </div>
        )}

        {/* 평가 수정 버튼 */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onEditEvaluation}
            className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition-colors"
          >
            평가 수정하기
          </button>
        </div>
      </div>
    );
  }

  // 평가 입력 폼 (평가 미완료 시)
  return (
    <>
      {/* AI 생성 평가 항목 */}
      {resumeId && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">{interviewType === 'practical' ? '실무진' : '임원진'} 평가 항목</h3>
          <InterviewEvaluationItems
            resumeId={resumeId}
            applicationId={applicationId}
            interviewStage={interviewStage}
            onScoreChange={onScoreChange}
          />
        </div>
      )}

      {/* 전체 메모 */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">전체 메모</h3>
        <textarea
          placeholder="면접 전체에 대한 메모를 입력하세요..."
          value={overallMemo}
          onChange={(e) => onOverallMemoChange(e.target.value)}
          rows={6}
          className="w-full p-3 border border-gray-300 rounded-md text-sm resize-none"
        />
      </div>

      {/* 평가 저장 버튼 */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onSaveEvaluation}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          {interviewType === 'practical' ? '실무진' : '임원진'} 평가 저장
        </button>
      </div>
    </>
  );
};

export default EvaluationForm;

