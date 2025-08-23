import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  FaMicrophone, 
  FaStop, 
  FaPause, 
  FaPlay, 
  FaDownload,
  FaTrash,
  FaSpinner
} from 'react-icons/fa';
import { MdOutlineRecordVoiceOver, MdOutlineAnalytics } from 'react-icons/md';
import api from '../../api/api';

const AudioRecorder = ({ 
  applicationId, 
  onRecordingComplete, 
  onAnalysisComplete,
  interviewType = 'practical',
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // 녹음 시간 타이머
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      startTimeRef.current = Date.now();
      
    } catch (err) {
      setError('마이크 접근 권한이 필요합니다.');
      console.error('녹음 시작 실패:', err);
    }
  }, []);

  // 녹음 일시정지/재개
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  // 녹음 정지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  }, [isRecording]);

  // 녹음 취소
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setAnalysisResult(null);
    setError(null);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [isRecording, audioUrl]);

  // 녹음된 오디오 분석
  const analyzeRecording = useCallback(async () => {
    if (!audioBlob || !applicationId) {
      setError('분석할 오디오가 없거나 지원자 ID가 없습니다.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // FormData로 오디오 파일 전송
      const formData = new FormData();
      formData.append('audio_file', audioBlob, `interview_${interviewType}_${Date.now()}.webm`);
      formData.append('application_id', applicationId);
      formData.append('interview_type', interviewType);

      // Whisper 분석 API 호출
      const response = await api.post('/whisper-analysis/process-qa', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5분 타임아웃
      });

      if (response.data.success) {
        setAnalysisResult(response.data);
        onAnalysisComplete?.(response.data);
        
        // 녹음 완료 콜백 호출
        onRecordingComplete?.({
          audioBlob,
          audioUrl,
          recordingTime,
          analysisResult: response.data
        });
      } else {
        setError('분석에 실패했습니다: ' + (response.data.message || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('오디오 분석 실패:', err);
      setError('분석 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioBlob, applicationId, interviewType, recordingTime, audioUrl, onAnalysisComplete, onRecordingComplete]);

  // 녹음 시간 포맷팅
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MdOutlineRecordVoiceOver className="mr-2 text-blue-600" />
          실시간 면접 녹음
        </h3>
        <span className="text-sm text-gray-500">
          {interviewType === 'practical' ? '실무진' : '임원진'} 면접
        </span>
      </div>

      {/* 녹음 상태 표시 */}
      <div className="mb-4">
        {isRecording && (
          <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-700 font-medium">
              {isPaused ? '녹음 일시정지됨' : '녹음 중...'}
            </span>
            <span className="text-red-600 font-mono">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}
      </div>

      {/* 녹음 컨트롤 버튼 */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isAnalyzing}
          >
            <FaMicrophone className="mr-2" />
            녹음 시작
          </button>
        ) : (
          <>
            <button
              onClick={togglePause}
              className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              {isPaused ? <FaPlay className="mr-2" /> : <FaPause className="mr-2" />}
              {isPaused ? '재개' : '일시정지'}
            </button>
            
            <button
              onClick={stopRecording}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FaStop className="mr-2" />
              녹음 정지
            </button>
            
            <button
              onClick={cancelRecording}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FaTrash className="mr-2" />
              취소
            </button>
          </>
        )}
      </div>

      {/* 녹음된 오디오 재생 및 분석 */}
      {audioUrl && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">녹음된 오디오</h4>
            
            {/* 오디오 플레이어 */}
            <audio 
              controls 
              className="w-full mb-3"
              src={audioUrl}
            />
            
            {/* 오디오 정보 */}
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">녹음 시간:</span>
                <span className="ml-2">{formatTime(recordingTime)}</span>
              </div>
              <div>
                <span className="font-medium">파일 크기:</span>
                <span className="ml-2">{(audioBlob?.size / 1024).toFixed(1)}KB</span>
              </div>
            </div>
          </div>

          {/* 분석 버튼 */}
          <div className="flex justify-center">
            <button
              onClick={analyzeRecording}
              disabled={isAnalyzing}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <FaSpinner className="mr-2 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <MdOutlineAnalytics className="mr-2" />
                  실시간 분석 시작
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 분석 결과 */}
      {analysisResult && (
        <div className="mt-6 bg-green-50 rounded-lg border border-green-200 p-4">
          <h4 className="font-medium text-green-900 mb-3 flex items-center">
            <MdOutlineAnalytics className="mr-2" />
            분석 완료
          </h4>
          <div className="text-sm text-green-700">
            <p>✅ 음성 인식 및 분석이 완료되었습니다.</p>
            <p className="mt-1">분석 결과는 상단의 'STT 분석 결과' 탭에서 확인할 수 있습니다.</p>
          </div>
        </div>
      )}

      {/* 오류 메시지 */}
      {error && (
        <div className="mt-4 bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* 사용법 안내 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">📋 사용법</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>녹음 시작</strong> 버튼을 클릭하여 면접 녹음을 시작합니다.</li>
          <li>• <strong>일시정지/재개</strong>로 녹음을 중단하거나 계속할 수 있습니다.</li>
          <li>• <strong>녹음 정지</strong>로 녹음을 완료하고 분석을 진행합니다.</li>
          <li>• <strong>실시간 분석 시작</strong>으로 녹음된 음성을 AI로 분석합니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioRecorder;
