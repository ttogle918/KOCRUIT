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

// DraggablePanel component is now imported from separate file

// TabButton component is now imported from separate file

// ApplicantListFull component is now imported from separate file

// CommonQuestionsPanelFull component is now imported from separate file

// CommonQuestionsPanel component is now imported from separate file

// ResumePanel component is now imported from separate file

// CustomQuestionsPanel component is now imported from separate file

// QuestionRecommendationPanel component is now imported from separate file

// EvaluationPanelFull component is now imported from separate file

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
  const [panelSizes, setPanelSizes] = useState({
    resume: { width: 400, height: 300 },
    commonQuestions: { width: 400, height: 300 },
    customQuestions: { width: 400, height: 300 },
    questionRecommendation: { width: 400, height: 300 }
  });

  // 사이드바/헤더 크기에 맞춰 동적 좌표 계산
  const [layoutOffsets, setLayoutOffsets] = useState({ top: 120, left: 90 });

  // 3-분할 레이아웃 가변 크기 상태
  const [leftWidth, setLeftWidth] = useState(420);
  const [middleWidth, setMiddleWidth] = useState(560);
  const [rightWidth, setRightWidth] = useState(520);
  const minColWidth = 320;
  const gutter = 6; // 리사이저 두께

  // 중앙 컬럼 상하 분할 높이
  const [middleTopHeight, setMiddleTopHeight] = useState(260);
  const minRowHeight = 160;

  // 드래그 상태
  const [draggingCol, setDraggingCol] = useState(null); // 'left' | 'right' | null
  const [draggingRow, setDraggingRow] = useState(false);
  
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
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  // 반응형 레이아웃 상태
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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

  // 컬럼 리사이즈 핸들러
  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingCol && !draggingRow) return;
      if (draggingCol) {
        // 전체 가로폭 계산
        const total = window.innerWidth - layoutOffsets.left - gutter * 2; // 두 개의 수직 리사이저
        let lx = leftWidth;
        let mx = middleWidth;
        let rx = rightWidth;
        if (draggingCol === 'left') {
          const newLeft = Math.max(minColWidth, Math.min(total - minColWidth * 2, e.clientX - layoutOffsets.left));
          const delta = newLeft - leftWidth;
          lx = newLeft;
          mx = Math.max(minColWidth, middleWidth - delta);
        } else if (draggingCol === 'right') {
          const usedLeft = leftWidth + gutter + middleWidth + gutter;
          const newRight = Math.max(minColWidth, Math.min(total - minColWidth, total - (e.clientX - layoutOffsets.left)));
          // 오른쪽 기준 조정: 남는 영역 right에 할당
          const delta = newRight - rightWidth;
          rx = newRight;
          mx = Math.max(minColWidth, middleWidth - delta);
        }
        setLeftWidth(lx);
        setMiddleWidth(mx);
        setRightWidth(rx);
      } else if (draggingRow) {
        const containerTop = layoutOffsets.top;
        const cursorY = e.clientY - containerTop; // 컨테이너 기준 Y
        const available = window.innerHeight - layoutOffsets.top;
        const newTop = Math.max(minRowHeight, Math.min(available - minRowHeight - gutter, cursorY));
        setMiddleTopHeight(newTop);
      }
    };
    const stopDrag = () => {
      setDraggingCol(null);
      setDraggingRow(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [draggingCol, draggingRow, leftWidth, middleWidth, rightWidth, layoutOffsets.top, layoutOffsets.left]);

  // 지원자 목록 로드
  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true);
      try {
        // 면접 단계에 따른 엔드포인트 분기
        const endpoint = interviewStage === 'executive'
          ? `/applications/job/${jobPostId}/applicants-with-executive-interview`
          : `/applications/job/${jobPostId}/applicants-with-practical-interview`;

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
      } finally {
        setLoading(false);
      }
    };

    if (jobPostId) {
      fetchApplicants();
    }
  }, [jobPostId, interviewStage]);

  // 공고 정보 + 면접 일정 로드
  useEffect(() => {
    const fetchJobPost = async () => {
      try {
        const res = await api.get(`/company/jobposts/${jobPostId}`);
        setJobPost(res.data);
      } catch (err) {
        console.error('공고 정보 로드 실패:', err);
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
      } catch (err) {
        console.error('면접 통계 로드 실패:', err);
      } finally {
        setStatisticsLoading(false);
      }
    };

    if (jobPostId) {
      fetchJobPost();
      fetchSchedules();
      fetchInterviewStatistics();
    }
  }, [jobPostId]);

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
      alert('지원자 정보를 불러오는 데 실패했습니다. 다시 시도해주세요.');
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
        fetchedCommon = data.questions.map(q => (typeof q === 'string' ? q : (q.question_text || ''))).filter(Boolean);
      } else if (data.questions_by_category && typeof data.questions_by_category === 'object') {
        fetchedCommon = Object.values(data.questions_by_category)
          .flat()
          .map(q => (typeof q === 'string' ? q : (q.question_text || '')))
          .filter(Boolean);
      }

      if (fetchedCommon.length > 0) {
        setCommonQuestions(fetchedCommon);
      } else {
        // 폴백 기본 질문
        setCommonQuestions([
          '자기소개를 해주세요.',
          '지원 동기는 무엇입니까?',
          '본인의 강점과 약점은 무엇입니까?'
        ]);
      }

      // 2) 맞춤형 질문은 이력서 기반 초기화 (간단 폴백)
      setCustomQuestions([
        '주요 프로젝트 경험에 대해 설명해주세요.',
        '어려운 기술 문제를 해결한 경험을 공유해주세요.',
        '이 프로젝트에서의 역할과 기여도를 설명해주세요.'
      ]);
    } catch (err) {
      console.error('질문 로드 실패:', err);
      // 네트워크 오류 시 폴백
      setCommonQuestions([
        '자기소개를 해주세요.',
        '지원 동기는 무엇입니까?',
        '본인의 강점과 약점은 무엇입니까?'
      ]);
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
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
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
          <div className="flex-1 flex flex-col">
                         {/* 탭 네비게이션 */}
                           <Paper sx={{ borderBottom: '1px solid #d1d5db', bgcolor: '#f9fafb' }}>
               <div className="flex overflow-x-auto">
                 {/* 면접 단계 정보 표시 */}
                 <div className="flex items-center px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-r border-blue-200 dark:border-blue-700">
                   <Typography variant="h6" className="text-blue-700 dark:text-blue-300 font-semibold">
                     {getStageTitle()}
                   </Typography>
                   <Typography variant="body2" className="text-blue-600 dark:text-blue-400 ml-2">
                     {getStageDescription()}
                   </Typography>
                 </div>
                 
                 <Button
                   variant={activeTab === 'applicants' ? 'contained' : 'text'}
                   color="primary"
                   onClick={() => setActiveTab('applicants')}
                   className="rounded-none min-w-fit px-4 py-3"
                   startIcon={<span className="hidden sm:inline">👤</span>}
                 >
                   <div className="flex items-center space-x-1">
                     <span className="hidden sm:inline">지원자 목록</span>
                     <span className="sm:hidden">지원자</span>
                     <Chip 
                       label={`${applicants.length}개` || '0개'} 
                       size="small" 
                       color="primary" 
                       variant="outlined"
                     />
                   </div>
                 </Button>
                 <Button
                   variant={activeTab === 'questions' ? 'contained' : 'text'}
                   color="primary"
                   onClick={() => setActiveTab('questions')}
                   className="rounded-none min-w-fit px-4 py-3"
                   startIcon={<span className="hidden sm:inline">❓</span>}
                 >
                   <div className="flex items-center space-x-1">
                     <span className="hidden sm:inline">공통 질문</span>
                     <span className="sm:hidden">질문</span>
                     <Chip 
                       label={`${commonQuestions.length}개` || '0개'} 
                       size="small" 
                       color="primary" 
                       variant="outlined"
                     />
                   </div>
                 </Button>
                 
                 <Button
                   variant={activeTab === 'statistics' ? 'contained' : 'text'}
                   color="primary"
                   onClick={() => setActiveTab('statistics')}
                   className="rounded-none min-w-fit px-4 py-3"
                   startIcon={<span className="hidden sm:inline">📊</span>}
                 >
                   <div className="flex items-center space-x-1">
                     <span className="hidden sm:inline">면접 통계</span>
                     <span className="sm:hidden">통계</span>
                     <Chip 
                       label="계" 
                       size="small" 
                       color="primary" 
                       variant="outlined"
                     />
                   </div>
                 </Button>
               </div>
             </Paper>
            
            {/* 탭 컨텐츠 */}
            <div className="flex-1 flex gap-6 p-2 sm:p-4 md:p-6">
              {/* 좌측: 지원자 목록 */}
              <div className="w-[40%] min-w-[300px]">
                {activeTab === 'applicants' ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 md:p-6 h-full">
                    <Typography variant="h5" component="h3" className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-900 dark:text-gray-100">
                      지원자 목록
                    </Typography>
                    <div className="space-y-3 h-full overflow-y-auto">
                      {applicants.map((applicant, index) => (
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
                      ))}
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
              <div className="w-[30%] min-w-[280px]">
                <InterviewStatisticsPanel
                  applicants={applicants}
                  interviewStage={interviewStage}
                  onNavigateToStage={(stage) => {
                    navigate(`/interview/${jobPostId}/${stage}`);
                  }}
                />
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
                        interviewId={selectedApplicant?.id || 1} // 실제 면접 ID로 교체 필요
                        evaluatorId={user?.id || 1} // 현재 로그인한 사용자 ID
                        evaluationType={interviewStage === 'practice' ? 'PRACTICAL' : 'EXECUTIVE'}
                        jobPostId={jobPostId} // 채용공고 ID 추가
                        onEvaluationSubmit={(evaluationData) => {
                          console.log('평가 제출됨', evaluationData);
                          // 평가 데이터 처리 로직 추가 가능
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // 데스크톱: 3-분할 고정 레이아웃 + 드래그 리사이즈
                <div className="h-full flex relative select-none" style={{ marginRight: 0 }}>
                  {/* 좌측: 이력서 */}
                  <Paper 
                    sx={{ 
                      height: '100%', 
                      overflow: 'auto', 
                      borderRight: '1px solid #e5e7eb',
                      borderRadius: 0
                    }} 
                    style={{ width: leftWidth }}
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
                    
                    {/* 수직 리사이저 (좌측) */}
                    <div
                      onMouseDown={() => setDraggingCol('left')}
                      className="h-full"
                      style={{ width: gutter, cursor: 'col-resize', background: 'transparent' }}
                    />
                    
                    {/* 중앙: 질문추천(상) + 실시간 STT(하) */}
                    <Paper 
                      sx={{ 
                        height: '100%', 
                        overflow: 'hidden', 
                        borderRight: '1px solid #e5e7eb',
                        borderRadius: 0
                      }} 
                      style={{ width: middleWidth }}
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
                        
                        {/* 수평 리사이저 */}
                        <div
                          onMouseDown={() => setDraggingRow(true)}
                          style={{ height: gutter, cursor: 'row-resize', background: 'transparent' }}
                        />
                        

                      </div>
                    </Paper>
                    
                    {/* 수직 리사이저 (우측) */}
                    <div
                      onMouseDown={() => setDraggingCol('right')}
                      className="h-full"
                      style={{ width: gutter, cursor: 'col-resize', background: 'transparent' }}
                    />
                    
                    {/* 우측: 평가(5점 만점) */}
                    <Paper 
                      sx={{ 
                        height: '100%', 
                        overflow: 'auto', 
                        borderRadius: 0
                      }} 
                      style={{ width: rightWidth }}
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