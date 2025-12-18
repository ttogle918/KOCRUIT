import React from 'react';
import { FaDownload, FaFileAlt } from 'react-icons/fa';

const InterviewStatisticsTab = ({ statistics, handleExport, isExporting }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">통계 및 리포트</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">채용 프로세스 이탈률</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">서류 → AI 면접:</span>
              <span className="font-medium">{statistics.total > 0 ? ((statistics.total - statistics.aiInterview.total) / statistics.total * 100).toFixed(1) : 0}% 이탈</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">AI 면접 → 실무진:</span>
              <span className="font-medium">{statistics.aiInterview.total > 0 ? ((statistics.aiInterview.total - statistics.practical.total) / statistics.aiInterview.total * 100).toFixed(1) : 0}% 이탈</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">실무진 → 임원진:</span>
              <span className="font-medium">{statistics.practical.total > 0 ? ((statistics.practical.total - statistics.executive.total) / statistics.practical.total * 100).toFixed(1) : 0}% 이탈</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">리포트 생성</h3>
          <div className="space-y-3">
            <button 
              onClick={() => handleExport('weekly')}
              disabled={isExporting}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              <FaDownload className="inline w-4 h-4 mr-2" />
              주간 채용 리포트
            </button>
            <button 
              onClick={() => handleExport('stage')}
              disabled={isExporting}
              className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              <FaDownload className="inline w-4 h-4 mr-2" />
              단계별 분석 리포트
            </button>
            <button 
              onClick={() => handleExport('final')}
              disabled={isExporting}
              className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:bg-gray-400"
            >
              <FaDownload className="inline w-4 h-4 mr-2" />
              최종 합격자 리포트
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewStatisticsTab;

