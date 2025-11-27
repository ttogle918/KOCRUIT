import React, { useState, useRef, useEffect } from 'react';
import { 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaSpinner,
  FaCheck,
  FaTimes,
  FaMicrophone,
  FaVideo,
  FaFileText,
  FaChartBar,
  FaEye,
  FaEyeSlash,
  FaDownload,
  FaTrash
} from 'react-icons/fa';
import RealtimeAnalysisApi from '../../api/realtimeAnalysisApi';

const RealtimeAnalysisModal = ({ 
  isOpen, 
  onClose, 
  applicationId, 
  analysisType = 'video',
  onAnalysisComplete 
}) => {
  const [sessionId, setSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('idle'); // idle, active, paused, completed
  const [progress, setProgress] = useState(0);
  const [chunks, setChunks] = useState([]);
  const [currentChunk, setCurrentChunk] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const statusIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // 세션 시작
  const startSession = async () => {
    try {
      setError('');
      const response = await RealtimeAnalysisApi.startSession(applicationId, analysisType);
      
      if (response.success) {
        setSessionId(response.session_id);
        setSessionStatus('active');
        startStatusPolling(response.session_id);
        startRecording();
      }
    } catch (error) {
      setError('세션 시작에 실패했습니다: ' + error.message);
    }
  };

  // 세션 일시정지
  const pauseSession = async () => {
    if (!sessionId) return;
    
    try {
      await RealtimeAnalysisApi.pauseSession(sessionId);
      setSessionStatus('paused');
      stopRecording();
    } catch (error) {
      setError('세션 일시정지에 실패했습니다: ' + error.message);
    }
  };

  // 세션 재개
  const resumeSession = async () => {
    if (!sessionId) return;
    
    try {
      await RealtimeAnalysisApi.resumeSession(sessionId);
      setSessionStatus('active');
      startRecording();
    } catch (error) {
      setError('세션 재개에 실패했습니다: ' + error.message);
    }
  };

  // 세션 완료
  const completeSession = async () => {
    if (!sessionId) return;
    
    try {
      stopRecording();
      const response = await RealtimeAnalysisApi.completeSession(sessionId);
      
      if (response.success) {
        setSessionStatus('completed');
        setSummary(response.summary);
        
        if (onAnalysisComplete) {
          onAnalysisComplete(response.summary);
        }
      }
    } catch (error) {
      setError('세션 완료에 실패했습니다: ' + error.message);
    }
  };

  // 상태 폴링 시작
  const startStatusPolling = (sessionId) => {
    statusIntervalRef.current = setInterval(async () => {
      try {
        const response = await RealtimeAnalysisApi.getSessionStatus(sessionId);
        if (response.success) {
          const status = response.status;
          setProgress(status.progress);
          setSessionStatus(status.status);
          
          // 청크 목록 업데이트
          const chunksResponse = await RealtimeAnalysisApi.getSessionChunks(sessionId);
          if (chunksResponse.success) {
            setChunks(chunksResponse.chunks);
          }
        }
      } catch (error) {
        console.error('상태 조회 실패:', error);
      }
    }, 2000); // 2초마다 업데이트
  };

  // 상태 폴링 중지
  const stopStatusPolling = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
  };

  // 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: analysisType === 'audio' || analysisType === 'video',
        video: analysisType === 'video'
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          
          // 청크 데이터를 서버로 전송
          if (sessionId) {
            try {
              const blob = new Blob(chunks, { type: event.data.type });
              const formData = new FormData();
              formData.append('chunk_type', analysisType);
              formData.append('data', JSON.stringify({
                timestamp: Date.now(),
                size: blob.size,
                type: event.data.type
              }));
              
              await RealtimeAnalysisApi.addChunk(sessionId, analysisType, {
                timestamp: Date.now(),
                size: blob.size,
                type: event.data.type
              });
            } catch (error) {
              console.error('청크 전송 실패:', error);
            }
          }
        }
      };
      
      mediaRecorder.start(5000); // 5초마다 청크 생성
      setIsRecording(true);
      
    } catch (error) {
      setError('미디어 접근에 실패했습니다: ' + error.message);
    }
  };

  // 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
  };

  // 컴포넌트 정리
  useEffect(() => {
    return () => {
      stopStatusPolling();
      stopRecording();
    };
  }, []);

  // 모달 닫기 시 정리
  const handleClose = () => {
    stopStatusPolling();
    stopRecording();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            실시간 {analysisType === 'video' ? '영상' : '음성'} 분석
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* 세션 컨트롤 */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            {sessionStatus === 'idle' && (
              <button
                onClick={startSession}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <FaPlay />
                분석 시작
              </button>
            )}
            
            {sessionStatus === 'active' && (
              <>
                <button
                  onClick={pauseSession}
                  className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
                >
                  <FaPause />
                  일시정지
                </button>
                <button
                  onClick={completeSession}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <FaStop />
                  완료
                </button>
              </>
            )}
            
            {sessionStatus === 'paused' && (
              <>
                <button
                  onClick={resumeSession}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                >
                  <FaPlay />
                  재개
                </button>
                <button
                  onClick={completeSession}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <FaStop />
                  완료
                </button>
              </>
            )}
            
            {sessionStatus === 'completed' && (
              <div className="flex items-center gap-2 text-green-600">
                <FaCheck />
                <span>분석 완료</span>
              </div>
            )}
          </div>

          {/* 진행률 표시 */}
          {sessionStatus !== 'idle' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>진행률</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* 녹음 상태 */}
          {isRecording && (
            <div className="flex items-center gap-2 text-red-500">
              <FaMicrophone className="animate-pulse" />
              <span>녹음 중...</span>
            </div>
          )}
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FaTimes />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* 청크 목록 */}
        {chunks.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                분석 청크 ({chunks.length}개)
              </h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                {showDetails ? <FaEyeSlash /> : <FaEye />}
                {showDetails ? '간단히 보기' : '상세 보기'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chunks.map((chunk, index) => (
                <div 
                  key={chunk.chunk_id}
                  className={`p-4 border rounded-lg ${
                    chunk.status === 'completed' ? 'bg-green-50 border-green-200' :
                    chunk.status === 'processing' ? 'bg-yellow-50 border-yellow-200' :
                    chunk.status === 'failed' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      청크 #{index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      {chunk.status === 'completed' && <FaCheck className="text-green-500" />}
                      {chunk.status === 'processing' && <FaSpinner className="animate-spin text-yellow-500" />}
                      {chunk.status === 'failed' && <FaTimes className="text-red-500" />}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    {new Date(chunk.timestamp * 1000).toLocaleTimeString()}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    타입: {chunk.chunk_type}
                  </div>
                  
                  {showDetails && chunk.result && (
                    <div className="mt-2 p-2 bg-white rounded text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(chunk.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최종 결과 */}
        {summary && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              분석 결과 요약
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">세션 정보</h4>
                <div className="space-y-1 text-sm">
                  <div>총 청크: {summary.total_chunks}개</div>
                  <div>완료: {summary.completed_chunks}개</div>
                  <div>실패: {summary.failed_chunks}개</div>
                  <div>소요 시간: {(summary.duration / 60).toFixed(1)}분</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">분석 결과</h4>
                <div className="space-y-1 text-sm">
                  {summary.results && summary.results.length > 0 && (
                    <div>
                      <div>처리된 결과: {summary.results.length}개</div>
                      <button
                        onClick={() => {
                          const dataStr = JSON.stringify(summary, null, 2);
                          const dataBlob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `analysis_result_${sessionId}.json`;
                          link.click();
                        }}
                        className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1 mt-2"
                      >
                        <FaDownload />
                        결과 다운로드
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeAnalysisModal; 