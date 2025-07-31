import React, { useState, useEffect } from 'react';
import api from '../../api/api';

const EvaluationCriteriaDebug = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDebugInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/ai-interview/debug/evaluation-criteria');
      setDebugInfo(response.data.debug_info);
    } catch (error) {
      console.error('디버그 정보 로딩 실패:', error);
      setError('디버그 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDebugInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">디버그 정보를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">평가항목 디버그 정보</h1>
        <button
          onClick={loadDebugInfo}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          새로고침
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {debugInfo && (
        <div className="space-y-6">
          {/* 요약 정보 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">요약 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{debugInfo.total_criteria_count}</div>
                <div className="text-sm text-blue-600">전체 평가항목</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{debugInfo.practical_criteria_count}</div>
                <div className="text-sm text-green-600">실무진 평가항목</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{debugInfo.executive_criteria_count}</div>
                <div className="text-sm text-purple-600">임원진 평가항목</div>
              </div>
            </div>
          </div>

          {/* 지원자 샘플 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">지원자 샘플</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이력서 ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">공고 ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {debugInfo.sample_applications.map((app, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.resume_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.job_post_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 실무진 평가항목 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">실무진 평가항목</h2>
            {debugInfo.practical_criteria.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이력서 ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지원자 ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">타입</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회사명</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평가항목 수</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {debugInfo.practical_criteria.map((criteria, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.resume_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.application_id || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.evaluation_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.company_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            criteria.has_evaluation_items 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {criteria.evaluation_items_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">실무진 평가항목이 없습니다.</p>
            )}
          </div>

          {/* 임원진 평가항목 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">임원진 평가항목</h2>
            {debugInfo.executive_criteria.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이력서 ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지원자 ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">타입</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회사명</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평가항목 수</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {debugInfo.executive_criteria.map((criteria, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.resume_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.application_id || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.evaluation_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{criteria.company_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            criteria.has_evaluation_items 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {criteria.evaluation_items_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">임원진 평가항목이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationCriteriaDebug; 