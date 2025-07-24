import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import api from '../../api/api';
import AiInterviewApi from '../../api/aiInterviewApi';
import { 
  FiCamera, FiMic, FiMicOff, FiVideo, FiVideoOff, 
  FiPlay, FiPause, FiSquare, FiSettings, FiUser,
  FiClock, FiTarget, FiTrendingUp, FiAward, FiFolder
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
import { 
  convertDriveUrlToDirect, 
  extractVideoIdFromUrl, 
  extractFolderIdFromUrl,
  getDriveItemType,
  getVideosFromSharedFolder,
  formatFileSize,
  formatDate
} from '../../utils/googleDrive';

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
  
  // 동영상 재생 관련 상태
  const [videoFile, setVideoFile] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  // 질문-답변 스크립트 상태
  const [questionScripts, setQuestionScripts] = useState([]);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [showScripts, setShowScripts] = useState(true);
  
  // 채점기준 상태
  const [showScoringCriteria, setShowScoringCriteria] = useState(false);
  const [scoringCriteria, setScoringCriteria] = useState({
    language_ability: {
      logic: { excellent: 90, good: 70, poor: 50, description: "논리적 사고와 체계적 설명 능력" },
      expression: { excellent: 90, good: 70, poor: 50, description: "명확하고 효과적인 의사전달 능력" }
    },
    non_verbal_behavior: {
      eye_contact: { excellent: 90, good: 70, poor: 50, description: "적절한 시선 접촉과 자신감" },
      expression: { excellent: 90, good: 70, poor: 50, description: "자연스러운 표정과 감정 표현" },
      posture: { excellent: 90, good: 70, poor: 50, description: "바른 자세와 전문적인 태도" },
      tone: { excellent: 90, good: 70, poor: 50, description: "적절한 음성 톤과 속도" }
    },
    psychological_traits: {
      openness: { excellent: 90, good: 70, poor: 50, description: "새로운 경험에 대한 개방성" },
      conscientiousness: { excellent: 90, good: 70, poor: 50, description: "책임감과 체계적 접근" },
      extraversion: { excellent: 90, good: 70, poor: 50, description: "적극적 소통과 사회성" },
      agreeableness: { excellent: 90, good: 70, poor: 50, description: "협력적 태도와 공감 능력" },
      neuroticism: { excellent: 90, good: 70, poor: 50, description: "스트레스 관리와 감정 조절" }
    },
    cognitive_ability: {
      focus: { excellent: 90, good: 70, poor: 50, description: "집중력과 주의력 유지" },
      quickness: { excellent: 90, good: 70, poor: 50, description: "빠른 사고와 반응 속도" },
      memory: { excellent: 90, good: 70, poor: 50, description: "기억력과 정보 처리 능력" }
    },
    job_fit: {
      situation_judgment: { excellent: 90, good: 70, poor: 50, description: "상황 판단과 의사결정 능력" },
      problem_solving: { excellent: 90, good: 70, poor: 50, description: "문제 해결과 창의적 사고" }
    },
    interview_reliability: {
      attitude: { excellent: 90, good: 70, poor: 50, description: "진지한 태도와 준비도" },
      sincerity: { excellent: 90, good: 70, poor: 50, description: "진정성과 신뢰성" },
      consistency: { excellent: 90, good: 70, poor: 50, description: "일관성 있는 답변과 행동" }
    }
  });
  
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
            // 질문-답변 스크립트 생성
            generateQuestionScripts(questionOrder);
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

  // 질문-답변 로그 fetch 및 상태 세팅
  useEffect(() => {
    const fetchQuestionLogs = async () => {
      if (!applicantId) return;
      try {
        // AI 면접 로그만 가져오기
        const logs = await AiInterviewApi.getInterviewQuestionLogsByApplication(applicantId, 'AI_INTERVIEW');
        if (logs && logs.length > 0) {
          setQuestionScripts(
            logs.map((log, idx) => ({
              id: idx + 1,
              question: log.question_text,
              category: log.category || 'general',
              answer: log.answer_text || '',
              answer_audio_url: log.answer_audio_url,
              answer_video_url: log.answer_video_url,
              timestamp: log.created_at,
              evaluation: null
            }))
          );
        }
      } catch (error) {
        console.error('AI 면접 질문+답변 로그 fetch 실패:', error);
      }
    };
    fetchQuestionLogs();
  }, [applicantId]);

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

  // 동영상 파일 업로드 처리
  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(URL.createObjectURL(file));
      setVideoDuration(0);
      setVideoProgress(0);
    }
  };

  // 동영상 재생/일시정지
  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  // 동영상 진행률 업데이트
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
    }
  };

  // 동영상 메타데이터 로드
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  // 동영상 재생 완료
  const handleVideoEnded = () => {
    setIsVideoPlaying(false);
    setVideoProgress(0);
  };

  // 질문-답변 스크립트 생성
  const generateQuestionScripts = (questions) => {
    const scripts = questions.map((question, index) => ({
      id: index + 1,
      question: question.question_text || question.scenario || `질문 ${index + 1}`,
      category: question.category || 'general',
      answer: '', // 실제 답변은 나중에 입력
      timestamp: null,
      evaluation: null
    }));
    setQuestionScripts(scripts);
  };

  // 답변 입력 처리
  const handleAnswerInput = (scriptId, answer) => {
    setQuestionScripts(prev => prev.map(script => 
      script.id === scriptId 
        ? { ...script, answer, timestamp: new Date().toISOString() }
        : script
    ));
  };

  // 스크립트 토글
  const toggleScripts = () => {
    setShowScripts(!showScripts);
  };

  // 채점기준 토글
  const toggleScoringCriteria = () => {
    setShowScoringCriteria(!showScoringCriteria);
  };

  // Google Drive 연동 상태
  const [googleDriveEnabled, setGoogleDriveEnabled] = useState(false);
  const [driveVideoUrl, setDriveVideoUrl] = useState('');
  const [driveVideoId, setDriveVideoId] = useState('');
  
  // 디렉토리 공유 관련 상태
  const [folderVideos, setFolderVideos] = useState([]);
  const [showFolderVideos, setShowFolderVideos] = useState(false);
  const [selectedVideoFromFolder, setSelectedVideoFromFolder] = useState(null);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  
  // Google Drive API 키 (실제 환경에서는 환경변수로 관리)
  const GOOGLE_DRIVE_API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '';

  // Google Drive 동영상 URL 처리
  const handleDriveVideoUrl = (url) => {
    const itemType = getDriveItemType(url);
    
    if (itemType === 'file') {
      // 개별 파일 처리
      const videoId = extractVideoIdFromUrl(url);
      if (videoId) {
        const directUrl = `https://drive.google.com/uc?export=download&id=${videoId}`;
        setDriveVideoUrl(directUrl);
        setDriveVideoId(videoId);
        setVideoFile(directUrl);
        setShowFolderVideos(false);
      }
    } else if (itemType === 'folder') {
      // 폴더 처리
      handleFolderShare(url);
    } else {
      alert('지원하지 않는 Google Drive 링크 형식입니다.');
    }
  };

  // 폴더 공유 처리
  const handleFolderShare = async (folderUrl) => {
    try {
      setIsLoadingFolder(true);
      
      // API 키가 없는 경우 테스트 데이터 사용
      if (!GOOGLE_DRIVE_API_KEY) {
        console.log('Google Drive API 키가 없어 테스트 데이터를 사용합니다.');
        
        // 테스트용 동영상 목록
        const testVideos = [
          {
            id: 'test_video_1',
            name: '면접 동영상 1.mp4',
            size: 52428800, // 50MB
            createdTime: '2024-01-15T10:30:00Z',
            mimeType: 'video/mp4'
          },
          {
            id: 'test_video_2',
            name: '면접 동영상 2.mp4',
            size: 78643200, // 75MB
            createdTime: '2024-01-16T14:20:00Z',
            mimeType: 'video/mp4'
          },
          {
            id: 'test_video_3',
            name: '면접 동영상 3.mp4',
            size: 104857600, // 100MB
            createdTime: '2024-01-17T09:15:00Z',
            mimeType: 'video/mp4'
          }
        ];
        
        setFolderVideos(testVideos);
        setShowFolderVideos(true);
        setSelectedVideoFromFolder(null);
        return;
      }
      
      const videos = await getVideosFromSharedFolder(folderUrl, GOOGLE_DRIVE_API_KEY);
      
      if (videos.length === 0) {
        alert('폴더에 동영상 파일이 없습니다.');
        return;
      }
      
      setFolderVideos(videos);
      setShowFolderVideos(true);
      setSelectedVideoFromFolder(null);
    } catch (error) {
      console.error('폴더 처리 오류:', error);
      alert('폴더를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingFolder(false);
    }
  };

  // 폴더에서 동영상 선택
  const selectVideoFromFolder = (video) => {
    let directUrl;
    
    // 테스트 동영상인 경우 샘플 동영상 URL 사용
    if (video.id.startsWith('test_video_')) {
      directUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
    } else {
      // 실제 Google Drive 동영상
      directUrl = `https://drive.google.com/uc?export=download&id=${video.id}`;
    }
    
    setSelectedVideoFromFolder(video);
    setVideoFile(directUrl);
    setDriveVideoId(video.id);
    setShowFolderVideos(false);
  };

  // 폴더 동영상 목록 닫기
  const closeFolderVideos = () => {
    setShowFolderVideos(false);
    setFolderVideos([]);
    setSelectedVideoFromFolder(null);
  };

  // Google Drive 파일 선택 (시뮬레이션)
  const selectDriveVideo = () => {
    // 테스트용 Google Drive 링크들
    const testLinks = [
      {
        name: "테스트 동영상 1 (개별 파일)",
        url: "https://drive.google.com/file/d/1ABC123DEF456/view?usp=sharing",
        type: "file"
      },
      {
        name: "테스트 폴더 (여러 동영상)",
        url: "https://drive.google.com/drive/folders/1XYZ789GHI012?usp=sharing",
        type: "folder"
      }
    ];
    
    const selectedLink = prompt(
      `Google Drive 공유 링크를 입력하세요 (파일 또는 폴더):\n\n` +
      `테스트용 링크:\n` +
      testLinks.map((link, index) => `${index + 1}. ${link.name}: ${link.url}`).join('\n')
    );
    
    if (selectedLink) {
      // 테스트 링크 번호로 선택한 경우
      const testIndex = parseInt(selectedLink) - 1;
      if (testIndex >= 0 && testIndex < testLinks.length) {
        handleDriveVideoUrl(testLinks[testIndex].url);
      } else {
        // 직접 입력한 링크
        handleDriveVideoUrl(selectedLink);
      }
    }
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

      {/* 메인 콘텐츠 - 사이드바에 가려지지 않도록 여백 추가 */}
      <div className="pt-32 pb-8 px-6 ml-90">
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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* 왼쪽: 지원자 정보 및 동영상 */}
            <div className="xl:col-span-1 space-y-6">
              
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
                        <p className="font-medium text-gray-900">{applicant.email || 'hong41@example.com'}</p>
                        <p className="text-sm text-gray-500">경력: N/A</p>
                        <p className="text-sm text-gray-500">학력: N/A</p>
                      </div>
                    </div>
                      </div>
                )}
                      </div>

              {/* 동영상 뷰 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiVideo />
                    면접 동영상
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectDriveVideo}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      Drive 연동
                    </button>
                    <button
                      onClick={() => document.getElementById('video-upload').click()}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      로컬 업로드
                    </button>
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    </div>
                </div>

                {/* 폴더 동영상 선택 모달 */}
                {showFolderVideos && (
                  <div className="mb-4 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-800 flex items-center gap-2">
                        <FiFolder />
                        폴더 내 동영상 선택
                      </h4>
                      <button
                        onClick={closeFolderVideos}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {isLoadingFolder ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">폴더를 불러오는 중...</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {folderVideos.map((video) => (
                          <div
                            key={video.id}
                            onClick={() => selectVideoFromFolder(video)}
                            className="flex items-center justify-between p-3 bg-white rounded border cursor-pointer hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 truncate">{video.name}</p>
                              <div className="flex gap-4 text-xs text-gray-500 mt-1">
                                <span>{formatFileSize(video.size)}</span>
                                <span>{formatDate(video.createdTime)}</span>
                              </div>
                            </div>
                            <FiPlay className="text-blue-500" />
                          </div>
                        ))}
                  </div>
                )}
              </div>
                )}
                
                <div className="relative bg-black rounded-lg overflow-hidden">
                  {videoFile ? (
                    <>
                  <video
                    ref={videoRef}

                        src={videoFile}
                        className="w-full h-64 object-cover"
                        onTimeUpdate={handleVideoTimeUpdate}
                        onLoadedMetadata={handleVideoLoadedMetadata}
                        onEnded={handleVideoEnded}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={toggleVideoPlay}
                          className="bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70"
                        >
                          {isVideoPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
                        </button>
                      </div>
                      {/* 진행률 바 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                        <div className="w-full bg-gray-600 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all"
                            style={{ width: `${videoProgress}%` }}
                          ></div>
                        </div>
                      </div>
                      {/* 동영상 소스 표시 */}
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {driveVideoId ? 'Google Drive' : '로컬 파일'}
                      </div>
                      
                      {/* 선택된 동영상 정보 */}
                      {selectedVideoFromFolder && (
                        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          {selectedVideoFromFolder.name}
                    </div>
                  )}
                    </>
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <FiVideo size={48} className="mx-auto mb-2" />
                        <p>동영상을 업로드하거나 Drive에서 연동하세요</p>
                        <div className="mt-2 text-xs text-gray-500">
                          <p>• Google Drive: 공유 링크로 연동</p>
                          <p>• 로컬 파일: 직접 업로드</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                  
                  {/* 카메라/마이크 컨트롤 */}
                <div className="mt-4 flex gap-2">
                    <button
                      onClick={toggleCamera}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                        isCameraOn 
                          ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                    {isCameraOn ? <FiVideo /> : <FiVideoOff />} 카메라
                    </button>
                    <button
                      onClick={toggleMic}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                        isMicOn 
                          ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                    {isMicOn ? <FiMic /> : <FiMicOff />} 마이크
                    </button>
                  </div>
                </div>
                
                {/* 카메라/마이크 컨트롤 */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={toggleCamera}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                      isCameraOn 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isCameraOn ? <FiVideo /> : <FiVideoOff />} 카메라
                  </button>
                  <button
                    onClick={toggleMic}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                      isMicOn 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isMicOn ? <FiMic /> : <FiMicOff />} 마이크
                  </button>
                </div>
              </div>
            </div>

            {/* 중앙: 질문-답변 스크립트 */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiTarget />
                    질문-답변 스크립트
                  </h3>
                  <button
                    onClick={toggleScripts}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    {showScripts ? '숨기기' : '보기'}
                  </button>
                </div>
                
                {showScripts && questionScripts.length > 0 && (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {questionScripts.map((script, index) => (
                      <div key={script.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-blue-600">질문 {script.id}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {script.category}
                          </span>
                        </div>
                        <p className="text-gray-800 mb-3 font-medium">{script.question}</p>
                        <textarea
                          value={script.answer}
                          onChange={(e) => handleAnswerInput(script.id, e.target.value)}
                          placeholder="답변을 입력하세요..."
                          className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                          rows="3"
                        />
                        {script.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            답변 시간: {new Date(script.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {(!showScripts || questionScripts.length === 0) && (
                  <div className="text-center text-gray-500 py-8">
                    <FiTarget size={48} className="mx-auto mb-2" />
                    <p>질문-답변 스크립트가 없습니다</p>
                  </div>
                )}
              </div>

            {/* 중앙: 질문-답변 스크립트 */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiTarget />
                    질문-답변 스크립트
                  </h3>
                  <button
                    onClick={toggleScripts}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    {showScripts ? '숨기기' : '보기'}
                  </button>
                </div>
                
                {showScripts && questionScripts.length > 0 && (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {questionScripts.map((script, index) => (
                      <div key={script.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-blue-600">질문 {script.id}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {script.category}
                          </span>
                        </div>
                        <p className="text-gray-800 mb-3 font-medium">{script.question}</p>
                        {script.answer ? (
                          <div className="mb-2">
                            <span className="text-green-700 font-semibold">답변:</span>
                            <p className="text-gray-700 mt-1 whitespace-pre-line">{script.answer}</p>
                          </div>
                        ) : (
                          <div className="mb-2 text-gray-400 italic">아직 답변이 없습니다.</div>
                        )}
                        {/* 오디오 답변 */}
                        {script.answer_audio_url && (
                          <audio controls src={script.answer_audio_url} className="mt-2 w-full">
                            오디오 답변을 지원하지 않는 브라우저입니다.
                          </audio>
                        )}
                        {/* 비디오 답변 */}
                        {script.answer_video_url && (
                          <video controls src={script.answer_video_url} className="mt-2 w-full h-40">
                            비디오 답변을 지원하지 않는 브라우저입니다.
                          </video>
                        )}
                        {script.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            답변 시간: {new Date(script.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {(!showScripts || questionScripts.length === 0) && (
                  <div className="text-center text-gray-500 py-8">
                    <FiTarget size={48} className="mx-auto mb-2" />
                    <p>질문-답변 스크립트가 없습니다</p>
                  </div>
                )}
              </div>

              {/* 면접 컨트롤 */}
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
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

            {/* 오른쪽: 실시간 평가 및 채점기준 */}
            <div className="xl:col-span-1 space-y-6">
              
              {/* 실시간 평가 */}
                <div className="bg-white rounded-lg shadow-md p-6">

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiTrendingUp />
                    실시간 평가
                  </h3>
                      <button
                    onClick={toggleScoringCriteria}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                      >
                    채점기준
                      </button>
            </div>

                
                <div className="space-y-4">
                  {Object.entries(evaluationMetrics).map(([category, data]) => (
                    <div key={category} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">

                        <span className="text-sm font-medium text-gray-700">
                          {category === 'language_ability' && '언어능력'}
                          {category === 'non_verbal_behavior' && '비언어행동'}
                          {category === 'psychological_traits' && '심리성향'}
                          {category === 'cognitive_ability' && '인지능력'}
                          {category === 'job_fit' && '직무적합도'}
                          {category === 'interview_reliability' && '면접신뢰도'}
                      </span>
                        <span className="text-sm font-bold text-blue-600">{data.score.toFixed(1)}점</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${data.score}%` }}
                      ></div>
                    </div>
                    </div>
                  ))}
                    </div>
                  </div>


              {/* 채점기준 상세 */}
              {showScoringCriteria && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiAward />
                    채점기준 상세
                  </h3>
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {Object.entries(scoringCriteria).map(([category, criteria]) => (
                      <div key={category} className="border border-gray-200 rounded-lg p-3">
                        <h4 className="font-medium text-gray-800 mb-2">
                          {category === 'language_ability' && '언어능력'}
                          {category === 'non_verbal_behavior' && '비언어행동'}
                          {category === 'psychological_traits' && '심리성향'}
                          {category === 'cognitive_ability' && '인지능력'}
                          {category === 'job_fit' && '직무적합도'}
                          {category === 'interview_reliability' && '면접신뢰도'}
                        </h4>
                        {Object.entries(criteria).map(([subCategory, details]) => (
                          <div key={subCategory} className="mb-2">
                            <p className="text-sm text-gray-600 mb-1">{details.description}</p>
                            <div className="flex gap-2 text-xs">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                상: {details.excellent}점 이상
                              </span>
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                중: {details.good}점 이상
                              </span>
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                                하: {details.poor}점 미만
                              </span>
                      </div>
                    </div>
                        ))}
                        </div>

                    ))}
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