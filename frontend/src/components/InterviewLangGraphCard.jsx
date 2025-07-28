import React, { useState, useEffect } from 'react';
import api from '../api/api';

const InterviewLangGraphCard = () => {
  const [backgroundStatus, setBackgroundStatus] = useState({});
  const [taskResults, setTaskResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState(1);

  // 백그라운드 작업 상태 확인
  const checkBackgroundStatus = async (applicationId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/interview-questions/background/status/${applicationId}`);
      setBackgroundStatus(response.data);
    } catch (err) {
      setError(err.message || '백그라운드 상태 확인 실패');
    } finally {
      setLoading(false);
    }
  };

  // 백그라운드 작업 트리거
  const triggerBackgroundTask = async (taskType, applicationId) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint;
      let requestData;
      
      switch (taskType) {
        case 'interview_questions':
          endpoint = '/interview-questions/background/generate-interview-questions';
          requestData = {
            resume_id: 1,
            application_id: applicationId,
            company_name: "테스트 회사",
            applicant_name: "테스트 지원자"
          };
          break;
        case 'resume_analysis':
          endpoint = '/interview-questions/background/generate-resume-analysis';
          requestData = {
            resume_id: 1,
            application_id: applicationId,
            company_name: "테스트 회사",
            applicant_name: "테스트 지원자"
          };
          break;
        case 'evaluation_tools':
          endpoint = '/interview-questions/background/generate-evaluation-tools';
          requestData = {
            resume_id: 1,
            application_id: applicationId,
            company_name: "테스트 회사",
            applicant_name: "테스트 지원자",
            interview_stage: "first",
            evaluator_type: "practical"
          };
          break;
        default:
          throw new Error('알 수 없는 작업 타입');
      }
      
      const response = await api.post(endpoint, requestData);
      setTaskResults(prev => ({
        ...prev,
        [taskType]: response.data
      }));
      
      // 3초 후 상태 다시 확인
      setTimeout(() => {
        checkBackgroundStatus(applicationId);
      }, 3000);
      
    } catch (err) {
      setError(err.message || '백그라운드 작업 트리거 실패');
    } finally {
      setLoading(false);
    }
  };

  // 모든 백그라운드 작업 트리거
  const triggerAllBackgroundTasks = async () => {
    await triggerBackgroundTask('interview_questions', selectedApplicationId);
    await triggerBackgroundTask('resume_analysis', selectedApplicationId);
    await triggerBackgroundTask('evaluation_tools', selectedApplicationId);
  };

  useEffect(() => {
    checkBackgroundStatus(selectedApplicationId);
  }, [selectedApplicationId]);

  const renderStatusBadge = (status) => {
    if (status) {
      return <span className="text-green-600 text-xs">✅ 완료</span>;
    } else {
      return <span className="text-yellow-600 text-xs">⏳ 대기</span>;
    }
  };

  return (
    <div className="border rounded-lg p-4 shadow-md bg-white max-w-md mx-auto my-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🔄 백그라운드 작업</h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isCollapsed ? '📖' : '📕'}
        </button>
      </div>
      
      {!isCollapsed && (
        <>
          {/* 지원자 ID 선택 */}
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">지원자 ID:</label>
            <select
              value={selectedApplicationId}
              onChange={(e) => setSelectedApplicationId(Number(e.target.value))}
              className="w-full p-1 text-xs border rounded"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>

          {/* 백그라운드 작업 상태 */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-sm">작업 상태</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-xs">면접 질문 생성</span>
                {renderStatusBadge(backgroundStatus.status?.interview_questions_generated)}
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-xs">이력서 분석</span>
                {renderStatusBadge(backgroundStatus.status?.analysis_tools_generated)}
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-xs">평가 도구</span>
                {renderStatusBadge(backgroundStatus.status?.analysis_tools_generated)}
              </div>
            </div>
          </div>

          {/* 백그라운드 작업 트리거 */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-sm">작업 트리거</h4>
            <div className="space-y-2">
              <button
                className="w-full bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                onClick={() => triggerAllBackgroundTasks()}
                disabled={loading}
              >
                모든 작업 실행
              </button>
              <div className="grid grid-cols-3 gap-1">
                <button
                  className="bg-yellow-600 text-white px-1 py-1 rounded text-xs hover:bg-yellow-700"
                  onClick={() => triggerBackgroundTask('interview_questions', selectedApplicationId)}
                  disabled={loading}
                >
                  질문 생성
                </button>
                <button
                  className="bg-green-600 text-white px-1 py-1 rounded text-xs hover:bg-green-700"
                  onClick={() => triggerBackgroundTask('resume_analysis', selectedApplicationId)}
                  disabled={loading}
                >
                  분석 생성
                </button>
                <button
                  className="bg-purple-600 text-white px-1 py-1 rounded text-xs hover:bg-purple-700"
                  onClick={() => triggerBackgroundTask('evaluation_tools', selectedApplicationId)}
                  disabled={loading}
                >
                  도구 생성
                </button>
              </div>
            </div>
          </div>

          {/* 작업 결과 */}
          {Object.keys(taskResults).length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 text-sm">최근 작업 결과</h4>
              <div className="space-y-1">
                {Object.entries(taskResults).map(([taskType, result]) => (
                  <div key={taskType} className="p-2 bg-blue-50 rounded border">
                    <div className="text-xs font-semibold text-blue-800 mb-1">
                      {taskType === 'interview_questions' && '면접 질문 생성'}
                      {taskType === 'resume_analysis' && '이력서 분석'}
                      {taskType === 'evaluation_tools' && '평가 도구'}
                    </div>
                    <div className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {result.success ? '✅ 성공' : '❌ 실패'}
                    </div>
                    {result.message && (
                      <div className="text-xs text-gray-600 mt-1">{result.message}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 오류 표시 */}
          {error && (
            <div className="text-red-500 text-xs mb-2">{error}</div>
          )}

          {/* 로딩 표시 */}
          {loading && (
            <div className="text-blue-500 text-xs">작업 중...</div>
          )}
        </>
      )}
    </div>
  );
};

export default InterviewLangGraphCard; 