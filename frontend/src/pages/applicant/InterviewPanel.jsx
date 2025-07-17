import React, { useState, useRef, useEffect } from 'react';
import Rating from '@mui/material/Rating';
import api from '../../api/api';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ApplicantCard from '../../components/ApplicantCard';
import AudioPlayer from '../../components/AudioPlayer';
import { FiMic, FiMicOff, FiDownload, FiAlertCircle } from 'react-icons/fi';


function InterviewPanel({
  questions = [],
  memo = '',
  onMemoChange,
  evaluation = {},
  onEvaluationChange,
  isAutoSaving = false,
  resumeId,
  applicationId,
  companyName,
  applicantName,
  interviewChecklist = null,
  strengthsWeaknesses = null,
  interviewGuideline = null,
  evaluationCriteria = null,
  toolsLoading = false,
  audioFile = null, // 추가: 오디오 파일 경로
  jobInfo = null, // 추가: 채용공고 정보
  resumeInfo = null, // 추가: 이력서 정보
  jobPostId = null // 추가: 채용공고 ID
}) {
  // 면접관 지원 도구 상태 제거 (useState, useEffect, loadInterviewTools 등 모두 삭제)
  const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'analysis', 'checklist', 'guideline', 'criteria'
  const [aiMemo, setAiMemo] = useState(''); // 추가: AI 자동 메모
  const [isRecording, setIsRecording] = useState(false); // 녹음 상태
  
  // 녹음 관련 상태 추가
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingError, setRecordingError] = useState(null);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);
  
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);

  // 예시: 카테고리별 평가 항목(실제 항목 구조에 맞게 수정)
  const categories = [
    {
      name: '인성',
      items: ['예의', '성실성', '적극성']
    },
    {
      name: '역량',
      items: ['기술력', '문제해결', '커뮤니케이션']
    }
  ];

  // 녹음 시간 포맷팅
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 마이크 권한 요청 및 MediaRecorder 초기화
  const initializeRecording = async () => {
    try {
      setRecordingError(null);
      
      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // MediaRecorder 생성
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordingBlob(blob);
        setRecordedChunks(chunks);
        
        // 녹음 파일 URL 생성 (재생용)
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        
        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      recorder.onerror = (event) => {
        console.error('녹음 오류:', event.error);
        setRecordingError('녹음 중 오류가 발생했습니다.');
        setIsRecording(false);
      };
      
      setMediaRecorder(recorder);
      return true;
    } catch (error) {
      console.error('마이크 권한 오류:', error);
      if (error.name === 'NotAllowedError') {
        setRecordingError('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      } else if (error.name === 'NotFoundError') {
        setRecordingError('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
      } else {
        setRecordingError('녹음 기능을 초기화할 수 없습니다: ' + error.message);
      }
      return false;
    }
  };

  // 녹음 시작
  const startRecording = async () => {
    const initialized = await initializeRecording();
    if (!initialized) return;
    
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      setRecordedChunks([]);
      setRecordingTime(0);
      setRecordingBlob(null);
      setRecordingUrl(null);
      
      mediaRecorder.start(1000); // 1초마다 데이터 수집
      setIsRecording(true);
      
      // 녹음 시간 타이머 시작
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  // 녹음 중지
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      
      // 타이머 정리
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // 녹음 파일 서버 업로드
  const uploadRecording = async () => {
    if (!recordingBlob || !applicationId) {
      console.error('업로드할 녹음 파일이 없거나 지원자 ID가 없습니다.');
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio_file', recordingBlob, `interview_${applicationId}_${Date.now()}.webm`);
      formData.append('application_id', applicationId);
      formData.append('job_post_id', jobPostId || ''); // jobPostId를 직접 사용
      formData.append('company_name', companyName || '');
      formData.append('applicant_name', applicantName || '');
      
      const response = await api.post('/interview-evaluations/upload-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('업로드 진행률:', percentCompleted + '%');
        }
      });
      
      console.log('녹음 파일 업로드 성공:', response.data);
      
      // 성공 메시지를 메모에 추가
      const timestamp = new Date().toLocaleString('ko-KR');
      const successMessage = `[${timestamp}] 면접 녹음 파일이 업로드되었습니다.`;
      onMemoChange(prev => prev + '\n' + successMessage);
      
    } catch (error) {
      console.error('녹음 파일 업로드 실패:', error);
      setRecordingError('녹음 파일 업로드에 실패했습니다: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsUploading(false);
    }
  };

  // 녹음 파일 다운로드
  const downloadRecording = () => {
    if (recordingBlob) {
      const url = URL.createObjectURL(recordingBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview_${applicantName || 'unknown'}_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
    };
  }, [recordingUrl]);

  // 녹음 시작/중지 핸들러
  const handleRecordingToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  // 평가 점수 입력 핸들러
  const handleScoreChange = (category, item, score) => {
    onEvaluationChange(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [item]: score
      }
    }));
  };

  // AI 평가 결과 처리 핸들러
  const handleEvaluationUpdate = (evaluationResult) => {
    if (evaluationResult.auto_memo) {
      setAiMemo(prev => prev + '\n' + evaluationResult.auto_memo);
    }
  };

  // 음성 인식 결과 처리 핸들러
  const handleTranscriptionUpdate = (transcriptionResult) => {
    console.log('음성 인식 결과:', transcriptionResult);
    // 필요시 추가 처리
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* 상단 헤더 - 자동 저장 상태와 녹음 버튼 */}
      <div className="flex items-center justify-between">
        {/* 자동 저장 상태 표시 */}
        {isAutoSaving && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            자동 저장 중...
          </div>
        )}
        
        {/* 녹음 관련 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 녹음 시간 표시 */}
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded">
              <div className="animate-pulse w-2 h-2 bg-red-600 rounded-full"></div>
              <span className="font-mono">{formatRecordingTime(recordingTime)}</span>
            </div>
          )}
          
          {/* 녹음 버튼 */}
          <button
            onClick={handleRecordingToggle}
            disabled={isUploading}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isRecording ? '녹음 중지' : '면접 녹음 시작'}
          >
            {isRecording ? (
              <>
                <div className="animate-pulse">
                  <FiMicOff size={16} />
                </div>
                <span>녹음 중지</span>
              </>
            ) : (
              <>
                <FiMic size={16} />
                <span>녹음 시작</span>
              </>
            )}
          </button>
          
          {/* 녹음 파일 업로드 버튼 */}
          {recordingBlob && !isRecording && (
            <button
              onClick={uploadRecording}
              disabled={isUploading}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                isUploading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              title="녹음 파일 업로드"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>업로드 중...</span>
                </>
              ) : (
                <>
                  <FiDownload size={16} />
                  <span>업로드</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 녹음 오류 메시지 */}
      {recordingError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
          <FiAlertCircle size={16} />
          <span>{recordingError}</span>
          <button
            onClick={() => setRecordingError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* 녹음 파일 재생 (녹음 완료 후) */}
      {recordingUrl && !isRecording && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              녹음 파일 ({formatRecordingTime(recordingTime)})
            </span>
            <button
              onClick={downloadRecording}
              className="text-blue-600 hover:text-blue-800 text-sm"
              title="녹음 파일 다운로드"
            >
              <FiDownload size={14} />
            </button>
          </div>
          <audio controls className="w-full" src={recordingUrl}>
            브라우저가 오디오 재생을 지원하지 않습니다.
          </audio>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-300 dark:border-gray-600">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'questions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('questions')}
        >
          면접 질문
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'analysis' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('analysis')}
        >
          AI 분석
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'checklist' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('checklist')}
        >
          체크리스트
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'guideline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('guideline')}
        >
          가이드라인
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'criteria' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('criteria')}
        >
          평가 기준
        </button>
      </div>
      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'questions' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 질문</div>
            <ul className="mb-4 list-disc list-inside text-sm text-gray-700 dark:text-gray-200">
              {questions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </div>
        )}
        {activeTab === 'analysis' && (
          <div>
            <div className="mb-2 font-bold text-lg">AI 분석</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">AI 분석 중...</span>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {strengthsWeaknesses && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight="bold">강점 및 약점</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <div className="whitespace-pre-wrap text-sm">
                        {strengthsWeaknesses}
                      </div>
                    </AccordionDetails>
                  </Accordion>
                )}

                {interviewGuideline && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight="bold">면접 가이드라인</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <div className="whitespace-pre-wrap text-sm">
                        {interviewGuideline}
                      </div>
                    </AccordionDetails>
                  </Accordion>
                )}

                {evaluationCriteria && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight="bold">평가 기준</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <div className="space-y-4 text-sm">
                        {typeof evaluationCriteria === 'object' ? (
                          <div>
                            {evaluationCriteria.suggested_criteria && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">제안 평가 기준</h4>
                                {evaluationCriteria.suggested_criteria.map((criteria, i) => (
                                  <div key={i} className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <div className="font-medium">{criteria.criterion}</div>
                                    <div className="text-gray-600 dark:text-gray-400">{criteria.description}</div>
                                    <div className="text-xs text-gray-500">최대 점수: {criteria.max_score}점</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {evaluationCriteria.weight_recommendations && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">가중치 권장사항</h4>
                                {evaluationCriteria.weight_recommendations.map((weight, i) => (
                                  <div key={i} className="mb-1">
                                    <span className="font-medium">{weight.criterion}:</span>
                                    <span className="ml-2">{(weight.weight * 100).toFixed(0)}%</span>
                                    <div className="text-xs text-gray-500 ml-4">{weight.reason}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {evaluationCriteria.evaluation_questions && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">평가 질문</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {evaluationCriteria.evaluation_questions.map((question, i) => (
                                    <li key={i} className="text-gray-700 dark:text-gray-300">{question}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {evaluationCriteria.scoring_guidelines && (
                              <div>
                                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">채점 가이드라인</h4>
                                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                  {evaluationCriteria.scoring_guidelines}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">
                            {evaluationCriteria}
                          </div>
                        )}
                      </div>
                    </AccordionDetails>
                  </Accordion>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'checklist' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 체크리스트</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">체크리스트 로딩 중...</span>
              </div>
            ) : interviewChecklist ? (
              <div className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {interviewChecklist || '체크리스트가 없습니다.'}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">체크리스트를 생성할 수 없습니다.</div>
            )}
          </div>
        )}
        {activeTab === 'guideline' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 가이드라인</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">가이드라인 로딩 중...</span>
              </div>
            ) : interviewGuideline ? (
              <div className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {interviewGuideline || '가이드라인이 없습니다.'}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">가이드라인을 생성할 수 없습니다.</div>
            )}
          </div>
        )}
        {activeTab === 'criteria' && (
          <div>
            <div className="mb-2 font-bold text-lg">평가 기준</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">평가 기준 로딩 중...</span>
              </div>
            ) : evaluationCriteria ? (
              <div className="space-y-4 text-sm">
                {typeof evaluationCriteria === 'object' ? (
                  <div>
                    {evaluationCriteria.suggested_criteria && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">제안 평가 기준</h4>
                        {evaluationCriteria.suggested_criteria.map((criteria, i) => (
                          <div key={i} className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="font-medium">{criteria.criterion}</div>
                            <div className="text-gray-600 dark:text-gray-400">{criteria.description}</div>
                            <div className="text-xs text-gray-500">최대 점수: {criteria.max_score}점</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {evaluationCriteria.weight_recommendations && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">가중치 권장사항</h4>
                        {evaluationCriteria.weight_recommendations.map((weight, i) => (
                          <div key={i} className="mb-1">
                            <span className="font-medium">{weight.criterion}:</span>
                            <span className="ml-2">{(weight.weight * 100).toFixed(0)}%</span>
                            <div className="text-xs text-gray-500 ml-4">{weight.reason}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {evaluationCriteria.evaluation_questions && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">평가 질문</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {evaluationCriteria.evaluation_questions.map((question, i) => (
                            <li key={i} className="text-gray-700 dark:text-gray-300">{question}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {evaluationCriteria.scoring_guidelines && (
                      <div>
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">채점 가이드라인</h4>
                        <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {evaluationCriteria.scoring_guidelines}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    {evaluationCriteria || '평가 기준이 없습니다.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">평가 기준을 생성할 수 없습니다.</div>
            )}
          </div>
        )}
      </div>
      {/* 오디오 플레이어 (면접 녹음이 있는 경우) */}
      {audioFile && (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
          <div className="relative">
            <AudioPlayer
              audioFile={audioFile}
              onTranscriptionUpdate={handleTranscriptionUpdate}
              onEvaluationUpdate={handleEvaluationUpdate}
              jobInfo={jobInfo}
              resumeInfo={resumeInfo}
              isRealtimeEvaluation={true}
            />
          </div>
        </div>
      )}
      {/* 평가 항목 (항상 표시) */}
      <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
        <div className="mb-2 font-bold text-lg">평가 항목</div>
        <div className="flex flex-col gap-2">
          {categories.map(cat => (
            <div key={cat.name} className="mb-2">
              <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">{cat.name}</div>
              {cat.items.map(item => (
                <div key={item} className="flex items-center gap-2 mb-1">
                  <span className="w-24 text-sm">{item}</span>
                  <Rating
                    name={`${cat.name}-${item}`}
                    value={evaluation[cat.name]?.[item] || 0}
                    onChange={(event, newValue) => handleScoreChange(cat.name, item, newValue)}
                    max={5}
                    size="medium"
                    disabled={isAutoSaving}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* 메모 입력 */}
      <div>
        <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">면접 메모</h3>
        <textarea
          value={memo}
          onChange={(e) => onMemoChange(e.target.value)}
          className="w-full h-24 p-2 border border-gray-300 dark:border-gray-600 rounded resize-none text-sm"
          placeholder="면접 중 메모를 입력하세요..."
          disabled={isAutoSaving}
        />
        
        {/* AI 자동 메모 표시 */}
        {aiMemo && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-80">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">AI 자동 메모:</div>
            <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {aiMemo}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewPanel;