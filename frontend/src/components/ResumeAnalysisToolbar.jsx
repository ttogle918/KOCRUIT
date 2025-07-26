import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

export default function ResumeAnalysisToolbar({ resumeId, applicationId, onAnalysisResult, onToolChange }) {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({}); // 초기에는 아무것도 선택되지 않은 상태
  const [error, setError] = useState(null);

  const tools = [
    {
      id: 'comprehensive',
      name: '종합 분석',
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
      id: 'keyword_matching',
      name: '키워드 매칭',
      description: '직무 요구사항 매칭',
      endpoint: '/v1/resumes/keyword-matching',
      icon: '🔗',
      activeColor: 'bg-sky-500 hover:bg-sky-600'
    }
  ];

  const handleAnalysis = async (tool) => {
    if (!resumeId || typeof resumeId !== 'number') {
      setError('유효한 이력서 ID가 필요합니다.');
      return;
    }

    // 이전 선택 모두 해제하고 현재 선택한 것만 활성화
    setResults({ [tool.id]: true });
    setLoading(prev => ({ ...prev, [tool.id]: true }));
    setError(null);

    // 부모 컴포넌트에 도구 변경 알림 (이전 결과 초기화용)
    if (onToolChange) {
      onToolChange(tool.id);
    }

    try {
      const requestData = {
        resume_id: resumeId,
        application_id: applicationId || null
      };

      const response = await axiosInstance.post(tool.endpoint, requestData);
      
      setResults({ [tool.id]: response.data });

      // 부모 컴포넌트에 결과 전달
      if (onAnalysisResult) {
        onAnalysisResult(tool.id, response.data);
      }

    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err.message || '분석 중 오류가 발생했습니다.';
      setError(`${tool.name} 오류: ${errorMessage}`);
      console.error(`${tool.name} 분석 오류:`, err);
      // 에러 발생 시 모든 선택 해제
      setResults({});
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
          const isActive = results[tool.id];
          const isLoading = loading[tool.id];
          
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