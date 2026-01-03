import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import ViewPostSidebar from '../../../components/ViewPostSidebar';
import api from '../../../api/api';
import interviewApi from '../../../api/interview';
import InterviewQuestionApi from '../../../api/interviewQuestionApi';
import { FiChevronLeft, FiChevronRight, FiPlus, FiEdit, FiTrash2, FiSave } from 'react-icons/fi';
import { MdOutlineAutoAwesome } from 'react-icons/md';
import { useAuth } from '../../../context/AuthContext';
import { mapResumeData } from '../../../utils/resumeUtils';

// Import modularized components
import { CommonQuestionsPanel } from '../../../components/interview/CommonQuestionsPanel';
import ResumePanel from '../../../components/interview/ResumePanel';
import CustomQuestionsPanel from '../../../components/interview/CustomQuestionsPanel';
import QuestionRecommendationPanel from '../../../components/interview/QuestionRecommendationPanel';

import EvaluationSlider from '../../../components/interview/EvaluationSlider';
import EvaluationPanelFull from '../../../components/interview/EvaluationPanel';
import InterviewStatisticsPanel from '../../../components/interview/InterviewStatisticsPanel';

// Import progress tab components
import ApplicantListTab from '../../../components/interview/progress/ApplicantListTab';
import QuestionsTab from '../../../components/interview/progress/QuestionsTab';
import StatisticsTab from '../../../components/interview/progress/StatisticsTab';
import ChecklistTab from '../../../components/interview/progress/ChecklistTab';
import GuidelineTab from '../../../components/interview/progress/GuidelineTab';
import StrengthsTab from '../../../components/interview/progress/StrengthsTab';
import CriteriaTab from '../../../components/interview/progress/CriteriaTab';

// Mock Data Import
import { 
  mockApplicants, 
  mockJobPost, 
  mockInterviewStatistics, 
  mockQuestions, 
  mockResume 
} from '../../../api/mockData';

// Import existing better components
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
  Paper,
  Grid,
  Stack,
  Container,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  
  // 질문 관리
  const [commonQuestions, setCommonQuestions] = useState([]);
  const [customQuestions, setCustomQuestions] = useState([]);
  
  // 공통 도구 상태
  const [commonChecklist, setCommonChecklist] = useState(null);
  const [commonGuideline, setCommonGuideline] = useState(null);
  const [commonStrengths, setCommonStrengths] = useState(null);
  const [commonCriteria, setCommonCriteria] = useState(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  
  // 패널 상태
  const [showSelectionScreen, setShowSelectionScreen] = useState(true);
  const [activeTab, setActiveTab] = useState('applicants'); 
  
  console.log('🏗️ InterviewProgress 렌더링 - showSelectionScreen:', showSelectionScreen);  
  // 레이아웃 상태
  const [layoutOffsets, setLayoutOffsets] = useState({ top: 120, left: 90 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 필터링 상태
  const [filterStatus, setFilterStatus] = useState(null);

  // 실시간 분석 상태
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
      if (!jobPostId) return;
      try {
        const endpoint = interviewStage === 'executive'
          ? `/applications/job/${jobPostId}/applicants-executive-interview`
          : `/applications/job/${jobPostId}/applicants-practical-interview`;
        
        const res = await api.get(endpoint);
        let data = [];
        if (res.data) {
          data = res.data.applicants || (Array.isArray(res.data) ? res.data : []);
        }
        setApplicants(data);
      } catch (err) {
        console.error('지원자 목록 로드 실패:', err);
        setApplicants(mockApplicants);
      }
    };
      fetchApplicants();
  }, [jobPostId, interviewStage]);

  // 공고 정보, 통계, 질문, 분석 도구 통합 로드
  useEffect(() => {
    const loadAllInitialData = async () => {
      if (!jobPostId) return;
      
      try {
        setLoading(true);
        // 1. 공고 정보 로드
        const jobData = await interviewApi.getJobPost(jobPostId);
        setJobPost(jobData);
        const companyName = jobData?.company?.name || "";

        // 2. 나머지 데이터 병렬 로드
        setStatisticsLoading(true);
      setToolsLoading(true);
        
        const [questionsRes, statsData, toolsResults] = await Promise.allSettled([
          InterviewQuestionApi.getCommonQuestions(jobPostId, interviewStage),
          interviewApi.getInterviewStatistics(jobPostId),
          Promise.allSettled([
          InterviewQuestionApi.getJobBasedChecklist(jobPostId),
          InterviewQuestionApi.getJobBasedGuideline(jobPostId),
          InterviewQuestionApi.getJobBasedStrengths(jobPostId),
          InterviewQuestionApi.getJobBasedEvaluationCriteria(jobPostId)
          ])
        ]);

        if (questionsRes.status === 'fulfilled' && questionsRes.value) {
          const res = questionsRes.value;
          setCommonQuestions([
            ...(res.common_questions || []).map(q => ({ ...q, type: 'COMMON' })),
            ...(res.job_specific_questions || []).map(q => ({ ...q, type: interviewStage === 'executive' ? 'EXECUTIVE' : 'JOB' }))
          ]);
        }
        
        if (statsData.status === 'fulfilled') {
          setInterviewStatistics(statsData.value.statistics);
          setUpcomingInterviews(statsData.value.upcoming_interviews || []);
        }

        if (toolsResults.status === 'fulfilled') {
          const [checkRes, guideRes, strengthRes, criteriaRes] = toolsResults.value;
          const checklist = checkRes.status === 'fulfilled' ? checkRes.value : null;
          const guideline = guideRes.status === 'fulfilled' ? guideRes.value : null;
          const strengths = strengthRes.status === 'fulfilled' ? strengthRes.value : null;
          const criteria = criteriaRes.status === 'fulfilled' ? criteriaRes.value : null;

          setCommonChecklist(checklist);
          setCommonGuideline(guideline);
          setCommonStrengths(strengths);
          setCommonCriteria(criteria);

          if (!checklist) InterviewQuestionApi.generateJobBasedChecklist(jobPostId, companyName);
          if (!guideline) InterviewQuestionApi.generateJobBasedGuideline(jobPostId, companyName);
          if (!strengths) InterviewQuestionApi.generateJobBasedStrengths(jobPostId, companyName);
          if (!criteria) InterviewQuestionApi.generateJobBasedEvaluationCriteria(jobPostId, companyName);
        }

      } catch (err) {
        console.error('초기 데이터 로드 통합 실패:', err);
      } finally {
        setLoading(false);
        setStatisticsLoading(false);
        setToolsLoading(false);
      }
    };

    loadAllInitialData();
  }, [jobPostId, interviewStage]);

  // 지원자 선택 핸들러 (즉시 전환 최적화)
  const handleSelectApplicant = async (applicant) => {
    if (!applicant) return;
    console.log('🚀 [START] handleSelectApplicant 실행');
    
    // 1. [최우선] 즉시 화면 전환 (상태 업데이트 전)
    setShowSelectionScreen(false);
    console.log('📺 화면 전환 (setShowSelectionScreen(false))');

      const applicationId = applicant.application_id || applicant.applicant_id || applicant.id;
    
    // 2. 지원자 기본 정보 설정
    setSelectedApplicant({ ...applicant, id: applicationId });
    
    try {
      console.log('📡 상세 데이터 로드 시작...', applicationId);
      const data = await interviewApi.getApplication(applicationId);
      
      setSelectedApplicant(prev => ({
        ...(prev || {}),
        ...data,
        id: applicationId,
        name: data.name || data.applicantName || prev?.name || applicant.name
      }));
      
      const mappedResume = mapResumeData(data);
      setResume(mappedResume);
      
      await fetchStageQuestions(applicationId);
      console.log('✅ 모든 데이터 로드 완료');
    } catch (err) {
      console.error('❌ 지원자 상세 로드 실패:', err);
      setResume(mockResume);
    }
  };

  const fetchStageQuestions = async (applicationId) => {
    try {
      let data = {};
      if (interviewStage === 'executive') data = await InterviewQuestionApi.getExecutiveQuestions(applicationId);
      else data = await InterviewQuestionApi.getPracticalQuestions(applicationId);

      if (data?.questions) {
        setCommonQuestions(data.questions.map(q => ({
          ...q,
          type: q.type || (interviewStage === 'executive' ? 'EXECUTIVE' : 'JOB'),
          difficulty: q.difficulty || 'medium'
        })));
      }

      try {
        const personalRes = await InterviewQuestionApi.getPersonalQuestions(applicationId);
        if (personalRes?.questions) {
          setCustomQuestions(personalRes.questions.map(q => ({
            question_text: typeof q === 'string' ? q : q.question_text,
            type: 'PERSONAL',
            difficulty: 'hard'
          })));
        }
      } catch (e) {
        setCustomQuestions([
          { question_text: '주요 프로젝트 경험에 대해 설명해주세요.', type: 'JOB', difficulty: 'medium' },
          { question_text: '어려운 기술 문제를 해결한 경험을 공유해주세요.', type: 'JOB', difficulty: 'hard' }
        ]);
      }
    } catch (err) { console.error('질문 로드 실패:', err); }
  };

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleEvaluationSubmit = (data) => { alert('평가가 저장되었습니다.'); };

  const handleSTTToggle = async () => {
    if (isRealtimeAnalysisEnabled) stopSTT();
    else startSTT();
  };

  const startSTT = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => processAudioChunk(new Blob(chunks, { type: 'audio/wav' }));
      recorder.start(3000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsRealtimeAnalysisEnabled(true);
      startRealtimeAnalysis(stream);
    } catch (error) { alert('마이크 권한이 필요합니다.'); }
  };

  const stopSTT = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) audioContextRef.current.close();
    setIsRecording(false);
    setIsRealtimeAnalysisEnabled(false);
  };

  const startRealtimeAnalysis = (stream) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      microphone.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const analyze = () => {
        if (!isRecording) return;
        analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
      if (avg > 30) captureAudioChunk(stream);
      requestAnimationFrame(analyze);
    };
    analyze();
  };

  const captureAudioChunk = async (stream) => {
    const recorder = new MediaRecorder(stream);
      const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => processAudioChunk(new Blob(chunks, { type: 'audio/wav' }));
    recorder.start();
    setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 2000);
  };

  const processAudioChunk = async (blob) => {
      const apiKey = import.meta.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) return;
      const formData = new FormData();
    formData.append('audio', blob, 'recording.wav');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ko');
    try {
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      });
      const result = await res.json();
      if (result.text) setRealtimeAnalysisResults(prev => [{ id: Date.now(), text: result.text, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)]);
    } catch (e) { console.error('Whisper 실패:', e); }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#f7faff] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredApplicants = applicants.filter(a => {
    if (!filterStatus) return true;
    const statusField = interviewStage === 'executive' ? 'executive_interview_status' : 'practical_interview_status';
    return (a[statusField] || 'PENDING') === filterStatus;
  });

  return (
    <Container maxWidth={false} disableGutters className="relative min-h-screen bg-[#f7faff] text-gray-900 overflow-x-hidden">
      <Navbar />
      <ViewPostSidebar jobPost={jobPost} />
      
      <div className="flex-1" style={{ paddingTop: layoutOffsets.top, marginLeft: layoutOffsets.left, height: `calc(100vh - ${layoutOffsets.top}px)` }}>
        {showSelectionScreen ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <Paper elevation={0} sx={{ borderBottom: '1px solid #e5e7eb', bgcolor: 'white', p: 3, flexShrink: 0 }}>
              {/* 🎨 3D 파스텔 카드 헤더 복구 */}
              <div className={`rounded-2xl p-6 shadow-sm border transition-all duration-300 hover:shadow-md ${interviewStage === 'executive' ? 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 border-purple-100' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 border-blue-100'}`}>
                 <div className="flex justify-between items-center">
                   <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                      {interviewStage === 'executive' ? <AssessmentIcon fontSize="large" className="text-purple-600" /> : <LightbulbIcon fontSize="large" className="text-blue-600" />}
                     </div>
                     <div>
                       <div className="flex items-center gap-3 mb-1">
                        <Typography variant="h5" className="font-bold text-slate-800">
                          {interviewStage === 'executive' ? '임원진 면접' : '실무진 면접'}
                         </Typography>
                        <Chip label={interviewStage === 'executive' ? '최종 결정' : '심층 평가'} size="small" className="bg-white/80 text-blue-700 font-bold border-blue-200" />
                       </div>
                      <Typography variant="body1" className="text-slate-600">면접 대상자를 선택하여 평가를 시작하세요.</Typography>
                     </div>
                   </div>
                   <div className="flex gap-3">
                     <div className="px-5 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-center min-w-[100px]">
                      <div className="text-xs text-gray-500 font-medium uppercase">전체</div>
                       <div className="text-2xl font-extrabold text-gray-800">{applicants.length}</div>
                     </div>
                    <div className="px-5 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-center min-w-[100px]">
                      <div className="text-xs text-blue-600 font-medium uppercase">평가 완료</div>
                      <div className="text-2xl font-extrabold text-blue-700">{applicants.filter(a => (a.interview_status || '').includes('COMPLETED')).length}</div>
                     </div>
                   </div>
                 </div>
               </div>

              {/* 🎨 아이콘 포함 탭 버튼 디자인 복구 */}
              <div className="flex mt-6 px-2 border-b border-gray-100 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'applicants', label: '지원자 목록', icon: '👤', count: filteredApplicants.length },
                  { id: 'questions', label: '공통 질문', icon: '❓', count: commonQuestions.length },
                  { id: 'statistics', label: '면접 통계', icon: '📊' },
                  { id: 'checklist', label: '체크리스트', icon: '📋' },
                  { id: 'guideline', label: '가이드라인', icon: '📖' },
                  { id: 'strengths', label: '강점/약점', icon: '💪' },
                  { id: 'criteria', label: '평가 기준', icon: '🎯' }
                ].map(tab => (
                  <Button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-none min-w-fit px-6 py-3 border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-700 bg-white font-bold' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                   <div className="flex items-center space-x-2">
                      <span>{tab.icon}</span>
                      <span className="whitespace-nowrap">{tab.label}</span>
                      {tab.count !== undefined && <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>{tab.count}</span>}
                   </div>
                 </Button>
                ))}
               </div>
             </Paper>
            
            <div className="flex-1 flex gap-6 p-6 overflow-hidden bg-[#f7faff]">
              <div className={`h-full flex flex-col transition-all duration-300 ${activeTab === 'applicants' ? 'w-[72%]' : 'w-full'}`}>
                {activeTab === 'applicants' ? (
                  <ApplicantListTab 
                    filteredApplicants={filteredApplicants}
                    selectedApplicant={selectedApplicant}
                    handleSelectApplicant={handleSelectApplicant} 
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus} 
                    interviewStage={interviewStage}
                  />
                ) : activeTab === 'statistics' ? (
                  <StatisticsTab statistics={interviewStatistics} loading={statisticsLoading} />
                ) : activeTab === 'checklist' ? (
                  <ChecklistTab loading={toolsLoading} checklist={commonChecklist} />
                ) : activeTab === 'guideline' ? (
                  <GuidelineTab loading={toolsLoading} guideline={commonGuideline} />
                ) : activeTab === 'strengths' ? (
                  <StrengthsTab loading={toolsLoading} strengths={commonStrengths} />
                ) : activeTab === 'criteria' ? (
                  <CriteriaTab loading={toolsLoading} criteria={commonCriteria} />
                ) : (
                  <QuestionsTab questions={commonQuestions} onQuestionsChange={setCommonQuestions} />
                )}
              </div>
              {activeTab === 'applicants' && (
                <div className="w-[28%] min-w-[300px] h-full overflow-y-auto">
                  <InterviewStatisticsPanel applicants={applicants} interviewStage={interviewStage} filterStatus={filterStatus} onFilterChange={setFilterStatus} onNavigateToStage={(s) => navigate(`/interview-progress/${jobPostId}/${s}`)} statistics={interviewStatistics} todayInterviews={upcomingInterviews} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-white">
            <div className="border-b p-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                <Button variant="outlined" startIcon={<FiChevronLeft />} onClick={() => setShowSelectionScreen(true)} className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50">지원자 목록</Button>
                <div className="flex items-center gap-3">
                  <Typography variant="h6" className="font-bold text-gray-800">{selectedApplicant?.name} 면접</Typography>
                  <Chip label={interviewStage === 'executive' ? '임원진' : '실무진'} size="small" color="primary" variant="soft" className="font-bold bg-blue-50 text-blue-600" />
                  </div>
                </div>
              <Button variant={isRealtimeAnalysisEnabled ? "contained" : "outlined"} color={isRealtimeAnalysisEnabled ? "error" : "primary"} startIcon={isRealtimeAnalysisEnabled ? <MicOffIcon /> : <MicIcon />} onClick={handleSTTToggle} className="rounded-xl px-6">{isRealtimeAnalysisEnabled ? "STT 중지" : "STT 시작"}</Button>
                </div>
            
            <div className="flex-1 flex overflow-hidden">
              <div className="w-[32%] border-r overflow-y-auto p-4 bg-gray-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-blue-500 rounded-full" />
                  <Typography variant="h6" className="font-bold text-gray-800">이력서</Typography>
              </div>
                <ResumeCard resume={resume} loading={false} jobpostId={jobPostId} applicationId={selectedApplicant?.application_id || selectedApplicant?.id} />
            </div>
              <div className="w-[36%] border-r overflow-y-auto p-4">
                <QuestionRecommendationPanel resume={resume} applicantName={selectedApplicant?.name} applicationId={selectedApplicant?.application_id || selectedApplicant?.id} interviewType={interviewStage === 'practice' ? 'practical' : 'executive'} isRealtimeAnalysisEnabled={isRealtimeAnalysisEnabled} isRecording={isRecording} realtimeAnalysisResults={realtimeAnalysisResults} onSTTToggle={handleSTTToggle} onRemoveSTTResult={id => setRealtimeAnalysisResults(prev => prev.filter(r => r.id !== id))} onClearSTTResults={() => setRealtimeAnalysisResults([])} />
                </div>
              <div className="w-[32%] overflow-y-auto p-4 bg-gray-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                  <Typography variant="h6" className="font-bold text-gray-800">면접 평가</Typography>
                        </div>
                <EvaluationPanelFull selectedApplicant={selectedApplicant} interviewId={selectedApplicant?.id || 1} evaluatorId={user?.id || 1} evaluationType={interviewStage === 'practice' ? 'PRACTICAL' : 'EXECUTIVE'} jobPostId={jobPostId} onEvaluationSubmit={handleEvaluationSubmit} />
                      </div>
                  </div>
              </div>
          )}
        </div>
      </Container>
    );
  }

export default InterviewProgress;
