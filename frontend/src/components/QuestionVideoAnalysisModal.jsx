import React, { useState, useEffect } from 'react';
import QuestionVideoAnalysisApi from '../api/questionVideoAnalysisApi';

const QuestionVideoAnalysisModal = ({ isOpen, onClose, applicationId }) => {
  const [analysisResults, setAnalysisResults] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && applicationId) {
      loadAnalysisResults();
    }
  }, [isOpen, applicationId]);

  const loadAnalysisResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 개별적으로 호출하여 하나라도 성공하면 결과 표시
      let resultsLoaded = false;
      let statsLoaded = false;
      
      try {
        const resultsResponse = await QuestionVideoAnalysisApi.getQuestionAnalysisResults(applicationId);
        if (resultsResponse.success) {
          setAnalysisResults(resultsResponse.results);
          resultsLoaded = true;
                 } else if (resultsResponse.auto_started) {
           // 자동으로 분석이 시작된 경우
           setError('분석이 자동으로 시작되었습니다. 잠시 후 다시 확인해주세요.');
           // 10초 후 다시 시도
           setTimeout(() => {
             loadAnalysisResults();
           }, 10000);
           return;
         } else if (resultsResponse.no_video) {
           // 비디오가 없는 경우
           setError('AI 면접 비디오가 없습니다. 비디오 업로드 후 분석을 시작해주세요.');
           return;
         }
      } catch (err) {
        console.error('분석 결과 조회 실패:', err);
      }
      
      try {
        const statsResponse = await QuestionVideoAnalysisApi.getQuestionAnalysisStatistics(applicationId);
        if (statsResponse.success) {
          setStatistics(statsResponse.statistics);
          statsLoaded = true;
        }
      } catch (err) {
        console.error('분석 통계 조회 실패:', err);
      }
      
      // 둘 다 실패한 경우에만 에러 표시
      if (!resultsLoaded && !statsLoaded) {
        setError('분석 결과를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
      
    } catch (err) {
      setError('분석 결과를 불러오는데 실패했습니다.');
      console.error('분석 결과 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await QuestionVideoAnalysisApi.startQuestionAnalysis(applicationId);
      if (response.success) {
        if (response.already_analyzed) {
          alert('이미 분석이 완료되었습니다. 결과를 불러오는 중...');
          // 바로 결과 로드
          loadAnalysisResults();
        } else {
          alert('질문별 분석이 시작되었습니다. 잠시 후 다시 확인해주세요.');
          // 5초 후 결과 다시 로드
          setTimeout(loadAnalysisResults, 5000);
        }
      }
    } catch (err) {
      // HTTP 400 에러 (비디오 URL 없음) 처리
      if (err.response?.status === 400) {
        setError('AI 면접 비디오가 없습니다. 비디오 업로드 후 분석을 시작해주세요.');
      } else {
        setError('분석 시작에 실패했습니다.');
      }
      console.error('분석 시작 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 85) return '매우 우수';
    if (score >= 75) return '우수';
    if (score >= 65) return '양호';
    return '개선 필요';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">질문별 비디오 분석 결과</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">분석 결과를 불러오는 중...</p>
            <p className="mt-2 text-sm text-gray-500">잠시만 기다려주세요 (최대 2분 소요)</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!loading && analysisResults.length === 0 && !error && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">아직 분석 결과가 없습니다.</p>
            <button
              onClick={startAnalysis}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              질문별 분석 시작
            </button>
          </div>
        )}

        {!loading && analysisResults.length > 0 && (
          <div className="space-y-6">
            {/* 통계 요약 */}
            {statistics.overall_score && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">전체 통계</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">평균 점수</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {statistics.overall_score.mean?.toFixed(1)}점
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">최고 점수</p>
                    <p className="text-2xl font-bold text-green-600">
                      {statistics.overall_score.max?.toFixed(1)}점
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">최저 점수</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statistics.overall_score.min?.toFixed(1)}점
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">분석 질문 수</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {statistics.total_questions_analyzed}개
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 질문별 분석 결과 */}
            <div>
              <h3 className="text-lg font-semibold mb-4">질문별 상세 분석</h3>
              <div className="space-y-4">
                {analysisResults.map((result, index) => (
                  <div key={result.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-gray-800">
                        {index + 1}. {result.question_text}
                      </h4>
                      <div className="text-right">
                        <span className={`text-2xl font-bold ${getScoreColor(result.question_score)}`}>
                          {result.question_score?.toFixed(1)}점
                        </span>
                        <p className="text-sm text-gray-500">{getScoreLabel(result.question_score)}</p>
                      </div>
                    </div>

                    {/* 상세 분석 지표 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">시선 접촉</p>
                        <p className="font-semibold">{(result.facial_expressions?.eye_contact_ratio * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">자신감</p>
                        <p className="font-semibold">{(result.facial_expressions?.confidence_score * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">집중도</p>
                        <p className="font-semibold">{(result.gaze_analysis?.focus_ratio * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">음성 명확도</p>
                        <p className="font-semibold">{(result.audio_analysis?.clarity_score * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* 피드백 */}
                    {result.question_feedback && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600 mb-1">피드백:</p>
                        <p className="text-sm text-gray-800">{result.question_feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionVideoAnalysisModal; 