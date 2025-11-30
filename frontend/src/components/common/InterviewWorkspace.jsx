import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaMicrophone, 
  FaSquare, 
  FaPlay, 
  FaDownload,
  FaTrash,
  FaCloudUploadAlt,
  FaFileAlt,
  FaComment,
  FaStar
} from 'react-icons/fa';
import { saveInterviewEvaluation, getInterviewEvaluation } from '../../api/interview';
import { getApplication } from '../../api/api';
import { uploadFileToGoogleDrive } from '../../utils/googleDrive';

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
  interviewStage = 'practical' // 'practical' 또는 'executive'
}) => {
  const { jobId, applicantId, applicationId } = useParams(); // applicationId 추가
  const navigate = useNavigate();
  
  // 상태 관리
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
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
  const [isRealtimeAnalysisEnabled, setIsRealtimeAnalysisEnabled] = useState(false);
  const [realtimeAnalysisResults, setRealtimeAnalysisResults] = useState([]);
  const [currentAnalysisSession, setCurrentAnalysisSession] = useState(null);
  
  // 평가 결과 조회 관련 상태
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [isEvaluationCompleted, setIsEvaluationCompleted] = useState(false);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  
  // 실시간 오디오 관련
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  
  // 면접 정보
  const [interviewInfo, setInterviewInfo] = useState({
    jobTitle: jobInfo?.title || '백엔드 개발자',
    applicantName: applicantName || '김지원',
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
              console.log('평가 결과 조회 실패:', evalError);
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
      
      // 실시간 분석 세션 시작
      if (isRealtimeAnalysisEnabled) {
        const sessionId = `session_${Date.now()}`;
        setCurrentAnalysisSession(sessionId);
        setRealtimeAnalysisResults([]);
      }
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // 실시간 분석이 활성화된 경우 청크 분석
          if (isRealtimeAnalysisEnabled && currentAnalysisSession) {
            await analyzeAudioChunk(event.data);
          }
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

  // 실시간 음성 분석
  const analyzeAudioChunk = async (audioChunk) => {
    try {
      const arrayBuffer = await audioChunk.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const formData = new FormData();
      formData.append('audio_data', base64Audio);
      formData.append('session_id', currentAnalysisSession);
      formData.append('timestamp', Date.now());
      formData.append('application_id', applicationId || 'unknown');
      
      const response = await fetch('http://localhost:8000/realtime-audio-analysis', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRealtimeAnalysisResults(prev => [...prev, result.result]);
        }
      }
    } catch (error) {
      console.error('실시간 음성 분석 오류:', error);
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
    // API 연동 가능
    console.log(`질문 ${index + 1} 메모 저장:`, questionNotes[index]);
  }, [questionNotes]);

  // 평가 저장 핸들러
  const handleSaveEvaluation = async () => {
    try {
      const evaluationData = {
        application_id: applicationId,
        // resume_id: resumeId, // resumeId prop이 필요한지 확인
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

  // 컴포넌트 마운트 시 세션 초기화
  useEffect(() => {
    const safeJobId = jobId || 'default_job';
    const safeApplicantId = applicantId || 'default_applicant';
    const newSessionId = `interview_${safeJobId}_${safeApplicantId}_${Date.now()}`;
    setSessionId(newSessionId);
    setIsConnected(true); // 임시 연결 상태
  }, [jobId, applicantId]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopRecording();
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
              disabled={isRecording}
            >
              <FaMicrophone className="w-4 h-4 mr-2" />
              {isRealtimeAnalysisEnabled ? "실시간 분석 ON" : "실시간 분석 OFF"}
            </button>
            
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
            <ResumeViewer resumeInfo={resumeInfo} applicantName={applicantName} />
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
            <QuestionList 
              questions={questions} 
              currentQuestion={currentQuestion}
              onQuestionSelect={setCurrentQuestion}
              questionNotes={questionNotes}
              onNoteChange={handleNoteChange}
              onSaveNote={handleSaveNote}
            />
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

            {/* 실시간 분석 결과 */}
            {isRealtimeAnalysisEnabled && realtimeAnalysisResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">실시간 분석 결과</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {realtimeAnalysisResults.slice(-5).map((result, index) => (
                    <div key={index} className="p-2 bg-purple-50 rounded border border-purple-200">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-purple-600 font-medium">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-xs text-purple-600">
                          {result.speech_rate?.toFixed(1)} wpm
                        </span>
                      </div>
                      {result.transcription && (
                        <p className="text-xs text-gray-700 line-clamp-2">
                          "{result.transcription}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
