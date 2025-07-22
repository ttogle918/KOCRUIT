import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import api from '../../api/api';
import { 
  FiCamera, FiMic, FiMicOff, FiVideo, FiVideoOff, 
  FiPlay, FiPause, FiSquare, FiSettings, FiUser,
  FiClock, FiTarget, FiTrendingUp, FiAward
} from 'react-icons/fi';
import { 
  MdOutlineAutoAwesome, MdOutlinePsychology,
  MdOutlineLanguage, MdOutlineGesture,
  MdOutlinePsychologyAlt, MdOutlineWork,
  MdOutlineVerified
} from 'react-icons/md';
import { 
  FaUsers, FaGamepad, FaBrain, FaEye,
  FaSmile, FaHandPaper, FaMicrophone
} from 'react-icons/fa';

function AiInterviewSystem() {
  const { jobPostId, applicantId } = useParams();
  const navigate = useNavigate();
  
  // 디버깅용 로그
  console.log('🤖 AiInterviewSystem 파라미터:', { jobPostId, applicantId });
  
  // 면접 상태 관리
  const [interviewState, setInterviewState] = useState('preparation'); // preparation, active, completed
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  
  // 지원자 및 공고 정보
  const [applicant, setApplicant] = useState(null);
  const [jobPost, setJobPost] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 실시간 평가 메트릭
  const [evaluationMetrics, setEvaluationMetrics] = useState({
    language_ability: { score: 0, details: { logic: 0, expression: 0 } },
    non_verbal_behavior: { score: 0, details: { eye_contact: 0, expression: 0, posture: 0, tone: 0 } },
    psychological_traits: { score: 0, details: { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 } },
    cognitive_ability: { score: 0, details: { focus: 0, quickness: 0, memory: 0 } },
    job_fit: { score: 0, details: { situation_judgment: 0, problem_solving: 0 } },
    interview_reliability: { score: 0, details: { attitude: 0, sincerity: 0, consistency: 0 } }
  });
  
  // 시나리오 질문
  const [scenarioQuestions, setScenarioQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(0);
  
  // 게임형 테스트
  const [gameTest, setGameTest] = useState(null);
  const [gameScore, setGameScore] = useState(0);
  
  // WebSocket 연결
  const [wsConnection, setWsConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // 오디오/비디오 스트림
  const [mediaStream, setMediaStream] = useState(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  
  // 면접 단계별 설정
  const interviewSteps = [
    { id: 'preparation', title: '면접 준비', icon: FiSettings },
    { id: 'camera_mic', title: '카메라/마이크 설정', icon: FiCamera },
    { id: 'scenario_questions', title: '시나리오 질문', icon: FiTarget },
    { id: 'real_time_analysis', title: '실시간 분석', icon: FiTrendingUp },
    { id: 'game_test', title: '게임형 테스트', icon: FaGamepad },
    { id: 'evaluation', title: '평가 완료', icon: FiAward }
  ];

  // 지원자 및 공고 정보 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 지원자 정보 로드
        const applicantRes = await api.get(`/applications/${applicantId}`);
        setApplicant(applicantRes.data);
        
        // 공고 정보 로드
        const jobPostRes = await api.get(`/company/jobposts/${jobPostId}`);
        setJobPost(jobPostRes.data);
        
        // AI 면접 시나리오 질문 로드 (DB에서 미리 생성된 질문 조회)
        try {
          // 먼저 DB에서 기존 AI 면접 질문 조회 (job_post_id 기반)
          const existingQuestionsRes = await api.get(`/interview-questions/job/${jobPostId}/ai-questions`);
          if (existingQuestionsRes.data.total_count > 0) {
            // 질문을 순서대로 조합 (공통 -> 직무별 -> 게임)
            const questionOrder = [];
            
            // 1. 공통 질문 4개
            const commonQuestions = existingQuestionsRes.data.questions.common || [];
            for (let i = 0; i < Math.min(4, commonQuestions.length); i++) {
              questionOrder.push({
                id: i + 1,
                type: "general",
                question: commonQuestions[i].question_text,
                category: commonQuestions[i].category
              });
            }
            
            // 2. 게임 테스트 1개
            const gameQuestions = existingQuestionsRes.data.questions.game_test || [];
            if (gameQuestions.length > 0) {
              questionOrder.push({
                id: 5,
                type: "game_test",
                name: gameQuestions[0].question_text,
                category: "game_test"
              });
            }
            
            // 3. 나머지 공통 질문 3개
            for (let i = 4; i < Math.min(7, commonQuestions.length); i++) {
              questionOrder.push({
                id: i + 2,
                type: "general",
                question: commonQuestions[i].question_text,
                category: commonQuestions[i].category
              });
            }
            
            // 4. 직무별 AI 질문 3개
            const jobQuestions = existingQuestionsRes.data.questions.job_specific || [];
            for (let i = 0; i < Math.min(3, jobQuestions.length); i++) {
              questionOrder.push({
                id: i + 9,
                type: "ai_job_specific",
                question: jobQuestions[i].question_text,
                category: jobQuestions[i].category
              });
            }
            
            // 질문 텍스트만 추출하여 설정
            const allQuestions = questionOrder.map(q => q.question);
            setScenarioQuestions(allQuestions);
            console.log(`✅ AI 면접 질문 ${allQuestions.length}개 로드 (공고 ${jobPostId})`);
            console.log('질문 순서:', questionOrder.map(q => `${q.id}. ${q.type}: ${q.question}`));
          } else {
            // 기존 질문이 없으면 실시간 생성 (fallback)
            console.log('기존 AI 면접 질문 없음, 실시간 생성합니다.');
            const questionsRes = await api.post('/ai-interview-questions/scenarios', {
              job_post_id: jobPostId,
              applicant_id: applicantId
            });
            setScenarioQuestions(questionsRes.data.scenarios || []);
          }
        } catch (error) {
          console.error('AI 면접 질문 로드 실패:', error);
          // 에러 시 기본 질문 사용
          setScenarioQuestions([
            '자기소개를 해주세요.',
            '본인의 장단점은 무엇인가요?',
            '실패 경험을 말해주시고, 어떻게 극복했나요?'
          ]);
        }
        
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (jobPostId && applicantId) {
      fetchData();
    }
  }, [jobPostId, applicantId]);

  // WebSocket 연결 설정
  useEffect(() => {
    if (interviewState === 'active' && !wsConnection) {
      const ws = new WebSocket(`ws://localhost:8000/ws/ai-interview/${jobPostId}/${applicantId}`);
      
      ws.onopen = () => {
        setConnectionStatus('connected');
        console.log('AI 면접 WebSocket 연결됨');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      ws.onclose = () => {
        setConnectionStatus('disconnected');
        console.log('AI 면접 WebSocket 연결 해제됨');
      };
      
      ws.onerror = (error) => {
        setConnectionStatus('error');
        console.error('WebSocket 오류:', error);
      };
      
      setWsConnection(ws);
      
      return () => {
        ws.close();
      };
    }
  }, [interviewState, jobPostId, applicantId]);

  // WebSocket 메시지 처리
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'evaluation_update':
        setEvaluationMetrics(prev => ({
          ...prev,
          [data.metric]: {
            ...prev[data.metric],
            score: data.score,
            details: { ...prev[data.metric].details, ...data.details }
          }
        }));
        break;
      
      case 'question_timer':
        setQuestionTimer(data.time);
        break;
      
      case 'game_test_start':
        setGameTest(data.game);
        break;
      
      case 'game_score_update':
        setGameScore(data.score);
        break;
      
      case 'interview_complete':
        setInterviewState('completed');
        break;
      
      default:
        console.log('알 수 없는 메시지 타입:', data.type);
    }
  };

  // 미디어 스트림 설정
  const setupMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setMediaStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('미디어 스트림 설정 실패:', error);
      alert('카메라/마이크 접근 권한이 필요합니다.');
    }
  };

  // 면접 시작
  const startInterview = async () => {
    try {
      const stream = await setupMediaStream();
      setIsCameraOn(true);
      setIsMicOn(true);
      setInterviewState('active');
      setCurrentStep(2); // 시나리오 질문 단계로 이동
      
      // WebSocket으로 면접 시작 신호 전송
      if (wsConnection) {
        wsConnection.send(JSON.stringify({
          type: 'interview_start',
          job_post_id: jobPostId,
          applicant_id: applicantId
        }));
      }
    } catch (error) {
      console.error('면접 시작 실패:', error);
    }
  };

  // 카메라/마이크 토글
  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // 다음 질문으로 이동
  const nextQuestion = () => {
    if (currentQuestionIndex < scenarioQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionTimer(0);
    } else {
      // 모든 질문 완료, 게임 테스트로 이동
      setCurrentStep(4);
    }
  };

  // 게임 테스트 시작
  const startGameTest = () => {
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'start_game_test',
        job_post_id: jobPostId,
        applicant_id: applicantId
      }));
    }
  };

  // 면접 완료
  const completeInterview = () => {
    setInterviewState('completed');
    setCurrentStep(5);
    
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'interview_complete',
        job_post_id: jobPostId,
        applicant_id: applicantId
      }));
    }
  };

  // 총점 계산
  const calculateTotalScore = () => {
    const scores = Object.values(evaluationMetrics).map(metric => metric.score);
    const total = scores.reduce((sum, score) => sum + score, 0);
    return (total / scores.length).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">AI 면접 시스템 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ViewPostSidebar jobPost={jobPost} />
      
      {/* AI 면접 헤더 */}
      <div className="fixed top-16 left-90 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <MdOutlineAutoAwesome />
              AI 면접 시스템
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              실시간 평가 메트릭 기반 자동 면접
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 연결 상태 */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {connectionStatus === 'connected' ? '연결됨' : '연결 안됨'}
            </div>
            
            {/* 면접 상태 */}
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {interviewState === 'preparation' && '준비 중'}
              {interviewState === 'active' && '진행 중'}
              {interviewState === 'completed' && '완료'}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-32 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* 면접 단계 표시 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">면접 진행 단계</h2>
              <span className="text-sm text-gray-500">단계 {currentStep + 1} / {interviewSteps.length}</span>
            </div>
            <div className="flex items-center space-x-4">
              {interviewSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    index <= currentStep 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}>
                    <step.icon size={20} />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    index <= currentStep ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < interviewSteps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 왼쪽: 지원자 정보 및 카메라 */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* 지원자 정보 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FiUser />
                  지원자 정보
                </h3>
                {applicant && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {applicant.name?.charAt(0) || 'A'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{applicant.name}</p>
                        <p className="text-sm text-gray-500">{applicant.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">나이:</span>
                        <span className="ml-2 font-medium">{applicant.age || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">학력:</span>
                        <span className="ml-2 font-medium">{applicant.education || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 카메라 뷰 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FiCamera />
                  카메라 뷰
                </h3>
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-48 bg-gray-900 rounded-lg object-cover"
                  />
                  {!isCameraOn && (
                    <div className="absolute inset-0 bg-gray-900 rounded-lg flex items-center justify-center">
                      <div className="text-center text-white">
                        <FiVideoOff size={48} className="mx-auto mb-2" />
                        <p>카메라가 꺼져있습니다</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 카메라/마이크 컨트롤 */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={toggleCamera}
                      className={`p-3 rounded-full ${
                        isCameraOn 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {isCameraOn ? <FiVideo /> : <FiVideoOff />}
                    </button>
                    <button
                      onClick={toggleMic}
                      className={`p-3 rounded-full ${
                        isMicOn 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {isMicOn ? <FiMic /> : <FiMicOff />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 면접 컨트롤 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">면접 컨트롤</h3>
                <div className="space-y-3">
                  {interviewState === 'preparation' && (
                    <button
                      onClick={startInterview}
                      className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <FiPlay />
                      면접 시작
                    </button>
                  )}
                  
                  {interviewState === 'active' && (
                    <>
                      <button
                        onClick={nextQuestion}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                      >
                        다음 질문
                      </button>
                      <button
                        onClick={completeInterview}
                        className="w-full bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors"
                      >
                        면접 종료
                      </button>
                    </>
                  )}
                  
                  {interviewState === 'completed' && (
                    <button
                      onClick={() => navigate(`/interview-progress/${jobPostId}/ai`)}
                      className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                    >
                      면접 목록으로 돌아가기
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 중앙: 시나리오 질문 및 게임 테스트 */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* 시나리오 질문 */}
              {currentStep >= 2 && currentStep < 4 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiTarget />
                    시나리오 질문
                  </h3>
                  
                  {scenarioQuestions.length > 0 && currentQuestionIndex < scenarioQuestions.length ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          질문 {currentQuestionIndex + 1} / {scenarioQuestions.length}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FiClock />
                          <span>{questionTimer}초</span>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">시나리오:</h4>
                        <p className="text-blue-700 mb-3">
                          {scenarioQuestions[currentQuestionIndex]?.scenario}
                        </p>
                        <h4 className="font-medium text-blue-800 mb-2">질문:</h4>
                        <p className="text-blue-700">
                          {scenarioQuestions[currentQuestionIndex]?.question}
                        </p>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>💡 <strong>답변 가이드:</strong></p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>구체적인 예시를 들어 설명하세요</li>
                          <li>본인의 경험과 연결지어 답변하세요</li>
                          <li>논리적으로 구조화된 답변을 시도하세요</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">시나리오 질문을 불러오는 중...</p>
                    </div>
                  )}
                </div>
              )}

              {/* 게임형 테스트 */}
              {currentStep >= 4 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaGamepad />
                    게임형 테스트
                  </h3>
                  
                  {gameTest ? (
                    <div className="space-y-4">
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-800 mb-2">{gameTest.title}</h4>
                        <p className="text-purple-700 mb-3">{gameTest.description}</p>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{gameScore}</div>
                          <p className="text-sm text-purple-600">점수</p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>🎮 <strong>게임 방법:</strong></p>
                        <p className="mt-2">{gameTest.instructions}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <button
                        onClick={startGameTest}
                        className="bg-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-600 transition-colors"
                      >
                        게임 테스트 시작
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 오른쪽: 실시간 평가 메트릭 */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* 실시간 평가 메트릭 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FiTrendingUp />
                  실시간 평가
                </h3>
                
                <div className="space-y-4">
                  {/* 언어능력 */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MdOutlineLanguage className="text-blue-500" />
                        <span className="font-medium text-gray-800">언어능력</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {evaluationMetrics.language_ability.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(evaluationMetrics.language_ability.score / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      논리성: {evaluationMetrics.language_ability.details.logic.toFixed(1)} | 
                      표현력: {evaluationMetrics.language_ability.details.expression.toFixed(1)}
                    </div>
                  </div>

                  {/* 비언어행동 */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MdOutlineGesture className="text-green-500" />
                        <span className="font-medium text-gray-800">비언어행동</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {evaluationMetrics.non_verbal_behavior.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(evaluationMetrics.non_verbal_behavior.score / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      시선: {evaluationMetrics.non_verbal_behavior.details.eye_contact.toFixed(1)} | 
                      표정: {evaluationMetrics.non_verbal_behavior.details.expression.toFixed(1)}
                    </div>
                  </div>

                  {/* 심리성향 */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MdOutlinePsychology className="text-purple-500" />
                        <span className="font-medium text-gray-800">심리성향</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">
                        {evaluationMetrics.psychological_traits.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(evaluationMetrics.psychological_traits.score / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Big5 기반 성향 분석
                    </div>
                  </div>

                  {/* 인지능력 */}
                  <div className="border-l-4 border-orange-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FaBrain className="text-orange-500" />
                        <span className="font-medium text-gray-800">인지능력</span>
                      </div>
                      <span className="text-lg font-bold text-orange-600">
                        {evaluationMetrics.cognitive_ability.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(evaluationMetrics.cognitive_ability.score / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      집중력: {evaluationMetrics.cognitive_ability.details.focus.toFixed(1)} | 
                      순발력: {evaluationMetrics.cognitive_ability.details.quickness.toFixed(1)}
                    </div>
                  </div>

                  {/* 직무적합도 */}
                  <div className="border-l-4 border-red-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MdOutlineWork className="text-red-500" />
                        <span className="font-medium text-gray-800">직무적합도</span>
                      </div>
                      <span className="text-lg font-bold text-red-600">
                        {evaluationMetrics.job_fit.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(evaluationMetrics.job_fit.score / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      상황판단: {evaluationMetrics.job_fit.details.situation_judgment.toFixed(1)} | 
                      문제해결: {evaluationMetrics.job_fit.details.problem_solving.toFixed(1)}
                    </div>
                  </div>

                  {/* 면접신뢰도 */}
                  <div className="border-l-4 border-indigo-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MdOutlineVerified className="text-indigo-500" />
                        <span className="font-medium text-gray-800">면접신뢰도</span>
                      </div>
                      <span className="text-lg font-bold text-indigo-600">
                        {evaluationMetrics.interview_reliability.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(evaluationMetrics.interview_reliability.score / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      태도: {evaluationMetrics.interview_reliability.details.attitude.toFixed(1)} | 
                      진정성: {evaluationMetrics.interview_reliability.details.sincerity.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* 총점 */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-800">총점</span>
                    <span className="text-2xl font-bold text-green-600">
                      {calculateTotalScore()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(parseFloat(calculateTotalScore()) / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* 면접 완료 시 결과 요약 */}
              {interviewState === 'completed' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiAward />
                    면접 결과
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="text-center py-4">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {calculateTotalScore()}
                      </div>
                      <p className="text-sm text-gray-600">최종 점수</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="text-blue-600 font-medium">언어능력</span>
                        <div className="text-lg font-bold text-blue-700">
                          {evaluationMetrics.language_ability.score.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <span className="text-green-600 font-medium">비언어행동</span>
                        <div className="text-lg font-bold text-green-700">
                          {evaluationMetrics.non_verbal_behavior.score.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-purple-50 p-2 rounded">
                        <span className="text-purple-600 font-medium">심리성향</span>
                        <div className="text-lg font-bold text-purple-700">
                          {evaluationMetrics.psychological_traits.score.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded">
                        <span className="text-orange-600 font-medium">인지능력</span>
                        <div className="text-lg font-bold text-orange-700">
                          {evaluationMetrics.cognitive_ability.score.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-red-50 p-2 rounded">
                        <span className="text-red-600 font-medium">직무적합도</span>
                        <div className="text-lg font-bold text-red-700">
                          {evaluationMetrics.job_fit.score.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded">
                        <span className="text-indigo-600 font-medium">면접신뢰도</span>
                        <div className="text-lg font-bold text-indigo-700">
                          {evaluationMetrics.interview_reliability.score.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiInterviewSystem; 