import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaSquare, 
  FaPlay, 
  FaPause, 
  FaSave, 
  FaUsers, 
  FaComment,
  FaClock,
  FaStar,
  FaFileAlt,
  FaExclamationCircle
} from 'react-icons/fa';

const InterviewPanel = () => {
  const { jobId, applicantId } = useParams();
  const navigate = useNavigate();
  
  // 상태 관리
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentSpeaker, setCurrentSpeaker] = useState('unknown');
  const [transcripts, setTranscripts] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [speakerNotes, setSpeakerNotes] = useState({});
  const [sessionSummary, setSessionSummary] = useState(null);
  const [manualNote, setManualNote] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  
  // 실시간 오디오 관련
  const mediaRecorderRef = useRef(null);
  const websocketRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  
  // 면접 정보
  const [interviewInfo, setInterviewInfo] = useState({
    jobTitle: '백엔드 개발자',
    applicantName: '김지원',
    interviewers: ['면접관_1', '면접관_2', '면접관_3'],
    applicants: ['지원자_1', '지원자_2', '지원자_3']
  });

  // WebSocket 연결
  const connectWebSocket = useCallback(() => {
    const wsUrl = `ws://localhost:8000/api/v1/ws/interview/${sessionId}`;
    websocketRef.current = new WebSocket(wsUrl);
    
    websocketRef.current.onopen = () => {
      console.log('WebSocket 연결됨');
      setIsConnected(true);
      console.log('실시간 면접 시스템에 연결되었습니다');
    };
    
    websocketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    websocketRef.current.onclose = () => {
      console.log('WebSocket 연결 해제');
      setIsConnected(false);
      console.log('실시간 연결이 끊어졌습니다');
    };
    
    websocketRef.current.onerror = (error) => {
      console.error('WebSocket 오류:', error);
      console.log('연결 오류가 발생했습니다');
    };
  }, [sessionId]);

  // WebSocket 메시지 처리
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'audio_processed':
        handleAudioProcessed(data.result);
        break;
      case 'note_saved':
        console.log('메모가 저장되었습니다');
        break;
      case 'evaluation_summary':
        setSessionSummary(data.summary);
        break;
      case 'session_ended':
        handleSessionEnded(data.final_result);
        break;
      default:
        console.log('알 수 없는 메시지 타입:', data.type);
    }
  };

  // 오디오 처리 결과 처리
  const handleAudioProcessed = (result) => {
    if (result.transcription?.text) {
      setTranscripts(prev => [...prev, {
        timestamp: result.timestamp,
        speaker: result.diarization?.current_speaker || 'unknown',
        text: result.transcription.text
      }]);
    }
    
    if (result.evaluation?.score > 0) {
      setEvaluations(prev => [...prev, result.evaluation]);
    }
    
    if (result.diarization?.current_speaker) {
      setCurrentSpeaker(result.diarization.current_speaker);
    }
  };

  // 세션 종료 처리
  const handleSessionEnded = (finalResult) => {
    console.log('면접이 종료되었습니다');
    setSessionSummary(finalResult);
    // 결과 페이지로 이동하거나 결과 표시
  };

  // 오디오 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        sendAudioChunk();
      };
      
      // 3초마다 오디오 청크 전송
      mediaRecorder.start(3000);
      setIsRecording(true);
      console.log('녹음이 시작되었습니다');
      
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      console.log('마이크 권한이 필요합니다');
    }
  };

  // 오디오 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      console.log('녹음이 중지되었습니다');
    }
  };

  // 오디오 청크 전송
  const sendAudioChunk = () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN && audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64Audio = reader.result.split(',')[1];
        const message = {
          type: 'audio_chunk',
          audio_data: base64Audio,
          timestamp: Date.now() / 1000
        };
        
        websocketRef.current.send(JSON.stringify(message));
        audioChunksRef.current = [];
      };
      
      reader.readAsDataURL(audioBlob);
    }
  };

  // 수동 메모 추가
  const addManualNote = () => {
    if (!selectedSpeaker || !manualNote.trim()) {
      console.log('화자와 메모를 입력해주세요');
      return;
    }
    
    const message = {
      type: 'speaker_note',
      speaker: selectedSpeaker,
      note: manualNote,
      timestamp: Date.now() / 1000
    };
    
    websocketRef.current?.send(JSON.stringify(message));
    
    setSpeakerNotes(prev => ({
      ...prev,
      [selectedSpeaker]: [...(prev[selectedSpeaker] || []), {
        timestamp: Date.now() / 1000,
        note: manualNote
      }]
    }));
    
    setManualNote('');
    console.log('메모가 추가되었습니다');
  };

  // 평가 요청
  const requestEvaluation = () => {
    const message = {
      type: 'evaluation_request'
    };
    
    websocketRef.current?.send(JSON.stringify(message));
  };

  // 세션 종료
  const endSession = () => {
    const message = {
      type: 'session_end'
    };
    
    websocketRef.current?.send(JSON.stringify(message));
  };

  // 컴포넌트 마운트 시 세션 초기화
  useEffect(() => {
    const newSessionId = `interview_${jobId}_${applicantId}_${Date.now()}`;
    setSessionId(newSessionId);
  }, [jobId, applicantId]);

  // WebSocket 연결
  useEffect(() => {
    if (sessionId) {
      connectWebSocket();
    }
    
    return () => {
      websocketRef.current?.close();
    };
  }, [sessionId, connectWebSocket]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopRecording();
      websocketRef.current?.close();
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">실시간 면접 패널</h1>
          <p className="text-gray-600">
            {interviewInfo.jobTitle} - {interviewInfo.applicantName}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isConnected ? "연결됨" : "연결 안됨"}
          </span>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            disabled={!isConnected}
          >
            {isRecording ? (
              <FaSquare className="w-4 h-4 mr-2" />
            ) : (
              <FaMicrophone className="w-4 h-4 mr-2" />
            )}
            {isRecording ? "녹음 중지" : "녹음 시작"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 실시간 트랜스크립트 */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaFileAlt className="w-5 h-5 mr-2" />
              실시간 음성 인식
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {transcripts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  음성 인식 결과가 여기에 표시됩니다
                </p>
              ) : (
                transcripts.map((transcript, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      {transcript.speaker}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm">{transcript.text}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(transcript.timestamp * 1000).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {currentSpeaker !== 'unknown' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium">
                  현재 발화자: <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-semibold">{currentSpeaker}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 화자별 메모 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaComment className="w-5 h-5 mr-2" />
              화자별 메모
            </h2>
            <div className="space-y-4">
                {/* 수동 메모 추가 */}
                <div className="space-y-2">
                  <label htmlFor="speakerSelect" className="block text-sm font-medium text-gray-700">화자 선택</label>
                  <select
                    id="speakerSelect"
                    value={selectedSpeaker}
                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">화자 선택</option>
                    {interviewInfo.interviewers.map(speaker => (
                      <option key={speaker} value={speaker}>{speaker}</option>
                    ))}
                    {interviewInfo.applicants.map(speaker => (
                      <option key={speaker} value={speaker}>{speaker}</option>
                    ))}
                  </select>
                  
                  <textarea
                    placeholder="메모를 입력하세요..."
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded"
                  />
                  
                  <button
                    onClick={addManualNote}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium"
                  >
                    메모 추가
                  </button>
                </div>
                
                <hr className="my-4" />
                
                {/* 화자별 메모 목록 */}
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {Object.entries(speakerNotes).map(([speaker, notes]) => (
                    <div key={speaker} className="space-y-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">{speaker}</span>
                      {notes.map((note, index) => (
                        <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                          <p>{note.note}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(note.timestamp * 1000).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          {/* 실시간 평가 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaStar className="w-5 h-5 mr-2" />
              실시간 평가
            </h2>
            <div className="space-y-4">
                {evaluations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">최근 평가</p>
                    {evaluations.slice(-3).map((evaluation, index) => (
                      <div key={index} className="p-2 bg-green-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-semibold">{evaluation.speaker}</span>
                          <span className="text-sm font-medium">{evaluation.score}점</span>
                        </div>
                        <p className="text-xs mt-1">{evaluation.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={requestEvaluation}
                  className="w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium"
                >
                  평가 요청
                </button>
              </div>
            </div>

          {/* 세션 요약 */}
          {sessionSummary && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <FaClock className="w-5 h-5 mr-2" />
                세션 요약
              </h2>
              <div className="space-y-2 text-sm">
                <p>총 시간: {Math.round(sessionSummary.duration)}초</p>
                <p>음성 인식: {sessionSummary.total_transcripts}개</p>
                <p>평가: {sessionSummary.total_evaluations}개</p>
                {sessionSummary.average_score && (
                  <p>평균 점수: {sessionSummary.average_score.toFixed(1)}점</p>
                )}
              </div>
            </div>
          )}

          {/* 세션 종료 */}
          <button
            onClick={endSession}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
          >
            면접 종료
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewPanel;