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
  FaExclamationCircle,
  FaDownload,
  FaTrash,
  FaPlus,
  FaCheck,
  FaTimes,
  FaUser,
  FaBriefcase,
  FaGraduationCap,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt
} from 'react-icons/fa';

const InterviewPanel = ({
  questions = [],
  interviewChecklist,
  strengthsWeaknesses,
  interviewGuideline,
  evaluationCriteria,
  toolsLoading = false,
  memo = '',
  onMemoChange,
  evaluation = {},
  onEvaluationChange,
  isAutoSaving = false,
  resumeId,
  applicationId,
  companyName,
  applicantName,
  audioFile,
  jobInfo,
  resumeInfo,
  jobPostId
}) => {
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
  
  // 새로운 상태들
  const [recordedFiles, setRecordedFiles] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionNotes, setQuestionNotes] = useState({});
  const [evaluationScores, setEvaluationScores] = useState({});
  const [overallMemo, setOverallMemo] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  
  // 실시간 오디오 관련
  const mediaRecorderRef = useRef(null);
  // [WebSocket 및 실시간 음성 관련 코드 전체 주석 처리]
  // const websocketRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  
  // 면접 정보
  const [interviewInfo, setInterviewInfo] = useState({
    jobTitle: jobInfo?.title || '백엔드 개발자',
    applicantName: applicantName || '김지원',
    interviewers: ['면접관_1', '면접관_2', '면접관_3'],
    applicants: ['지원자_1', '지원자_2', '지원자_3']
  });

  // 평가 항목들
  const evaluationItems = [
    { id: 'technical_skills', label: '기술 역량', maxScore: 10 },
    { id: 'problem_solving', label: '문제 해결 능력', maxScore: 10 },
    { id: 'communication', label: '의사소통 능력', maxScore: 10 },
    { id: 'teamwork', label: '팀워크', maxScore: 10 },
    { id: 'motivation', label: '동기부여', maxScore: 10 },
    { id: 'culture_fit', label: '문화 적합성', maxScore: 10 },
    { id: 'experience', label: '경험', maxScore: 10 },
    { id: 'potential', label: '성장 잠재력', maxScore: 10 }
  ];

  // WebSocket 연결
  // [WebSocket 및 실시간 음성 관련 코드 전체 주석 처리]
  // const connectWebSocket = useCallback(() => {
  //   if (!sessionId) {
  //     console.log('세션 ID가 없습니다');
  //     return;
  //   }

  //   if (websocketRef.current?.readyState === WebSocket.OPEN) {
  //     console.log('이미 WebSocket이 연결되어 있습니다');
  //     return;
  //   }

  //   const wsUrl = `ws://localhost:8000/api/v1/realtime-interview/ws/interview/${sessionId}`;
  //   console.log('WebSocket 연결 시도:', wsUrl);
    
  //   try {
  //     websocketRef.current = new WebSocket(wsUrl);
      
  //     const connectionTimeout = setTimeout(() => {
  //       if (websocketRef.current?.readyState === WebSocket.CONNECTING) {
  //         console.error('WebSocket 연결 타임아웃');
  //         websocketRef.current.close();
  //         setIsConnected(false);
  //       }
  //     }, 10000);
      
  //     websocketRef.current.onopen = () => {
  //       clearTimeout(connectionTimeout);
  //       console.log('WebSocket 연결됨');
  //       setIsConnected(true);
  //     };
      
  //     websocketRef.current.onmessage = (event) => {
  //       try {
  //         const data = JSON.parse(event.data);
  //         console.log('WebSocket 메시지 수신:', data.type);
  //         handleWebSocketMessage(data);
  //       } catch (error) {
  //         console.error('메시지 파싱 오류:', error);
  //       }
  //     };
      
  //     websocketRef.current.onclose = (event) => {
  //       clearTimeout(connectionTimeout);
  //       console.log('WebSocket 연결 해제:', event.code, event.reason);
  //       setIsConnected(false);
        
  //       if (event.code !== 1000) {
  //         setTimeout(() => {
  //           if (!isConnected) {
  //             connectWebSocket();
  //           }
  //         }, 3000);
  //       }
  //     };
      
  //     websocketRef.current.onerror = (error) => {
  //       clearTimeout(connectionTimeout);
  //       console.error('WebSocket 오류:', error);
  //       setIsConnected(false);
  //     };
  //   } catch (error) {
  //     console.error('WebSocket 생성 오류:', error);
  //     setIsConnected(false);
  //   }
  // }, [sessionId, isConnected]);

  // WebSocket 메시지 처리
  // [WebSocket 및 실시간 음성 관련 코드 전체 주석 처리]
  // const handleWebSocketMessage = (data) => {
  //   switch (data.type) {
  //     case 'audio_processed':
  //       handleAudioProcessed(data.result);
  //       break;
  //     case 'note_saved':
  //       console.log('메모가 저장되었습니다');
  //       break;
  //     case 'evaluation_summary':
  //       setSessionSummary(data.summary);
  //       break;
  //     case 'session_ended':
  //       handleSessionEnded(data.final_result);
  //       break;
  //     case 'ping':
  //       console.log('서버 ping 수신:', data.timestamp);
  //       break;
  //     default:
  //       console.log('알 수 없는 메시지 타입:', data.type);
  //   }
  // };

  // 오디오 처리 결과 처리
  // [WebSocket 및 실시간 음성 관련 코드 전체 주석 처리]
  // const handleAudioProcessed = (result) => {
  //   if (result.transcription?.text) {
  //     setTranscripts(prev => [...prev, {
  //       timestamp: result.timestamp,
  //       speaker: result.diarization?.current_speaker || 'unknown',
  //       text: result.transcription.text
  //     }]);
  //   }
    
  //   if (result.evaluation?.score > 0) {
  //     setEvaluations(prev => [...prev, result.evaluation]);
  //   }
    
  //   if (result.diarization?.current_speaker) {
  //     setCurrentSpeaker(result.diarization.current_speaker);
  //   }
  // };

  // 세션 종료 처리
  // [WebSocket 및 실시간 음성 관련 코드 전체 주석 처리]
  // const handleSessionEnded = (finalResult) => {
  //   console.log('면접이 종료되었습니다');
  //   setSessionSummary(finalResult);
  // };

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
        saveRecording();
      };
      
      mediaRecorder.start(3000);
      setIsRecording(true);
      console.log('녹음이 시작되었습니다');
      
    } catch (error) {
      console.error('녹음 시작 실패:', error);
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

  // 녹음 파일 저장
  const saveRecording = () => {
    if (audioChunksRef.current.length === 0) return;
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `interview_${applicantName}_${timestamp}.webm`;
    
    const file = new File([audioBlob], fileName, { type: 'audio/webm' });
    
    setRecordedFiles(prev => [...prev, {
      id: Date.now(),
      name: fileName,
      file: file,
      size: file.size,
      timestamp: new Date(),
      url: URL.createObjectURL(file)
    }]);
    
    audioChunksRef.current = [];
    console.log('녹음 파일이 저장되었습니다:', fileName);
  };

  // 오디오 재생
  const playAudio = (file) => {
    if (currentAudio) {
      currentAudio.pause();
    }
    
    const audio = new Audio(file.url);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentAudio(null);
    };
    
    audio.play();
    setCurrentAudio(audio);
    setIsPlaying(true);
  };

  // 오디오 일시정지
  const pauseAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }
  };

  // 녹음 파일 삭제
  const deleteRecording = (fileId) => {
    setRecordedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  // 평가 점수 변경
  const handleScoreChange = (itemId, score) => {
    setEvaluationScores(prev => ({
      ...prev,
      [itemId]: Math.max(0, Math.min(10, score))
    }));
  };

  // 질문 메모 추가
  const addQuestionNote = (questionIndex) => {
    const note = questionNotes[questionIndex] || '';
    if (note.trim()) {
      setQuestionNotes(prev => ({
        ...prev,
        [questionIndex]: note
      }));
    }
  };

  // 컴포넌트 마운트 시 세션 초기화
  useEffect(() => {
    const safeJobId = jobId || 'default_job';
    const safeApplicantId = applicantId || 'default_applicant';
    const newSessionId = `interview_${safeJobId}_${safeApplicantId}_${Date.now()}`;
    setSessionId(newSessionId);
    console.log('세션 ID 생성:', newSessionId);
  }, [jobId, applicantId]);

  // WebSocket 연결
  // [WebSocket 및 실시간 음성 관련 코드 전체 주석 처리]
  // useEffect(() => {
  //   if (sessionId) {
  //     connectWebSocket();
  //   }
    
  //   return () => {
  //     if (websocketRef.current) {
  //       websocketRef.current.close();
  //     }
  //   };
  // }, [sessionId, connectWebSocket]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopRecording();
      // [WebSocket 및 실시간 음성 관련 코드 전체 주석 처리]
      // if (websocketRef.current) {
      //   websocketRef.current.close();
      // }
      // 오디오 URL 정리
      recordedFiles.forEach(file => {
        URL.revokeObjectURL(file.url);
      });
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">실무진 면접</h1>
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
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
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
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽: 이력서 */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaFileAlt className="w-5 h-5 mr-2" />
              지원자 이력서
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {resumeInfo ? (
              (() => {
                try {
                  const parsedResume = typeof resumeInfo === 'string' ? JSON.parse(resumeInfo) : resumeInfo;
                  return (
                    <div className="space-y-6">
                      {/* 기본 정보 */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <FaUser className="w-4 h-4 mr-2" />
                          기본 정보
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <FaUser className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium">이름:</span>
                            <span className="ml-2">{parsedResume.name || applicantName}</span>
                          </div>
                          <div className="flex items-center">
                            <FaPhone className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium">연락처:</span>
                            <span className="ml-2">{parsedResume.phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center">
                            <FaEnvelope className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium">이메일:</span>
                            <span className="ml-2">{parsedResume.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium">주소:</span>
                            <span className="ml-2">{parsedResume.address || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* 학력 */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <FaGraduationCap className="w-4 h-4 mr-2" />
                          학력
                        </h3>
                        <div className="space-y-2 text-sm">
                          {parsedResume.education?.map((edu, index) => (
                            <div key={index} className="border-l-2 border-blue-500 pl-3">
                              <div className="font-medium">{edu.school}</div>
                              <div className="text-gray-600">{edu.major} • {edu.degree}</div>
                              <div className="text-gray-500">{edu.period}</div>
                            </div>
                          )) || <p className="text-gray-500">학력 정보가 없습니다</p>}
                        </div>
                      </div>

                      {/* 경력 */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <FaBriefcase className="w-4 h-4 mr-2" />
                          경력
                        </h3>
                        <div className="space-y-2 text-sm">
                          {parsedResume.experience?.map((exp, index) => (
                            <div key={index} className="border-l-2 border-green-500 pl-3">
                              <div className="font-medium">{exp.company}</div>
                              <div className="text-gray-600">{exp.position}</div>
                              <div className="text-gray-500">{exp.period}</div>
                              <div className="text-gray-700 mt-1">{exp.description}</div>
                            </div>
                          )) || <p className="text-gray-500">경력 정보가 없습니다</p>}
                        </div>
                      </div>

                      {/* 기술 스택 */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3">기술 스택</h3>
                        <div className="flex flex-wrap gap-2">
                          {parsedResume.skills?.map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {skill}
                            </span>
                          )) || <p className="text-gray-500">기술 스택 정보가 없습니다</p>}
                        </div>
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.error('이력서 정보 파싱 오류:', error);
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <FaFileAlt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>이력서 정보를 불러오는 중...</p>
                    </div>
                  );
                }
              })()
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaFileAlt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>이력서 정보를 불러오는 중...</p>
              </div>
            )}
          </div>
        </div>

        {/* 가운데: 질문 */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaComment className="w-5 h-5 mr-2" />
              면접 질문
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className={`p-4 rounded-lg border-2 transition-colors ${
                  currentQuestion === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-600">질문 {index + 1}</span>
                    <button
                      onClick={() => setCurrentQuestion(index)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        currentQuestion === index 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      선택
                    </button>
                  </div>
                  
                  <p className="text-gray-900 mb-3">{question}</p>
                  
                  {/* 질문별 메모 */}
                  <div className="space-y-2">
                    <textarea
                      placeholder="이 질문에 대한 메모를 입력하세요..."
                      value={questionNotes[index] || ''}
                      onChange={(e) => setQuestionNotes(prev => ({
                        ...prev,
                        [index]: e.target.value
                      }))}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                    />
                    <button
                      onClick={() => addQuestionNote(index)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                    >
                      메모 저장
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 평가 및 메모 */}
        <div className="w-1/3 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaStar className="w-5 h-5 mr-2" />
              평가 및 메모
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* 평가 항목 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">평가 항목</h3>
              {evaluationItems.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">{item.label}</label>
                    <span className="text-sm text-gray-500">{evaluationScores[item.id] || 0}/10</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={evaluationScores[item.id] || 0}
                      onChange={(e) => handleScoreChange(item.id, parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <button
                      onClick={() => handleScoreChange(item.id, (evaluationScores[item.id] || 0) + 1)}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      disabled={(evaluationScores[item.id] || 0) >= 10}
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleScoreChange(item.id, (evaluationScores[item.id] || 0) - 1)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      disabled={(evaluationScores[item.id] || 0) <= 0}
                    >
                      -
                    </button>
                  </div>
                </div>
              ))}
              
              {/* 총점 */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">총점</span>
                  <span className="text-lg font-bold text-blue-600">
                    {Object.values(evaluationScores).reduce((sum, score) => sum + (score || 0), 0)}/80
                  </span>
                </div>
              </div>
            </div>

            {/* 전체 메모 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">전체 메모</h3>
              <textarea
                placeholder="면접 전체에 대한 메모를 입력하세요..."
                value={overallMemo}
                onChange={(e) => setOverallMemo(e.target.value)}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-md text-sm resize-none"
              />
            </div>

            {/* 녹음 파일 목록 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">녹음 파일</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recordedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {file.timestamp.toLocaleTimeString()} • {(file.size / 1024 / 1024).toFixed(2)}MB
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => playAudio(file)}
                        className="p-1 text-blue-500 hover:text-blue-700"
                        title="재생"
                      >
                        <FaPlay className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = file.url;
                          link.download = file.name;
                          link.click();
                        }}
                        className="p-1 text-green-500 hover:text-green-700"
                        title="다운로드"
                      >
                        <FaDownload className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteRecording(file.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="삭제"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {recordedFiles.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    녹음된 파일이 없습니다
                  </p>
                )}
              </div>
            </div>

            {/* 평가 저장 버튼 */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  // 평가 결과를 부모 컴포넌트로 전달
                  const evaluationData = {
                    scores: evaluationScores,
                    totalScore: Object.values(evaluationScores).reduce((sum, score) => sum + (score || 0), 0),
                    memo: overallMemo,
                    questionNotes: questionNotes,
                    recordedFiles: recordedFiles
                  };
                  console.log('평가 결과:', evaluationData);
                  // TODO: 실제 저장 로직 구현
                  alert('평가가 저장되었습니다!');
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                평가 저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPanel;