import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiPlay, FiPause, FiVolume2, FiFileText, FiClock, FiUser, 
  FiMessageSquare, FiBarChart2, FiDownload, FiRefreshCw 
} from 'react-icons/fi';
import { 
  MdOutlineAutoAwesome, MdOutlinePsychology,
  MdOutlineLanguage, MdOutlineGesture
} from 'react-icons/md';
import { FaUsers, FaMicrophone, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const WhisperAnalysisDisplay = ({ 
  applicationId, 
  interviewType = 'practice', // 'executive', 'practice', 'ai_interview'
  whisperData = null,
  onDataLoad = null 
}) => {
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('transcript');
  const [currentSegment, setCurrentSegment] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 면접 유형별 표시 정보
  const interviewTypeInfo = useMemo(() => {
    const info = {
      executive: {
        title: '임원진 면접',
        subtitle: 'Executive Interview Analysis',
        color: 'purple',
        icon: <FaUsers className="w-5 h-5" />
      },
      practice: {
        title: '실무진 면접',
        subtitle: 'Practical Interview Analysis', 
        color: 'blue',
        icon: <FaMicrophone className="w-5 h-5" />
      },
      ai_interview: {
        title: 'AI 면접',
        subtitle: 'AI Interview Analysis',
        color: 'green',
        icon: <MdOutlineAutoAwesome className="w-5 h-5" />
      }
    };
    return info[interviewType] || info.practice;
  }, [interviewType]);

  // Whisper 데이터 처리
  useEffect(() => {
    if (whisperData) {
      setCurrentData(whisperData);
      setError(null);
    } else {
      setCurrentData(null);
    }
  }, [whisperData]);

  // 데이터가 없을 때 로드 시도
  useEffect(() => {
    if (!currentData && applicationId && onDataLoad) {
      setLoading(true);
      onDataLoad(applicationId, interviewType)
        .then(data => {
          if (data && data.success) {
            setCurrentData(data);
          } else {
            setError(data?.message || '데이터를 불러올 수 없습니다.');
          }
        })
        .catch(err => {
          setError(err.message || '데이터 로드에 실패했습니다.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [applicationId, interviewType, currentData, onDataLoad]);

  // 세그먼트 데이터 추출
  const segments = useMemo(() => {
    if (!currentData?.whisper_analysis?.individual_analyses) return [];
    
    const allSegments = [];
    currentData.whisper_analysis.individual_analyses.forEach((analysis, fileIndex) => {
      if (analysis.stt_analysis?.segments) {
        analysis.stt_analysis.segments.forEach(segment => {
          allSegments.push({
            ...segment,
            fileIndex,
            fileName: analysis.file_info?.filename || `File ${fileIndex + 1}`
          });
        });
      }
    });
    
    return allSegments.sort((a, b) => a.start - b.start);
  }, [currentData]);

  // 전체 전사 텍스트
  const fullTranscript = useMemo(() => {
    if (!currentData?.whisper_analysis?.individual_analyses) return '';
    
    return currentData.whisper_analysis.individual_analyses
      .map(analysis => analysis.stt_analysis?.text || '')
      .join(' ');
  }, [currentData]);

  // 분석 통계
  const analysisStats = useMemo(() => {
    if (!currentData?.whisper_analysis) return null;
    
    const data = currentData.whisper_analysis;
    return {
      totalFiles: data.file_count || 0,
      totalDuration: data.individual_analyses?.reduce((sum, analysis) => 
        sum + (analysis.file_info?.duration_seconds || 0), 0) || 0,
      totalSegments: segments.length,
      averageConfidence: segments.length > 0 ? 
        segments.reduce((sum, seg) => sum + (seg.avg_logprob || 0), 0) / segments.length : 0,
      analysisDate: data.analysis_date || 'Unknown'
    };
  }, [currentData, segments]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Whisper 분석 데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <FaTimesCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">데이터 로드 실패</h3>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={() => onDataLoad?.(applicationId, interviewType)}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
            >
              <FiRefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Whisper 분석 데이터 없음</h3>
            <p className="text-gray-600">
              {interviewTypeInfo.title}에 대한 음성 분석 데이터가 없습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${interviewTypeInfo.color}-100 text-${interviewTypeInfo.color}-600`}>
              {interviewTypeInfo.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {interviewTypeInfo.title} 음성 분석
              </h2>
              <p className="text-sm text-gray-600">{interviewTypeInfo.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              분석일: {new Date(analysisStats?.analysisDate || '').toLocaleDateString()}
            </span>
            <FaCheckCircle className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center">
              <FiFileText className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600">총 파일</p>
                <p className="text-lg font-semibold text-blue-900">{analysisStats?.totalFiles || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center">
              <FiClock className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-green-600">총 시간</p>
                <p className="text-lg font-semibold text-green-900">
                  {Math.round(analysisStats?.totalDuration || 0)}초
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center">
              <FiMessageSquare className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600">세그먼트</p>
                <p className="text-lg font-semibold text-purple-900">{analysisStats?.totalSegments || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center">
              <FiBarChart2 className="w-5 h-5 text-orange-600 mr-2" />
              <div>
                <p className="text-sm text-orange-600">신뢰도</p>
                <p className="text-lg font-semibold text-orange-900">
                  {Math.round((analysisStats?.averageConfidence || 0) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'transcript', label: '전체 전사', icon: <FiFileText /> },
          { id: 'segments', label: '세그먼트', icon: <FiMessageSquare /> },
          { id: 'analysis', label: '분석 결과', icon: <FiBarChart2 /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span className="ml-2">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="p-4">
        {activeTab === 'transcript' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">전체 전사 텍스트</h3>
              <button className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                <FiDownload className="w-4 h-4 mr-1" />
                다운로드
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {fullTranscript || '전사 텍스트가 없습니다.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'segments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">세그먼트별 분석</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {currentSegment + 1} / {segments.length}
                </span>
                <button
                  onClick={() => setCurrentSegment(Math.max(0, currentSegment - 1))}
                  disabled={currentSegment === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentSegment(Math.min(segments.length - 1, currentSegment + 1))}
                  disabled={currentSegment === segments.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
            
            {segments.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <FiClock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {Math.round(segments[currentSegment]?.start || 0)}초 - {Math.round(segments[currentSegment]?.end || 0)}초
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiUser className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {segments[currentSegment]?.fileName || 'Unknown'}
                    </span>
                  </div>
                </div>
                <p className="text-gray-800 leading-relaxed mb-3">
                  {segments[currentSegment]?.text || '텍스트 없음'}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>신뢰도: {Math.round((segments[currentSegment]?.avg_logprob || 0) * 100)}%</span>
                  <span>압축률: {segments[currentSegment]?.compression_ratio?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                세그먼트 데이터가 없습니다.
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">음성 분석 결과</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">음성 특성</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>평균 신뢰도:</span>
                    <span className="font-medium">{Math.round((analysisStats?.averageConfidence || 0) * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>총 발화 시간:</span>
                    <span className="font-medium">{Math.round(analysisStats?.totalDuration || 0)}초</span>
                  </div>
                  <div className="flex justify-between">
                    <span>세그먼트 수:</span>
                    <span className="font-medium">{analysisStats?.totalSegments || 0}개</span>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">분석 정보</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>분석 방법:</span>
                    <span className="font-medium">Whisper STT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>언어:</span>
                    <span className="font-medium">한국어</span>
                  </div>
                  <div className="flex justify-between">
                    <span>파일 수:</span>
                    <span className="font-medium">{analysisStats?.totalFiles || 0}개</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhisperAnalysisDisplay; 