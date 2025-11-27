import React, { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { MdOutlineAutoAwesome } from 'react-icons/md';
import api from '../../api/api';

const AudioPlayer = ({ 
  audioFile, 
  onTranscriptionUpdate, 
  onEvaluationUpdate, 
  jobInfo, 
  resumeInfo,
  isRealtimeEvaluation = true 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [speakers, setSpeakers] = useState([]);
  
  const audioRef = useRef(null);
  const evaluationIntervalRef = useRef(null);

  useEffect(() => {
    if (audioFile) {
      loadAudio();
    }
  }, [audioFile]);

  useEffect(() => {
    if (isPlaying && isRealtimeEvaluation) {
      startRealtimeEvaluation();
    } else {
      stopRealtimeEvaluation();
    }
  }, [isPlaying, isRealtimeEvaluation]);

  const loadAudio = () => {
    if (audioRef.current) {
      audioRef.current.src = audioFile;
      audioRef.current.load();
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekTime = (clickX / width) * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, currentTime - 10);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, currentTime + 10);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const startRealtimeEvaluation = () => {
    // 30초마다 평가 수행
    evaluationIntervalRef.current = setInterval(async () => {
      if (transcription && speakers.length > 0) {
        await performRealtimeEvaluation();
      }
    }, 30000); // 30초
  };

  const stopRealtimeEvaluation = () => {
    if (evaluationIntervalRef.current) {
      clearInterval(evaluationIntervalRef.current);
      evaluationIntervalRef.current = null;
    }
  };

  const performRealtimeEvaluation = async () => {
    if (!transcription || speakers.length === 0) return;

    setIsEvaluating(true);
    try {
      const response = await api.post('/agent/realtime-interview-evaluation', {
        transcription: transcription,
        speakers: speakers,
        job_info: jobInfo || '',
        resume_info: resumeInfo || '',
        current_time: currentTime
      });

      if (response.data && response.data.realtime_evaluation) {
        setEvaluationResults(response.data.realtime_evaluation);
        
        // 부모 컴포넌트에 평가 결과 전달
        if (onEvaluationUpdate) {
          onEvaluationUpdate(response.data.realtime_evaluation);
        }
      }
    } catch (error) {
      console.error('실시간 평가 오류:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const performInitialTranscription = async () => {
    if (!audioFile) return;

    try {
      const response = await api.post('/agent/speech-recognition', {
        audio_file_path: audioFile
      });

      if (response.data && response.data.speech_analysis) {
        const analysis = response.data.speech_analysis;
        setTranscription(analysis.transcription?.text || '');
        setSpeakers(analysis.speakers?.speakers || []);
        
        // 부모 컴포넌트에 전사 결과 전달
        if (onTranscriptionUpdate) {
          onTranscriptionUpdate(analysis);
        }
      }
    } catch (error) {
      console.error('음성 인식 오류:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      {/* 제목 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          면접 녹음 재생
        </h3>
        {isRealtimeEvaluation && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <MdOutlineAutoAwesome size={16} />
            <span>실시간 AI 평가</span>
            {isEvaluating && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
        )}
      </div>

      {/* 오디오 플레이어 */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* 재생 컨트롤 */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={skipBackward}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <FiSkipBack size={20} />
        </button>
        
        <button
          onClick={togglePlay}
          className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
        </button>
        
        <button
          onClick={skipForward}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <FiSkipForward size={20} />
        </button>
      </div>

      {/* 진행 바 */}
      <div className="mb-4">
        <div
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-100"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 볼륨 컨트롤 */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* 실시간 평가 결과 */}
      {evaluationResults && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            실시간 AI 평가 결과
          </h4>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="mb-2">
                <strong>평균점수:</strong> {evaluationResults.evaluation?.scores ? 
                  (Object.values(evaluationResults.evaluation.scores).reduce((a, b) => a + b, 0) / 
                   Object.keys(evaluationResults.evaluation.scores).length).toFixed(1) : 'N/A'}/5.0
              </div>
              {evaluationResults.auto_memo && (
                <div className="text-xs">
                  <strong>AI 메모:</strong> {evaluationResults.auto_memo}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 음성 인식 버튼 */}
      {!transcription && (
        <button
          onClick={performInitialTranscription}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
        >
          음성 인식 시작
        </button>
      )}
    </div>
  );
};

export default AudioPlayer; 