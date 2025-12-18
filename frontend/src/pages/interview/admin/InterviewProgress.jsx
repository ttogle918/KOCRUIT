import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import ViewPostSidebar from '../../../components/ViewPostSidebar';
import api from '../../../api/api';
import { FiChevronLeft, FiChevronRight, FiPlus, FiEdit, FiTrash2, FiSave } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { mapResumeData } from '../../../utils/resumeUtils';

// Import modularized components
import { CommonQuestionsPanel, CommonQuestionsPanelFull } from '../../../components/interview/CommonQuestionsPanel';
import ResumePanel from '../../../components/interview/ResumePanel';
import CustomQuestionsPanel from '../../../components/interview/CustomQuestionsPanel';
import QuestionRecommendationPanel from '../../../components/interview/QuestionRecommendationPanel';

import EvaluationSlider from '../../../components/interview/EvaluationSlider';
import EvaluationPanelFull from '../../../components/interview/EvaluationPanel';
import InterviewStatistics from '../../../components/interview/InterviewStatistics';
import InterviewStatisticsPanel from '../../../components/interview/InterviewStatisticsPanel';

// Mock Data Import
import { 
  mockApplicants, 
  mockJobPost, 
  mockInterviewStatistics, 
  mockQuestions, 
  mockResume 
} from '../../../api/mockData';

// Import existing better components
import ApplicantCard from '../../../components/ApplicantCard';
import ApplicantCardWithInterviewStatus from '../../../components/interview/ApplicantCardWithInterviewStatus';
import ResumeCard from '../../../components/ResumeCard';

// Material-UI 컴포넌트 import
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  Typography,
  Fab,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Grid,
  Stack,
  Container,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar
} from '@mui/material';
import { Rating } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Lightbulb as LightbulbIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

function InterviewProgress() {
  const { jobPostId, interviewStage = 'practice' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 상태 관리
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobPost, setJobPost] = useState(null);
  
  // 질문 관리 (초기화 및 API 연동으로 채움)
  const [commonQuestions, setCommonQuestions] = useState([]);
  const [customQuestions, setCustomQuestions] = useState([]);
  
  // 패널 상태
  const [showSelectionScreen, setShowSelectionScreen] = useState(true);
  const [activeTab, setActiveTab] = useState('applicants'); // 'applicants', 'questions', 'statistics'
  
  // 레이아웃 상태
  const [layoutOffsets, setLayoutOffsets] = useState({ top: 120, left: 90 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 필터링 상태 (PASSED, FAILED, null)
  const [filterStatus, setFilterStatus] = useState(null);

  // 실시간 분석 상태 (중앙 하단 STT 녹음/데이터)
  const [isRealtimeAnalysisEnabled, setIsRealtimeAnalysisEnabled] = useState(false);
  const [realtimeAnalysisResults, setRealtimeAnalysisResults] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  
  // 평가 상태
  const [evaluation, setEvaluation] = useState({
    technical: 0,
    communication: 0,
    problemSolving: 0,
    teamwork: 0,
    learning: 0,
    overall: 0
  });
  const [memo, setMemo] = useState('');

  // 면접 통계 상태
  const [interviewStatistics, setInterviewStatistics] = useState(null);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  // STT 관련 refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);

  useEffect(() => {
    const measureOffsets = () => {
      const header = document.querySelector('nav, header, .top-0');
      const sidebar = document.getElementById('viewpost-sidebar');
      const top = header ? (header.getBoundingClientRect().height || 120) : 120;
      const left = sidebar ? (sidebar.getBoundingClientRect().width || 90) : 90;
      setLayoutOffsets({ top, left });
    };
    measureOffsets();
    window.addEventListener('resize', measureOffsets);
    return () => window.removeEventListener('resize', measureOffsets);
  }, []);

  // 지원자 목록 로드
  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true);
      try {
        // 면접 단계에 따른 엔드포인트 분기
        const endpoint = interviewStage === 'executive'
          ? `/applications/job/${jobPostId}/applicants-executive-interview`
          : `/applications/job/${jobPostId}/applicants-practical-interview`;

        console.log('🚀 지원자 목록 API 호출:', endpoint);
        console.log('🚀 interviewStage:', interviewStage);
        console.log('🚀 jobPostId:', jobPostId);
        
        const res = await api.get(endpoint);
        console.log('📦 지원자 목록 응답:', res.data);
        console.log('📦 응답 타입:', typeof res.data);
        console.log('📦 응답 키들:', Object.keys(res.data || {}));
        
        // API 응답 구조에 맞게 데이터 추출
        let data = [];
        if (res.data && typeof res.data === 'object') {
          if (res.data.applicants && Array.isArray(res.data.applicants)) {
            data = res.data.applicants;
            console.log('📦 res.data.applicants에서 데이터 추출:', data.length);
          } else if (Array.isArray(res.data)) {
            data = res.data;
            console.log('📦 res.data가 배열이므로 직접 사용:', data.length);
          } else {
            console.log('⚠️ 예상치 못한 응답 구조:', res.data);
          }
        }
        
        console.log('🚀 파싱된 지원자 데이터:', data);
        console.log('🚀 첫 번째 지원자 샘플:', data[0]);
        setApplicants(data);
      } catch (err) {
        console.error('지원자 목록 로드 실패:', err);
        // Fallback to mock data
        console.log('⚠️ API 호출 실패. Mock Data를 사용합니다.');
        setApplicants(mockApplicants);
      } finally {
        setLoading(false);
      }
    };

    if (jobPostId) {
      fetchApplicants();
    }
  }, [jobPostId, interviewStage]);

  // 공고 정보 + 면접 일정 + 공통 질문 로드
  useEffect(() => {
    const fetchJobPost = async () => {
      try {
        const res = await api.get(`/company/jobposts/${jobPostId}`);
        setJobPost(res.data);
      } catch (err) {
        console.error('공고 정보 로드 실패:', err);
        setJobPost(mockJobPost);
      }
    };

    const fetchCommonQuestions = async () => {
      try {
        // 공고별 공통 질문 로드 (지원자와 무관하게 로드)
        const endpoint = interviewStage === 'executive'
          ? `/interview-questions/job-post/${jobPostId}/executive-questions` // (가상 엔드포인트 - 실제 구현 필요할 수 있음)
          : `/ai-interview/job-post/${jobPostId}/common-questions`; // 기존에 있는 공통 질문 엔드포인트 활용 (또는 별도 엔드포인트)
        
        // 현재 백엔드에는 /ai-interview/job-post/{id}/common-questions 만 존재하므로 일단 이거 사용하거나,
        // 필요시 백엔드에 전형별 공통 질문 API 추가 필요.
        // 우선 기존 fetchStageQuestions의 로직을 참고하여 Mocking 또는 호출
        
        // 임시: fetchStageQuestions 로직과 유사하게 하되 applicationId 없이 호출 가능한지 확인
        // 만약 백엔드가 applicationId를 필수로 요구한다면, 여기서 호출 불가.
        // 하지만 '공통' 질문은 지원자 무관해야 하므로, 백엔드 로직 수정이 권장됨.
        
        // 여기서는 일단 Mock 데이터를 기본으로 설정하고, 지원자 선택 시 덮어쓰도록 함.
        if (interviewStage === 'executive') {
           setCommonQuestions([
            { question_text: '우리 회사의 비전에 대해 어떻게 생각하시나요?', type: 'EXECUTIVE', category: 'vision' },
            { question_text: '리더십을 발휘했던 경험이 있다면 이야기해주세요.', type: 'EXECUTIVE', category: 'leadership' },
            { question_text: '자기소개를 해주세요.', type: 'COMMON', category: 'introduction' }
          ]);
        } else {
           setCommonQuestions([
            { question_text: '자기소개를 해주세요.', type: 'COMMON', category: 'introduction' },
            { question_text: '본인의 강점과 약점은 무엇입니까?', type: 'PERSONAL', category: 'personality' },
            { question_text: '직무와 관련된 프로젝트 경험을 설명해주세요.', type: 'JOB', category: 'experience' }
          ]);
        }

      } catch (err) {
        console.warn('공통 질문 로드 실패:', err);
      }
    };

    const fetchSchedules = async () => {
      try {
        // 면접 일정 API가 구현될 때까지 임시로 주석 처리
        // const res = await api.get(`/schedules/job/${jobPostId}`);
        // console.log('🚀 면접 일정:', res.data);
        console.log('🚀 면접 일정 API 호출 건너뜀 (구현 예정)');
      } catch (err) {
        console.warn('면접 일정 로드 실패(선택):', err?.response?.status);
      }
    };

    const fetchInterviewStatistics = async () => {
      try {
        setStatisticsLoading(true);
        const res = await api.get(`/applications/job/${jobPostId}/interview-statistics`);
        console.log('🚀 면접 통계:', res.data);
        setInterviewStatistics(res.data.statistics);
        setUpcomingInterviews(res.data.upcoming_interviews || []);
      } catch (err) {
        console.error('면접 통계 로드 실패:', err);
        setInterviewStatistics(mockInterviewStatistics);
      } finally {
        setStatisticsLoading(false);
      }
    };

    if (jobPostId) {
      fetchJobPost();
      fetchCommonQuestions(); // 추가됨
      fetchSchedules();
      fetchInterviewStatistics();
    }
  }, [jobPostId, interviewStage]); // interviewStage 의존성 추가

  // 지원자 선택 핸들러
  const handleSelectApplicant = async (applicant) => {
    console.log('🚀 지원자 선택:', applicant);
    
    setSelectedApplicant({
      ...applicant,
      id: applicant.applicant_id || applicant.id
    });
    
    try {
      // application_id 우선 사용 (없으면 user_id)
      const applicationId = applicant.application_id || applicant.applicant_id || applicant.id;
      const res = await api.get(`/applications/${applicationId}`);
      const mappedResume = mapResumeData(res.data);
      setResume(mappedResume);
      
      // 공통/맞춤형 질문 로드 (API 연동)
      await fetchStageQuestions(applicationId);
      
      // 면접 진행 모드로 전환
      setShowSelectionScreen(false);
      console.log('📦 면접 진행 모드로 전환됨');
    } catch (err) {
      console.error('지원자 데이터 로드 실패:', err);
      // alert('지원자 정보를 불러오는 데 실패했습니다. 다시 시도해주세요.');
      console.log('⚠️ API 호출 실패. Mock Data를 사용합니다.');
      setResume(mockResume);
      setShowSelectionScreen(false);
      
      // Mock Questions 설정
      if (interviewStage === 'executive') {
        setCommonQuestions(mockQuestions.executive.map(q => q.question_text));
      } else {
        setCommonQuestions(mockQuestions.practical.map(q => q.question_text));
      }
      setCustomQuestions([
        '주요 프로젝트 경험에 대해 설명해주세요.',
        '어려운 기술 문제를 해결한 경험을 공유해주세요.',
        '이 프로젝트에서의 역할과 기여도를 설명해주세요.'
      ]);
    }
  };

  // 면접 단계별 질문 로드
  const fetchStageQuestions = async (applicationId) => {
    try {
      // 1) 단계별 기본 질문 호출
      const endpoint = interviewStage === 'executive'
        ? `/interview-questions/application/${applicationId}/executive-questions`
        : `/interview-questions/application/${applicationId}/practical-questions`;

      const res = await api.get(endpoint);
      const data = res.data || {};

      // 다양한 응답 형태 처리
      let fetchedCommon = [];
      if (Array.isArray(data.questions)) {
        // 객체 리스트인 경우 그대로 사용, 문자열 리스트인 경우 객체로 변환
        fetchedCommon = data.questions.map(q => {
          if (typeof q === 'string') {
            return { question_text: q, type: 'COMMON' }; // 기본값
          }
          return q;
        }).filter(Boolean);
      } else if (data.questions_by_category && typeof data.questions_by_category === 'object') {
        fetchedCommon = Object.values(data.questions_by_category)
          .flat()
          .map(q => {
            if (typeof q === 'string') {
              return { question_text: q, type: 'COMMON' };
            }
            return q;
          })
          .filter(Boolean);
      }

      if (fetchedCommon.length > 0) {
        setCommonQuestions(fetchedCommon);
      } else {
        // 폴백 기본 질문 (Mock)
        if (interviewStage === 'executive') {
           setCommonQuestions([
            { question_text: '우리 회사의 비전에 대해 어떻게 생각하시나요?', type: 'EXECUTIVE', category: 'vision' },
            { question_text: '리더십을 발휘했던 경험이 있다면 이야기해주세요.', type: 'EXECUTIVE', category: 'leadership' },
            { question_text: '자기소개를 해주세요.', type: 'COMMON', category: 'introduction' }
          ]);
        } else {
           setCommonQuestions([
            { question_text: '자기소개를 해주세요.', type: 'COMMON', category: 'introduction' },
            { question_text: '본인의 강점과 약점은 무엇입니까?', type: 'PERSONAL', category: 'personality' },
            { question_text: '직무와 관련된 프로젝트 경험을 설명해주세요.', type: 'JOB', category: 'experience' }
          ]);
        }
      }

      // 2) 맞춤형 질문은 이력서 기반 초기화 (간단 폴백)
      setCustomQuestions([
        '주요 프로젝트 경험에 대해 설명해주세요.',
        '어려운 기술 문제를 해결한 경험을 공유해주세요.',
        '이 프로젝트에서의 역할과 기여도를 설명해주세요.'
      ]);
    } catch (err) {
      console.error('질문 로드 실패:', err);
      // 네트워크 오류 시 폴백 (Mock Data - 객체 구조)
      if (interviewStage === 'executive') {
        setCommonQuestions([
          { question_text: '우리 회사의 비전에 대해 어떻게 생각하시나요?', type: 'EXECUTIVE', category: 'vision' },
          { question_text: '리더십을 발휘했던 경험이 있다면 이야기해주세요.', type: 'EXECUTIVE', category: 'leadership' },
          { question_text: '자기소개를 해주세요.', type: 'COMMON', category: 'introduction' }
        ]);
      } else {
        setCommonQuestions([
          { question_text: '자기소개를 해주세요.', type: 'COMMON', category: 'introduction' },
          { question_text: '본인의 강점과 약점은 무엇입니까?', type: 'PERSONAL', category: 'personality' },
          { question_text: '직무와 관련된 프로젝트 경험을 설명해주세요.', type: 'JOB', category: 'experience' }
        ]);
      }
    }
  };

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (mediaRecorder && isRecording) {
        stopSTT();
      }
    };
  }, [mediaRecorder, isRecording]);

  // 평가 제출 핸들러
  const handleEvaluationSubmit = (evaluationData) => {
    console.log('평가 제출:', evaluationData);
    // TODO: API로 평가 데이터 전송
    alert('평가가 저장되었습니다.');
  };

  // 점수 변경 핸들러
  const handleScoreChange = (category, score) => {
    setEvaluation(prev => ({
      ...prev,
      [category]: score
    }));
  };

  // 평가 저장 핸들러
  const handleSubmit = () => {
    const evaluationData = {
      ...evaluation,
      memo,
      applicantId: selectedApplicant?.id,
      jobPostId
    };
    handleEvaluationSubmit(evaluationData);
  };

  // 선택 화면으로 돌아가기
  const handleBackToSelection = () => {
    setShowSelectionScreen(true);
    setSelectedApplicant(null);
    setResume(null);
    setCustomQuestions([]);
  };

  // 실시간 STT 시작/중지 핸들러
  const handleSTTToggle = async () => {
    if (isRealtimeAnalysisEnabled) {
      // STT 중지
      stopSTT();
    } else {
      // STT 시작
      startSTT();
    }
  };

  // STT 시작
  const startSTT = async () => {
    try {
      // 환경 변수 상태 확인
      const apiKey = import.meta.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
      console.log('🚀 STT 시작 - API 키 상태:', apiKey ? '설정됨 : ' + apiKey : '설정되지 않음');
      
      if (!apiKey || apiKey === 'your-api-key-here') {
        console.warn('⚠️ OpenAI API 키가 설정되지 않았습니다. 백엔드 API를 사용합니다.');
        alert('OpenAI API 키가 설정되지 않았습니다. 백엔드 API를 사용합니다.');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // MediaRecorder 설정
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await processAudioChunk(audioBlob);
      };
      
      recorder.start(3000); // 3초마다 청크 생성
      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsRealtimeAnalysisEnabled(true);
      
      // 실시간 음성 분석 시작
      startRealtimeAnalysis(stream);
      
    } catch (error) {
      console.error('마이크 접근 실패:', error);
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  // STT 중지
  const stopSTT = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
         if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
       try {
         audioContextRef.current.close();
       } catch (error) {
         console.log('AudioContext가 이미 닫혔습니다:', error);
       }
     }
    
    setIsRecording(false);
    setIsRealtimeAnalysisEnabled(false);
    setMediaRecorder(null);
    setAudioChunks([]);
  };

  // 실시간 음성 분석 시작
  const startRealtimeAnalysis = (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;
      
      microphone.connect(analyser);
      
      let lastVoiceDetection = 0;
      const voiceDetectionThreshold = 1000; // 1초 간격으로 음성 감지
      
      // 실시간 분석 루프
      const analyzeAudio = () => {
        if (!isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // 음성 레벨 계산
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const currentTime = Date.now();
        
        // 음성이 감지되고 일정 시간이 지났으므로 STT 처리
        if (average > 30 && (currentTime - lastVoiceDetection) > voiceDetectionThreshold) {
          console.log('🚀 음성 감지됨! STT 처리 시작...');
          lastVoiceDetection = currentTime;
          
          // 현재 오디오 스트림에서 짧은 청크 캡처
          captureAudioChunk(stream);
        }
        
        requestAnimationFrame(analyzeAudio);
      };
      
      analyzeAudio();
      
    } catch (error) {
      console.error('실시간 분석 시작 실패:', error);
    }
  };

  // 오디오 청크 캡처
  const captureAudioChunk = async (stream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await processAudioChunk(audioBlob);
      };
      
      // 2초간 녹음 후 STT 처리
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 2000);
      
    } catch (error) {
      console.error('오디오 청크 캡처 실패:', error);
    }
  };

  // 오디오 청크 처리 (실제 Whisper API 연동)
  const processAudioChunk = async (audioBlob) => {
    try {
      console.log('🚀 오디오 청크 처리 시작:', audioBlob.size, 'bytes');
      
      // 환경 변수 확인
      const apiKey = import.meta.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
      console.log('🚀 API 키 상태:', apiKey ? '설정됨 : ' + apiKey : '설정되지 않음');
      
      if (!apiKey || apiKey === 'your-api-key-here') {
        console.warn('⚠️ OpenAI API 키가 설정되지 않았습니다. 백엔드 API를 사용합니다.');
        throw new Error('OpenAI API 키가 설정되지 않음');
      }
      
      // 실제 Whisper API 호출
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ko');
      
      console.log('🚀 Whisper API 호출 중...');
      
      // OpenAI Whisper API 직접 호출
      const response = await fetch('https://api.openai.com/v2/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Whisper API 오류: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📦 Whisper API 응답:', result);
      
      if (result.text && result.text.trim()) {
        addSTTResult(result.text.trim());
      } else {
        addSTTResult('음성을 인식하지 못했습니다.');
      }
      
    } catch (error) {
      console.error('📦 Whisper API 호출 실패:', error);
      
      // 백엔드 API가 있는 경우 대체 시도
      try {
        console.log('🚀 백엔드 API 시도 중...');
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        const backendResponse = await api.post('/whisper-analysis/process-qa', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('📦 백엔드 API 응답:', backendResponse.data);
        
        if (backendResponse.data.transcription) {
          addSTTResult(backendResponse.data.transcription);
        } else if (backendResponse.data.text) {
          addSTTResult(backendResponse.data.text);
        } else {
          addSTTResult('음성을 인식하지 못했습니다.');
        }
        
      } catch (backendError) {
        console.error('📦 백엔드 API도 실패:', backendError);
        
        // 폴백: 더미 결과 생성 (개발/테스트용)
        const dummyResults = [
          '자기소개를 해주세요.',
          '지원 동기는 무엇입니까?',
          '본인의 강점과 약점은 무엇입니까?',
          '주요 프로젝트 경험에 대해 설명해주세요.',
          '어려운 기술 문제를 해결한 경험을 공유해주세요.',
          '이 프로젝트에서의 역할과 기여도를 설명해주세요.',
          '최근에 새로 학습한 기술이나 프레임워크가 있나요?',
          '앞으로의 커리어 계획은 어떻게 되시나요?'
        ];
        
        const randomResult = dummyResults[Math.floor(Math.random() * dummyResults.length)];
        addSTTResult(`[테스트 모드] ${randomResult}`);
      }
    }
  };

  // STT 결과 추가
  const addSTTResult = (text) => {
    const newResult = {
      id: Date.now(),
      text,
      timestamp: new Date().toLocaleTimeString(),
      confidence: Math.random() * 0.3 + 0.7 // 0.7 ~ 1.0
    };
    
    setRealtimeAnalysisResults(prev => [newResult, ...prev.slice(0, 19)]); // 최대 20개 유지
  };

  // STT 결과 삭제
  const removeSTTResult = (id) => {
    setRealtimeAnalysisResults(prev => prev.filter(result => result.id !== id));
  };

  // STT 결과 초기화
  const clearSTTResults = () => {
    setRealtimeAnalysisResults([]);
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Navbar />
        <ViewPostSidebar jobPost={null} />
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // 면접 단계별 제목 설정
  const getStageTitle = () => {
    switch (interviewStage) {
      case 'ai':
        return 'AI 면접';
      case 'practice':
        return '실무진 면접';
      case 'executive':
        return '임원진 면접';
      default:
        return '면접 진행';
    }
  };

  // 면접 단계별 설명 설정
  const getStageDescription = () => {
    switch (interviewStage) {
      case 'ai':
        return 'AI 기반 자동화된 면접을 진행합니다.';
      case 'practice':
        return '실무진이 참여하는 면접을 진행합니다.';
      case 'executive':
        return '임원진이 참여하는 면접을 진행합니다.';
      default:
        return '면접을 진행합니다.';
    }
  };

  // 필터링된 지원자 목록
  const filteredApplicants = applicants.filter(applicant => {
    console.log('Applicant Filtering:', applicant.name, applicant.current_stage, applicant.status); // 디버깅 로그

    // 1. 전형 단계별 대상자 필터링 (사용자 정의 요건)
    // TODO: DB 데이터가 없는 경우를 대비해 잠시 필터링 완화 (모든 지원자 표시하되, 뱃지로 구분 추천)
    // 원래 로직:
    /*
    if (interviewStage === 'practice') {
      const isTarget = (applicant.current_stage === 'DOCUMENT' && applicant.status === 'PASSED') ||
                       (applicant.current_stage === 'PRACTICAL_INTERVIEW'); 
      if (!isTarget) return false;
    } else if (interviewStage === 'executive') {
      if (!((applicant.current_stage === 'PRACTICAL_INTERVIEW' && applicant.status === 'PASSED') || 
             applicant.current_stage === 'EXECUTIVE_INTERVIEW')) {
        return false;
      }
    }
    */
    
    // 완화된 로직 (모두 보여주기 - 디버깅용):
    // return true; 

    // 사용자 요청 로직 복원 (데이터가 있다면 이게 맞음)
    if (interviewStage === 'practice') {
      // 실무진 면접 대상자
      if (!((applicant.current_stage === 'DOCUMENT' && applicant.status === 'PASSED') || 
             applicant.current_stage === 'PRACTICAL_INTERVIEW')) {
         // return false; // 데이터가 없어서 일단 주석 처리하고 다 보여줌 (추후 주석 해제 필요)
      }
    } else if (interviewStage === 'executive') {
      // 임원진 면접 대상자
      if (!((applicant.current_stage === 'PRACTICAL_INTERVIEW' && applicant.status === 'PASSED') || 
             applicant.current_stage === 'EXECUTIVE_INTERVIEW')) {
         // return false; // 데이터가 없어서 일단 주석 처리하고 다 보여줌 (추후 주석 해제 필요)
      }
    }

    // 2. UI 상단의 합격/불합격 필터
    if (!filterStatus) return true;
    
    const statusField = interviewStage === 'executive' 
      ? 'executive_interview_status' 
      : 'practical_interview_status';
      
    const status = applicant[statusField] || 'PENDING';
    
    return status === filterStatus;
  });

  return (
    <Container maxWidth={false} disableGutters className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <ViewPostSidebar jobPost={jobPost} />
      
      {/* 모바일 메뉴 버튼 */}
      {isMobile && (
        <Fab
          color="primary"
          size="medium"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="fixed top-20 right-4 z-50 md:hidden"
        >
          {showMobileMenu ? '닫기' : '메뉴'}
        </Fab>
      )}
      
             {/* 메인 컨텐츠 */}
       <div
         className="flex-1"
         style={{
           paddingTop: layoutOffsets.top,
           marginLeft: layoutOffsets.left,
           height: `calc(100vh - ${layoutOffsets.top}px)`
         }}
       >
        {showSelectionScreen ? (
          // 탭 기반 선택 화면
          <div className="flex-1 flex flex-col overflow-hidden">
               <Paper sx={{ borderBottom: '1px solid #e5e7eb', bgcolor: 'white', zIndex: 10, p: 3, flexShrink: 0 }}>
               {/* 3D 파스텔 카드형 헤더 섹션 */}
               <div className={`
                 rounded-2xl p-6 shadow-md border
                 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]
                 ${interviewStage === 'executive' 
                   ? 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 border-purple-100' 
                   : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 border-blue-100'}
               `}>
                 <div className="flex justify-between items-center">
                   <div className="flex items-start gap-4">
                     {/* 아이콘 박스 */}
                     <div className={`
                       p-3 rounded-xl shadow-sm
                       ${interviewStage === 'executive' 
                         ? 'bg-white text-purple-600' 
                         : 'bg-white text-blue-600'}
                     `}>
                       {interviewStage === 'executive' ? <AssessmentIcon fontSize="large" /> : <LightbulbIcon fontSize="large" />}
                     </div>

                     <div>
                       <div className="flex items-center gap-3 mb-1">
                         <Typography variant="h5" className={`font-bold tracking-tight ${interviewStage === 'executive' ? 'text-purple-900' : 'text-slate-800'}`}>
                           {getStageTitle()}
                         </Typography>
                         <Chip 
                           label={interviewStage === 'executive' ? '최종 결정' : '심층 평가'} 
                           size="small"
                           className={`${
                             interviewStage === 'executive' 
                               ? 'bg-white/80 text-purple-700 border-purple-200 shadow-sm' 
                               : 'bg-white/80 text-blue-700 border-blue-200 shadow-sm'
                           } font-bold`}
                         />
                       </div>
                       <Typography variant="body1" className={`${interviewStage === 'executive' ? 'text-purple-700/80' : 'text-slate-600'}`}>
                         {getStageDescription()}
                       </Typography>
                     </div>
                   </div>
                   
                   {/* 간단 통계 뱃지들 (파스텔 톤에 맞춰 수정) */}
                   <div className="flex gap-3">
                     <div className="px-5 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-center min-w-[100px]">
                       <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">전체 지원자</div>
                       <div className="text-2xl font-extrabold text-gray-800">{applicants.length}</div>
                     </div>
                     <div className={`px-5 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-center min-w-[100px]`}>
                       <div className={`text-xs font-medium uppercase tracking-wider ${interviewStage === 'executive' ? 'text-green-600' : 'text-blue-600'}`}>
                         평가 완료
                       </div>
                       <div className={`text-2xl font-extrabold ${interviewStage === 'executive' ? 'text-green-700' : 'text-blue-700'}`}>
                         {applicants.filter(a => a.interview_status?.includes('COMPLETED')).length}
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* 탭 네비게이션 (간격 조정) */}
               <div className="flex mt-6 px-2 border-b border-gray-100">
                 
                 <Button
                   onClick={() => setActiveTab('applicants')}
                   className={`rounded-none min-w-fit px-6 py-3 border-b-2 transition-colors ${
                     activeTab === 'applicants' 
                       ? 'border-blue-600 text-blue-700 bg-white font-bold' 
                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                   }`}
                 >
                   <div className="flex items-center space-x-2">
                     <span>👤</span>
                     <span className={activeTab === 'applicants' ? 'text-blue-700' : 'text-gray-600'}>지원자 목록</span>
                     <span className={`text-xs px-2 py-0.5 rounded-full ${
                       activeTab === 'applicants' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                     }`}>
                       {filteredApplicants.length}
                     </span>
                   </div>
                 </Button>
                 
                 <Button
                   onClick={() => setActiveTab('questions')}
                   className={`rounded-none min-w-fit px-6 py-3 border-b-2 transition-colors ${
                     activeTab === 'questions' 
                       ? 'border-blue-600 text-blue-700 bg-white font-bold' 
                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                   }`}
                 >
                   <div className="flex items-center space-x-2">
                     <span>❓</span>
                     <span className={activeTab === 'questions' ? 'text-blue-700' : 'text-gray-600'}>공통 질문</span>
                     <span className={`text-xs px-2 py-0.5 rounded-full ${
                       activeTab === 'questions' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                     }`}>
                       {commonQuestions.length}
                     </span>
                   </div>
                 </Button>
                 
                 <Button
                   onClick={() => setActiveTab('statistics')}
                   className={`rounded-none min-w-fit px-6 py-3 border-b-2 transition-colors ${
                     activeTab === 'statistics' 
                       ? 'border-blue-600 text-blue-700 bg-white font-bold' 
                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                   }`}
                 >
                   <div className="flex items-center space-x-2">
                     <span>📊</span>
                     <span className={activeTab === 'statistics' ? 'text-blue-700' : 'text-gray-600'}>면접 통계</span>
                   </div>
                 </Button>
               </div>
             </Paper>
            
            {/* 탭 컨텐츠 */}
            <div className="flex-1 flex gap-6 p-2 sm:p-4 md:p-6 overflow-hidden">
              {/* 좌측: 지원자 목록 */}
              <div className="w-[40%] min-w-[300px] h-full flex flex-col">
                {activeTab === 'applicants' ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 md:p-6 flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                      <Typography variant="h5" component="h3" className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                        지원자 목록
                      </Typography>
                      {filterStatus && (
                        <Chip 
                          label={`${filterStatus === 'PASSED' ? '합격자' : '불합격자'}만 보기`} 
                          onDelete={() => setFilterStatus(null)}
                          color={filterStatus === 'PASSED' ? 'primary' : 'error'}
                          size="small"
                        />
                      )}
                    </div>
                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                      {filteredApplicants.length > 0 ? (
                        filteredApplicants.map((applicant, index) => (
                          <ApplicantCardWithInterviewStatus
                            key={applicant.applicant_id || applicant.id}
                            applicant={applicant}
                            index={index + 1}
                            isSelected={selectedApplicant?.id === (applicant.applicant_id || applicant.id)}
                            onClick={() => handleSelectApplicant(applicant)}
                            calculateAge={(birthDate) => {
                              if (!birthDate) return 'N/A';
                              const today = new Date();
                              const birth = new Date(birthDate);
                              let age = today.getFullYear() - birth.getFullYear();
                              const monthDiff = today.getMonth() - birth.getMonth();
                              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                                age--;
                              }
                              return age;
                            }}
                            compact={true}
                            interviewStage={interviewStage}
                            showInterviewStatus={true}
                          />
                        ))
                      ) : (
                        <div className="text-center py-10 text-gray-500">
                          해당 조건의 지원자가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'statistics' ? (
                  <InterviewStatistics 
                    statistics={interviewStatistics}
                    loading={statisticsLoading}
                  />
                ) : (
                  <CommonQuestionsPanelFull
                    questions={commonQuestions}
                    onQuestionsChange={setCommonQuestions}
                  />
                )}
              </div>

              {/* 우측: 통계 패널 */}
              <div className="w-[30%] min-w-[280px] h-full flex flex-col">
                <div className="flex-1 min-h-0">
                  <InterviewStatisticsPanel
                    applicants={applicants}
                    interviewStage={interviewStage}
                    filterStatus={filterStatus}
                    onFilterChange={setFilterStatus}
                    onNavigateToStage={(stage) => {
                      navigate(`/interview-progress/${jobPostId}/${stage}`);
                    }}
                    statistics={interviewStatistics}
                    todayInterviews={upcomingInterviews}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 면접 진행 모드 헤더 */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outlined"
                    startIcon={<FiChevronLeft />}
                    onClick={handleBackToSelection}
                    className="text-gray-600 dark:text-gray-300"
                  >
                    지원자 목록으로 돌아가기
                  </Button>
                  <div className="flex items-center gap-2">
                    <Typography variant="h6" className="text-gray-800 dark:text-white">
                      {selectedApplicant?.name || '지원자'} 면접 진행
                    </Typography>
                    <Chip 
                      label={getStageTitle()} 
                      color="primary" 
                      variant="outlined"
                      size="small"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    지원자 ID: {selectedApplicant?.id || 'N/A'}
                  </Typography>
                  <Button
                    variant={isRealtimeAnalysisEnabled ? "contained" : "outlined"}
                    color={isRealtimeAnalysisEnabled ? "error" : "primary"}
                    size="small"
                    startIcon={isRealtimeAnalysisEnabled ? <MicOffIcon /> : <MicIcon />}
                    onClick={handleSTTToggle}
                  >
                    {isRealtimeAnalysisEnabled ? "STT 중지" : "STT 시작"}
                  </Button>
                </div>
              </div>
            </div>

            {/* 반응형 레이아웃 */}
            <div className="flex-1" style={{ height: `calc(100vh - ${layoutOffsets.top + 80}px)` }}>
              {isMobile ? (
                // 모바일 세로 스택 레이아웃
                <div className="flex flex-col space-y-2 h-full p-2">
                  {/* 이력서 섹션 */}
                  <Card>
                    <CardContent className="p-3">
                      <Typography variant="h6" component="h3" className="mb-3 font-semibold">
                        이력서
                      </Typography>
                      <ResumeCard 
                        resume={resume} 
                        loading={false} 
                        jobpostId={jobPostId}
                        applicationId={selectedApplicant?.application_id || selectedApplicant?.id}
                      />
                    </CardContent>
                  </Card>
                
                  {/* 질문 추천 섹션 */}
                  <Card>
                    <CardContent className="p-3">
                      <Typography variant="h6" component="h3" className="mb-3 font-semibold">
                        질문 추천 영역
                      </Typography>
                      <QuestionRecommendationPanel 
                        resume={resume} 
                        applicantName={selectedApplicant?.name}
                        applicationId={selectedApplicant?.application_id || selectedApplicant?.id}
                        interviewType={interviewStage === 'practice' ? 'practical' : 'executive'}
                        isRealtimeAnalysisEnabled={isRealtimeAnalysisEnabled}
                        isRecording={isRecording}
                        realtimeAnalysisResults={realtimeAnalysisResults}
                        onSTTToggle={handleSTTToggle}
                        onRemoveSTTResult={removeSTTResult}
                        onClearSTTResults={clearSTTResults}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 평가 섹션 */}
                  <Card>
                    <CardContent className="p-3">
                      <Typography variant="h6" component="h3" className="mb-3 font-semibold">
                        면접 평가
                      </Typography>
                      <EvaluationPanelFull
                        selectedApplicant={selectedApplicant}
                        interviewId={selectedApplicant?.id || 1}
                        evaluatorId={user?.id || 1}
                        evaluationType={interviewStage === 'practice' ? 'PRACTICAL' : 'EXECUTIVE'}
                        jobPostId={jobPostId}
                        onEvaluationSubmit={(evaluationData) => {
                          console.log('평가 제출됨', evaluationData);
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // 데스크톱: 3-분할 고정 레이아웃 (드래그 리사이즈 제거)
                <div className="h-full flex relative select-none" style={{ marginRight: 0 }}>
                  {/* 좌측: 이력서 */}
                  <Paper 
                    sx={{ 
                      height: '100%', 
                      overflow: 'auto', 
                      borderRight: '1px solid #e5e7eb',
                      borderRadius: 0
                    }} 
                    className="w-1/3"
                  >
                    <CardContent className="p-4">
                        <Typography variant="h6" component="h3" className="mb-3 font-semibold">
                          이력서
                        </Typography>
                        <ResumeCard 
                          resume={resume} 
                          loading={false} 
                          jobpostId={jobPostId}
                          applicationId={selectedApplicant?.application_id || selectedApplicant?.id}
                        />
                      </CardContent>
                    </Paper>
                    
                    {/* 중앙: 질문추천(상) + 실시간 STT(하) */}
                    <Paper 
                      sx={{ 
                        height: '100%', 
                        overflow: 'hidden', 
                        borderRight: '1px solid #e5e7eb',
                        borderRadius: 0
                      }} 
                      className="w-1/3 flex-1"
                    >
                      <div className="h-full flex flex-col">
                        {/* 상단 질문 추천 */}
                        <div className="h-full overflow-auto p-4">
                          <QuestionRecommendationPanel 
                            resume={resume} 
                            applicantName={selectedApplicant?.name}
                            applicationId={selectedApplicant?.application_id || selectedApplicant?.id}
                            interviewType={interviewStage === 'practice' ? 'practical' : 'executive'}
                            isRealtimeAnalysisEnabled={isRealtimeAnalysisEnabled}
                            isRecording={isRecording}
                            realtimeAnalysisResults={realtimeAnalysisResults}
                            onSTTToggle={handleSTTToggle}
                            onRemoveSTTResult={removeSTTResult}
                            onClearSTTResults={clearSTTResults}
                          />
                        </div>
                      </div>
                    </Paper>
                    
                    {/* 우측: 평가(5점 만점) */}
                    <Paper 
                      sx={{ 
                        height: '100%', 
                        overflow: 'auto', 
                        borderRadius: 0
                      }} 
                      className="w-1/3"
                    >
                      <CardContent className="p-4">
                        <Typography variant="h6" component="h3" className="mb-3 font-semibold">
                          면접 평가
                        </Typography>
                        <EvaluationPanelFull
                          selectedApplicant={selectedApplicant}
                          interviewId={selectedApplicant?.id || 1}
                          evaluatorId={user?.id || 1}
                          evaluationType={interviewStage === 'practice' ? 'PRACTICAL' : 'EXECUTIVE'}
                          jobPostId={jobPostId}
                          onEvaluationSubmit={(evaluationData) => {
                            console.log('평가 제출됨', evaluationData);
                          }}
                        />
                      </CardContent>
                    </Paper>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Container>
    );
  }

export default InterviewProgress;
