import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { 
  FiPlay, FiPause, FiSquare, FiCamera, FiMic, 
  FiMicOff, FiVideo, FiVideoOff 
} from 'react-icons/fi';
import { 
  MdOutlineAutoAwesome, MdOutlinePsychology,
  MdOutlineLanguage, MdOutlineGesture,
  MdOutlinePsychologyAlt, MdOutlineWork,
  MdOutlineVerified
} from 'react-icons/md';
import { FaGamepad, FaBrain } from 'react-icons/fa';

function AiInterviewDemo() {
  const { jobPostId, applicantId } = useParams();
  const navigate = useNavigate();
  
  // 데모 모드 확인
  const isDemoMode = applicantId === 'demo';
  
  // 면접 상태
  const [interviewState, setInterviewState] = useState('preparation');
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  
  // 지원자 정보
  const [applicant, setApplicant] = useState(null);
  const [jobPost, setJobPost] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 실시간 평가 메트릭 (시뮬레이션)
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
  
  // 게임 테스트
  const [gameTest, setGameTest] = useState(null);
  const [gameScore, setGameScore] = useState(0);
  
  // 면접 단계
  const interviewSteps = [
    { id: 'preparation', title: '면접 준비', icon: '⚙️' },
    { id: 'camera_mic', title: '카메라/마이크 설정', icon: '📹' },
    { id: 'scenario_questions', title: '시나리오 질문', icon: '🎯' },
    { id: 'real_time_analysis', title: '실시간 분석', icon: '📊' },
    { id: 'game_test', title: '게임형 테스트', icon: '🎮' },
    { id: 'evaluation', title: '평가 완료', icon: '🏆' }
  ];

  // 지원자 및 공고 정보 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isDemoMode) {
          // 데모 모드: 기본 데이터 사용
          setApplicant({
            applicant: {
              name: "데모 지원자",
              email: "demo@example.com"
            }
          });
          
          // 공고 정보 로드 (데모 모드에서도 필요)
          try {
            const jobPostRes = await api.get(`/company/jobposts/${jobPostId}`);
            setJobPost(jobPostRes.data);
          } catch (error) {
            console.warn('공고 정보 로드 실패, 기본값 사용:', error);
            setJobPost({
              title: "백엔드 개발자",
              company: { name: "테스트 회사" }
            });
          }
          
          // 데모용 기본 시나리오 질문
          setScenarioQuestions([
            {
              id: 1,
              scenario: "고객이 갑작스럽게 요구사항을 변경했을 때, 어떻게 대응하시겠습니까?",
              question: "이런 상황에서 본인의 대응 방식을 구체적으로 설명해주세요.",
              category: "situation_handling",
              time_limit: 120
            },
            {
              id: 2,
              scenario: "팀원과 의견이 충돌하는 상황에서, 어떻게 해결하시겠습니까?",
              question: "협업 과정에서 발생할 수 있는 갈등 해결 방법을 설명해주세요.",
              category: "teamwork",
              time_limit: 120
            },
            {
              id: 3,
              scenario: "새로운 기술을 배워야 하는 상황에서, 어떻게 접근하시겠습니까?",
              question: "학습 과정과 적용 방법을 구체적으로 설명해주세요.",
              category: "learning_ability",
              time_limit: 120
            }
          ]);
        } else {
          // 실제 모드: API에서 데이터 로드
          const applicantRes = await api.get(`/applications/${applicantId}`);
          setApplicant(applicantRes.data);
          
          const jobPostRes = await api.get(`/company/jobposts/${jobPostId}`);
          setJobPost(jobPostRes.data);
          
          const questionsRes = await api.post('/ai-interview/scenarios', null, {
            params: { job_post_id: jobPostId, applicant_id: applicantId }
          });
          setScenarioQuestions(questionsRes.data.scenarios || []);
        }
        
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        // 에러 시 기본 데이터 사용
        setApplicant({
          applicant: {
            name: "지원자",
            email: "applicant@example.com"
          }
        });
        setJobPost({
          title: "백엔드 개발자",
          company: { name: "회사" }
        });
        setScenarioQuestions([
          {
            id: 1,
            scenario: "고객이 갑작스럽게 요구사항을 변경했을 때, 어떻게 대응하시겠습니까?",
            question: "이런 상황에서 본인의 대응 방식을 구체적으로 설명해주세요.",
            category: "situation_handling",
            time_limit: 120
          },
          {
            id: 2,
            scenario: "팀원과 의견이 충돌하는 상황에서, 어떻게 해결하시겠습니까?",
            question: "협업 과정에서 발생할 수 있는 갈등 해결 방법을 설명해주세요.",
            category: "teamwork",
            time_limit: 120
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    if (jobPostId) {
      fetchData();
    }
  }, [jobPostId, applicantId, isDemoMode]);

  // 실시간 평가 메트릭 시뮬레이션
  useEffect(() => {
    if (interviewState === 'active') {
      const interval = setInterval(() => {
        setEvaluationMetrics(prev => ({
          language_ability: { 
            score: Math.min(10, prev.language_ability.score + Math.random() * 0.5),
            details: { 
              logic: Math.min(10, prev.language_ability.details.logic + Math.random() * 0.3),
              expression: Math.min(10, prev.language_ability.details.expression + Math.random() * 0.3)
            }
          },
          non_verbal_behavior: { 
            score: Math.min(10, prev.non_verbal_behavior.score + Math.random() * 0.4),
            details: { 
              eye_contact: Math.min(10, prev.non_verbal_behavior.details.eye_contact + Math.random() * 0.2),
              expression: Math.min(10, prev.non_verbal_behavior.details.expression + Math.random() * 0.2),
              posture: Math.min(10, prev.non_verbal_behavior.details.posture + Math.random() * 0.2),
              tone: Math.min(10, prev.non_verbal_behavior.details.tone + Math.random() * 0.2)
            }
          },
          psychological_traits: { 
            score: Math.min(10, prev.psychological_traits.score + Math.random() * 0.3),
            details: { 
              openness: Math.min(10, prev.psychological_traits.details.openness + Math.random() * 0.1),
              conscientiousness: Math.min(10, prev.psychological_traits.details.conscientiousness + Math.random() * 0.1),
              extraversion: Math.min(10, prev.psychological_traits.details.extraversion + Math.random() * 0.1),
              agreeableness: Math.min(10, prev.psychological_traits.details.agreeableness + Math.random() * 0.1),
              neuroticism: Math.min(10, prev.psychological_traits.details.neuroticism + Math.random() * 0.1)
            }
          },
          cognitive_ability: { 
            score: Math.min(10, prev.cognitive_ability.score + Math.random() * 0.4),
            details: { 
              focus: Math.min(10, prev.cognitive_ability.details.focus + Math.random() * 0.2),
              quickness: Math.min(10, prev.cognitive_ability.details.quickness + Math.random() * 0.2),
              memory: Math.min(10, prev.cognitive_ability.details.memory + Math.random() * 0.2)
            }
          },
          job_fit: { 
            score: Math.min(10, prev.job_fit.score + Math.random() * 0.4),
            details: { 
              situation_judgment: Math.min(10, prev.job_fit.details.situation_judgment + Math.random() * 0.2),
              problem_solving: Math.min(10, prev.job_fit.details.problem_solving + Math.random() * 0.2)
            }
          },
          interview_reliability: { 
            score: Math.min(10, prev.interview_reliability.score + Math.random() * 0.3),
            details: { 
              attitude: Math.min(10, prev.interview_reliability.details.attitude + Math.random() * 0.1),
              sincerity: Math.min(10, prev.interview_reliability.details.sincerity + Math.random() * 0.1),
              consistency: Math.min(10, prev.interview_reliability.details.consistency + Math.random() * 0.1)
            }
          }
        }));
      }, 2000); // 2초마다 업데이트
      
      return () => clearInterval(interval);
    }
  }, [interviewState]);

  // 질문 타이머
  useEffect(() => {
    if (interviewState === 'active' && currentStep >= 2 && currentStep < 4) {
      const interval = setInterval(() => {
        setQuestionTimer(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [interviewState, currentStep]);

  // 면접 시작
  const startInterview = () => {
    setInterviewState('active');
    setCurrentStep(2);
    setIsCameraOn(true);
    setIsMicOn(true);
  };

  // 다음 질문
  const nextQuestion = () => {
    if (currentQuestionIndex < scenarioQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionTimer(0);
    } else {
      setCurrentStep(4);
      setGameTest({
        title: "기억력 테스트",
        description: "순서대로 나타나는 숫자를 기억하여 입력하세요.",
        instructions: "화면에 나타나는 숫자를 순서대로 기억하고 입력하세요.",
        type: "memory"
      });
    }
  };

  // 게임 테스트 시작
  const startGameTest = () => {
    setGameScore(0);
    const interval = setInterval(() => {
      setGameScore(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCurrentStep(5);
          setInterviewState('completed');
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 1000);
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
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <MdOutlineAutoAwesome />
              AI 면접 시스템 {isDemoMode && '(데모 모드)'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isDemoMode ? 'AI 면접 시스템 기능 시연 및 테스트' : '실시간 평가 메트릭 기반 자동 면접'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {interviewState === 'preparation' && '준비 중'}
              {interviewState === 'active' && '진행 중'}
              {interviewState === 'completed' && '완료'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* 면접 단계 표시 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">면접 진행 단계</h2>
              <span className="text-sm text-gray-500">단계 {currentStep + 1} / {interviewSteps.length}</span>
            </div>
            <div className="flex items-center space-x-4 overflow-x-auto">
              {interviewSteps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-shrink-0">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    index <= currentStep 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}>
                    <span className="text-lg">{step.icon}</span>
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
            
            {/* 왼쪽: 지원자 정보 및 컨트롤 */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* 지원자 정보 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">지원자 정보</h3>
                {applicant && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {applicant.applicant?.name?.charAt(0) || 'A'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{applicant.applicant?.name || '지원자'}</p>
                        <p className="text-sm text-gray-500">{applicant.applicant?.email || 'email@example.com'}</p>
                        {isDemoMode && (
                          <div className="mt-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            🎯 데모 모드 - 시연용 데이터
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 카메라 뷰 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">카메라 뷰</h3>
                <div className="relative">
                  <div className="w-full h-48 bg-gray-900 rounded-lg flex items-center justify-center">
                    {isCameraOn ? (
                      <div className="text-white text-center">
                        <div className="text-4xl mb-2">📹</div>
                        <p>카메라 활성화됨</p>
                      </div>
                    ) : (
                      <div className="text-white text-center">
                        <div className="text-4xl mb-2">📷</div>
                        <p>카메라 비활성화</p>
                      </div>
                    )}
                  </div>
                  
                  {/* 컨트롤 */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setIsCameraOn(!isCameraOn)}
                      className={`p-3 rounded-full ${
                        isCameraOn 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {isCameraOn ? <FiVideo /> : <FiVideoOff />}
                    </button>
                    <button
                      onClick={() => setIsMicOn(!isMicOn)}
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
                  
                  {interviewState === 'active' && currentStep >= 2 && currentStep < 4 && (
                    <button
                      onClick={nextQuestion}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                      다음 질문
                    </button>
                  )}
                  
                  {currentStep === 4 && (
                    <button
                      onClick={startGameTest}
                      className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-600 transition-colors"
                    >
                      게임 테스트 시작
                    </button>
                  )}
                  
                  {interviewState === 'completed' && (
                    <button
                      onClick={() => navigate(isDemoMode ? `/ai-interview/${jobPostId}` : `/interview-progress/${jobPostId}/ai`)}
                      className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                    >
                      {isDemoMode ? 'AI 면접 관리로 돌아가기' : '면접 목록으로 돌아가기'}
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
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">시나리오 질문</h3>
                  
                  {scenarioQuestions.length > 0 && currentQuestionIndex < scenarioQuestions.length ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          질문 {currentQuestionIndex + 1} / {scenarioQuestions.length}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          ⏱️
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
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">게임형 테스트</h3>
                  
                  {gameTest ? (
                    <div className="space-y-4">
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-800 mb-2">{gameTest.title}</h4>
                        <p className="text-purple-700 mb-3">{gameTest.description}</p>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{gameScore.toFixed(1)}</div>
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
                      <p className="text-gray-500">게임 테스트 준비 중...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 오른쪽: 실시간 평가 메트릭 */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* 실시간 평가 메트릭 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">실시간 평가</h3>
                
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
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">면접 결과</h3>
                  
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

export default AiInterviewDemo; 