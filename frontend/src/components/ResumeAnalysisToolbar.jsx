import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { getAnalysisResult } from '../api/api';

export default function ResumeAnalysisToolbar({ resumeId, applicationId, onAnalysisResult, onToolChange }) {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({}); // 분석 결과 저장
  const [selectedTool, setSelectedTool] = useState(null); // 현재 선택된 도구
  const [error, setError] = useState(null);

  const tools = [
    {
      id: 'comprehensive',
      name: '핵심 분석',
      description: '전체적인 이력서 분석',
      endpoint: '/v1/resumes/comprehensive-analysis',
      icon: '📊',
      activeColor: 'bg-sky-500 hover:bg-sky-600'
    },
    {
      id: 'detailed',
      name: '상세 분석',
      description: '심도있는 역량 분석',
      endpoint: '/v1/resumes/detailed-analysis',
      icon: '🔍',
      activeColor: 'bg-sky-500 hover:bg-sky-600'
    },
    {
      id: 'applicant_comparison',
      name: '지원자 비교',
      description: '해당 공고 지원자 비교',
      endpoint: '/v1/resumes/applicant-comparison',
      icon: '👥',
      activeColor: 'bg-sky-500 hover:bg-sky-600'
    },
    {
      id: 'impact_points',
      name: '임팩트 포인트',
      description: '후보 요약 및 핵심 포인트',
      endpoint: '/v1/resumes/impact-points',
      icon: '⭐',
      activeColor: 'bg-sky-500 hover:bg-sky-600'
    }
  ];

  // applicationId가 변경될 때 저장된 결과 확인 (선택 상태는 변경하지 않음)
  useEffect(() => {
    if (applicationId) {
      checkSavedResults();
    }
  }, [applicationId]);

  const checkSavedResults = async () => {
    const savedResults = {};
    
    for (const tool of tools) {
      try {
        const result = await getAnalysisResult(applicationId, tool.id);
        savedResults[tool.id] = result.analysis_data;
        console.log(`저장된 ${tool.name} 결과 발견:`, result);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error(`${tool.name} 저장된 결과 조회 실패:`, error);
        }
      }
    }
    
    if (Object.keys(savedResults).length > 0) {
      setResults(savedResults);
      console.log('저장된 결과들을 찾았습니다:', Object.keys(savedResults));
      
      // 저장된 결과는 있지만 선택 상태는 변경하지 않음
      // 사용자가 실제로 클릭했을 때만 선택 상태가 변경됨
    }
  };

  const handleAnalysis = async (tool) => {
    console.log(`handleAnalysis 호출됨 - tool: ${tool.id}, resumeId: ${resumeId}, applicationId: ${applicationId}`);
    
    if (!resumeId || typeof resumeId !== 'number') {
      setError('유효한 이력서 ID가 필요합니다.');
      return;
    }

    // 사용자가 클릭한 도구만 선택 상태로 변경
    setSelectedTool(tool.id);
    setError(null);

    // 부모 컴포넌트에 도구 변경 알림
    if (onToolChange) {
      onToolChange(tool.id);
    }

    // 저장된 결과가 있으면 바로 사용
    if (results[tool.id]) {
      console.log(`저장된 ${tool.name} 결과 사용:`, results[tool.id]);
      if (onAnalysisResult) {
        console.log(`onAnalysisResult 콜백 호출: ${tool.id}`);
        onAnalysisResult(tool.id, results[tool.id]);
      } else {
        console.log('onAnalysisResult 콜백이 없습니다');
      }
      return;
    }

    // 저장된 결과가 없으면 API 호출
    setLoading(prev => ({ ...prev, [tool.id]: true }));

    try {
      console.log(`${tool.name} 분석 시작 - 요청 데이터:`, { resume_id: resumeId, application_id: applicationId });
      
      const requestData = {
        resume_id: resumeId,
        application_id: applicationId || null
      };

      // 타임아웃 설정 (60초로 증가)
      const response = await axiosInstance.post(tool.endpoint, requestData, {
        timeout: 60000
      });
      console.log(`${tool.name} 분석 응답:`, response.data);
      
      // 응답 데이터 검증
      if (!response.data) {
        throw new Error('응답 데이터가 없습니다.');
      }
      
      // 분석 결과 저장
      setResults(prev => ({ ...prev, [tool.id]: response.data }));

      // 부모 컴포넌트에 결과 전달
      if (onAnalysisResult) {
        onAnalysisResult(tool.id, response.data);
      }

    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err.message || '분석 중 오류가 발생했습니다.';
      setError(`${tool.name} 오류: ${errorMessage}`);
      console.error(`${tool.name} 분석 오류:`, err);
      
      // 에러 발생 시 선택 상태 해제하지 않고 유지 (사용자가 재시도할 수 있도록)
      // setSelectedTool(null);
      
      // 에러 발생 시에도 로딩 상태는 해제
      setLoading(prev => ({ ...prev, [tool.id]: false }));
    } finally {
      setLoading(prev => ({ ...prev, [tool.id]: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-0 w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-800">
          이력서 분석 도구
        </h3>
        <div className="text-xs text-gray-400">
          Resume ID: {resumeId} {applicationId && `| Application ID: ${applicationId}`}
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {tools.map((tool) => {
          const isActive = selectedTool === tool.id; // 사용자가 선택한 도구만 활성화
          const isLoading = loading[tool.id];
          const hasResult = results[tool.id]; // 저장된 결과가 있는지 확인
          
          return (
            <div key={tool.id} className="flex flex-col">
              <button
                onClick={() => handleAnalysis(tool)}
                disabled={isLoading || !resumeId}
                className={`
                  ${isActive 
                    ? `${tool.activeColor} text-white shadow-md` 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  }
                  px-3 py-3 rounded-lg text-sm font-medium
                  cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 transform hover:scale-[1.02]
                  flex flex-col items-center space-y-2 min-h-[80px]
                  relative
                `}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center space-y-1">
                    <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${isActive ? 'border-white' : 'border-gray-600'}`}></div>
                    <span className="text-xs">분석 중...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-lg">{tool.icon}</span>
                    <span className="font-medium text-xs text-center leading-tight">{tool.name}</span>
                    <span className={`text-[10px] text-center leading-tight ${isActive ? 'opacity-90' : 'opacity-70'}`}>
                      {tool.description}
                    </span>
                  </>
                )}
                
                {/* 사용자가 선택한 도구에만 체크 표시 */}
                {isActive && !isLoading && (
                  <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>


    </div>
  );
} 