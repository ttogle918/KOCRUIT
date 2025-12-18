import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaMicrophone, 
  FaSquare, 
  FaPlay, 
  FaTrash,
  FaCloudUploadAlt,
  FaFileAlt,
  FaComment,
  FaStar
} from 'react-icons/fa';
import { saveInterviewEvaluation, getInterviewEvaluation } from '../../api/interview';
import { getApplication } from '../../api/api';
import { uploadFileToGoogleDrive } from '../../utils/googleDrive';
import useWebSocket from '../../hooks/useWebSocket';
import useMediaRecorder from '../../hooks/useMediaRecorder';

// 분리된 컴포넌트 import
import ResumeViewer from './ResumeViewer';
import QuestionList from './QuestionList';
import EvaluationForm from '../interview/human/EvaluationForm';

const InterviewWorkspace = ({
  questions = [],
  applicantName,
  audioFile,
  jobInfo,
  resumeInfo,
  jobPostId,
  interviewType = 'practical', // 'practical' 또는 'executive'
  interviewStage = 'practical', // 'practical' 또는 'executive'
  applicationId: propApplicationId // props로 전달받은 ID
}) => {
  const { applicationId: paramApplicationId } = useParams(); 
  const applicationId = propApplicationId || paramApplicationId;
  const navigate = useNavigate();
  
  // 상태 관리
  // const [isRecording, setIsRecording] = useState(false); // useMediaRecorder에서 관리
  const [sessionId, setSessionId] = useState(null);
  
  // 새로운 상태들
  const [recordedFiles, setRecordedFiles] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionNotes, setQuestionNotes] = useState({});
  const [evaluationScores, setEvaluationScores] = useState({});
  const [overallMemo, setOverallMemo] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  
  // Google Drive 관련 상태
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState({});
  const [googleDriveApiKey, setGoogleDriveApiKey] = useState(process.env.REACT_APP_GOOGLE_DRIVE_API_KEY || '');
  
  // 실시간 음성 분석 관련 상태
  const [isRealtimeAnalysisEnabled, setIsRealtimeAnalysisEnabled] = useState(true); // 기본값 켜기
  
  // 평가 결과 조회 관련 상태
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [isEvaluationCompleted, setIsEvaluationCompleted] = useState(false);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  
  // 면접 정보
  const [interviewInfo, setInterviewInfo] = useState({
    jobTitle: jobInfo?.title || '채용 공고',
    applicantName: applicantName || '지원자',
  });

  // 1. WebSocket 연결
  // wss://your-domain/api/v2/interview/ws/interview/{id}
  // 로컬 개발 환경: ws://localhost:8000/api/v2/interview/ws/interview/{id}
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // const wsHost = window.location.host; // 프록시 사용 시
  const wsHost = 'localhost:8000'; // 직접 연결 시 (백엔드 포트 확인 필요)
  const wsUrl = `${wsProtocol}//${wsHost}/api/v2/interview/ws/interview/${applicationId}`;
  
  const { sendMessage, lastMessage, isConnected } = useWebSocket(wsUrl, {
    autoConnect: !!applicationId,
    reconnectInterval: 3000,
  });

  // 2. 실시간 상태 관리 (STT 로그, AI 피드백)
  const [sttLogs, setSttLogs] = useState([]);
  const [aiFeedback, setAiFeedback] = useState(null);

  // 3. 메시지 수신 처리
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'stt_result') {
        setSttLogs(prev => [...prev, lastMessage]); // { text, speaker, timestamp }
      } else if (lastMessage.type === 'ai_feedback') {
        setAiFeedback(lastMessage); // { category, message }
        // 10초 뒤 피드백 끄기 (옵션)
        const timer = setTimeout(() => setAiFeedback(null), 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [lastMessage]);

  // 4. 오디오 레코딩 설정 (useMediaRecorder 사용)
  const handleAudioData = useCallback((chunk) => {
    // 오디오 청크(Blob)를 바이너리로 전송
    if (isConnected && isRealtimeAnalysisEnabled) {
      sendMessage(chunk); 
    }
  }, [isConnected, isRealtimeAnalysisEnabled, sendMessage]);

  const handleStopRecording = useCallback((blob) => {
    // 녹음 완료 시 파일 목록에 추가
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `interview_${applicantName || 'applicant'}_${timestamp}.webm`;
    const file = new File([blob], fileName, { type: 'audio/webm' });
    
    setRecordedFiles(prev => [...prev, {
      id: Date.now(),
      name: fileName,
      file: file,
      size: file.size,
      timestamp: new Date(),
      url: URL.createObjectURL(file)
    }]);
  }, [applicantName]);

  const { startRecording, stopRecording, isRecording, error: recorderError } = useMediaRecorder({
    onDataAvailable: handleAudioData,
    onStop: handleStopRecording,
    timeSlice: 1000 // 1초마다 전송
  });

  // 평가 결과 조회 (interview_status 기반)
  useEffect(() => {
    const checkEvaluationStatus = async () => {
      if (!applicationId) return;
      
      try {
        setIsLoadingResult(true);
        
        // 1. 먼저 application 정보 조회하여 면접 상태 확인
        const applicationData = await getApplication(applicationId);
          const practicalInterviewStatus = applicationData.practical_interview_status;
          const executiveInterviewStatus = applicationData.executive_interview_status;
          
          // 2. 면접 상태로 완료 여부 판단
          const isCompleted = practicalInterviewStatus === 'COMPLETED' || 
                             practicalInterviewStatus === 'PASSED' || 
                             practicalInterviewStatus === 'FAILED' ||
                             executiveInterviewStatus === 'COMPLETED' ||
                             executiveInterviewStatus === 'PASSED' ||
                             executiveInterviewStatus === 'FAILED';
          
          if (isCompleted) {
            // 3. 완료된 경우 평가 결과 조회
            try {
              const result = await getInterviewEvaluation(applicationId, interviewType); // interviewType 사용
              if (result) {
                setEvaluationResult(result);
                setIsEvaluationCompleted(true);
              }
            } catch (evalError) {
              console.log('평가 결과 조회 실패 (아직 평가 없을 수 있음):', evalError);
              setIsEvaluationCompleted(false);
            }
          } else {
            setIsEvaluationCompleted(false);
          }

      } catch (error) {
        console.log('평가 상태 확인 실패:', error);
        setIsEvaluationCompleted(false);
      } finally {
        setIsLoadingResult(false);
      }
    };

    checkEvaluationStatus();
  }, [applicationId, interviewType]);

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

  // Google Drive에 녹음 파일 업로드
  const uploadRecordingToDrive = async (fileId) => {
    if (!googleDriveApiKey) {
      alert('Google Drive API 키가 설정되지 않았습니다.');
      return;
    }

    const file = recordedFiles.find(f => f.id === fileId);
    if (!file) {
      alert('파일을 찾을 수 없습니다.');
      return;
    }

    setIsUploadingToDrive(true);
    setDriveUploadStatus(prev => ({ ...prev, [fileId]: 'uploading' }));

    try {
      const result = await uploadFileToGoogleDrive(file.file, file.name, googleDriveApiKey);
      
      if (result) {
        setRecordedFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, driveInfo: result }
            : f
        ));
        setDriveUploadStatus(prev => ({ ...prev, [fileId]: 'success' }));
        alert('Google Drive 업로드 완료!');
      } else {
        setDriveUploadStatus(prev => ({ ...prev, [fileId]: 'error' }));
        alert('Google Drive 업로드 실패');
      }
    } catch (error) {
      console.error('Google Drive 업로드 오류:', error);
      setDriveUploadStatus(prev => ({ ...prev, [fileId]: 'error' }));
      alert('Google Drive 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // 평가 점수 변경 핸들러
  const handleScoreChange = useCallback((scores) => {
    setEvaluationScores(scores);
  }, []);

  // 질문 메모 변경 핸들러
  const handleNoteChange = useCallback((index, value) => {
    setQuestionNotes(prev => ({
      ...prev,
      [index]: value
    }));
  }, []);

  // 질문 메모 저장 핸들러
  const handleSaveNote = useCallback((index) => {
    console.log(`질문 ${index + 1} 메모 저장:`, questionNotes[index]);
  }, [questionNotes]);

  // 평가 저장 핸들러
  const handleSaveEvaluation = async () => {
    try {
      const evaluationData = {
        application_id: applicationId,
        interview_type: interviewType,
        interview_stage: interviewStage,
        total_score: Object.values(evaluationScores).reduce((sum, score) => sum + (score || 0), 0),
        summary: overallMemo,
        evaluation_items: Object.entries(evaluationScores).map(([itemName, score]) => ({
          evaluate_type: itemName,
          evaluate_score: score,
          comment: questionNotes[itemName] || ''
        })),
        evaluator_id: 1, // 임시 평가자 ID
        status: 'completed'
      };
      
      await saveInterviewEvaluation(evaluationData);
      
      const result = await getInterviewEvaluation(applicationId, interviewType);
      setEvaluationResult(result);
      setIsEvaluationCompleted(true);
      
      alert('평가가 성공적으로 저장되었습니다!');
    } catch (error) {
      console.error('평가 저장 실패:', error);
      alert('평가 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      recordedFiles.forEach(file => {
        URL.revokeObjectURL(file.url);
      });
    };
  }, [isRecording, stopRecording, recordedFiles]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 relative">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {interviewType === 'practical' ? '실무진 면접' : '임원진 면접'}
            </h1>
            <p className="text-gray-600">
              {interviewInfo.jobTitle} - {interviewInfo.applicantName}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isConnected ? "연결됨" : "연결 안됨"}
            </span>
            
            {/* 실시간 분석 토글 */}
            <button
              onClick={() => setIsRealtimeAnalysisEnabled(!isRealtimeAnalysisEnabled)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isRealtimeAnalysisEnabled ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
              // disabled={isRecording}
            >
              <FaMicrophone className="w-4 h-4 mr-2" />
              {isRealtimeAnalysisEnabled ? "실시간 분석 ON" : "실시간 분석 OFF"}
            </button>
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              // disabled={!isConnected}
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

      {/* AI 피드백 토스트 (우측 상단) */}
      {aiFeedback && (
         <div className="fixed top-20 right-8 z-50 animate-bounce-in">
           <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded shadow-lg max-w-sm">
             <div className="flex items-start">
               <div className="flex-shrink-0">
                 <FaStar className="h-5 w-5 text-yellow-500" />
               </div>
               <div className="ml-3">
                 <p className="text-sm font-bold">AI Insight ({aiFeedback.category})</p>
                 <p className="text-sm mt-1">{aiFeedback.message}</p>
               </div>
               <button 
                 onClick={() => setAiFeedback(null)}
                 className="ml-auto -mx-1.5 -my-1.5 text-yellow-500 hover:text-yellow-600 p-1.5"
               >
                 <span className="sr-only">Dismiss</span>
                 &times;
               </button>
             </div>
           </div>
         </div>
       )}

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
            <ResumeViewer resumeInfo={resumeInfo} applicantName={applicantName} />
          </div>
        </div>

        {/* 가운데: 질문 및 STT */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col relative">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaComment className="w-5 h-5 mr-2" />
              면접 질문 & 실시간 대화
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 pb-40"> {/* 하단 STT 공간 확보 */}
            <QuestionList 
              questions={questions} 
              currentQuestion={currentQuestion}
              onQuestionSelect={setCurrentQuestion}
              questionNotes={questionNotes}
              onNoteChange={handleNoteChange}
              onSaveNote={handleSaveNote}
            />
          </div>

          {/* STT 자막 오버레이 (하단 고정) */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-90 text-white p-4 h-48 overflow-y-auto border-t border-gray-700">
            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase">Real-time Transcript</h3>
            {sttLogs.length === 0 ? (
              <p className="text-sm text-gray-500 italic">대화 내용이 여기에 표시됩니다...</p>
            ) : (
              <div className="space-y-2">
                {sttLogs.map((log, i) => (
                  <div key={i} className="animate-fade-in">
                    <span className="text-xs text-blue-400 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="text-sm">{log.text}</span>
                  </div>
                ))}
                {/* 자동 스크롤을 위한 더미 요소 */}
                <div ref={(el) => el?.scrollIntoView({ behavior: "smooth" })} />
              </div>
            )}
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
            <EvaluationForm
              isLoadingResult={isLoadingResult}
              isEvaluationCompleted={isEvaluationCompleted}
              evaluationResult={evaluationResult}
              // resumeId={resumeId} // resumeId prop 필요 확인
              applicationId={applicationId}
              interviewType={interviewType}
              interviewStage={interviewStage}
              onScoreChange={handleScoreChange}
              overallMemo={overallMemo}
              onOverallMemoChange={setOverallMemo}
              onSaveEvaluation={handleSaveEvaluation}
              onEditEvaluation={() => setIsEvaluationCompleted(false)}
            />

            {/* 녹음 파일 목록 */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
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
                      <button onClick={() => playAudio(file)} className="p-1 text-blue-500 hover:text-blue-700"><FaPlay className="w-3 h-3" /></button>
                      <button onClick={() => uploadRecordingToDrive(file.id)} className="p-1 text-purple-500 hover:text-purple-700"><FaCloudUploadAlt className="w-3 h-3" /></button>
                      <button onClick={() => deleteRecording(file.id)} className="p-1 text-red-500 hover:text-red-700"><FaTrash className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                {recordedFiles.length === 0 && <p className="text-sm text-gray-500 text-center py-4">녹음된 파일이 없습니다</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewWorkspace;
