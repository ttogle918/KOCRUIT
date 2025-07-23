import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import InterviewApplicantList from './InterviewApplicantList';
import InterviewPanel from './InterviewPanel';
import InterviewPanelSelector from '../../components/InterviewPanelSelector';
import InterviewerEvaluationPanel from '../../components/InterviewerEvaluationPanel';
import DraggableResumeWindow from '../../components/DraggableResumeWindow';
import AiInterviewSystem from './AiInterviewSystem';
import api from '../../api/api';
import AiInterviewApi from '../../api/aiInterviewApi';
import { FiChevronLeft, FiChevronRight, FiSave, FiPlus, FiPlay } from 'react-icons/fi';
import { MdOutlineAutoAwesome, MdOutlineOpenInNew } from 'react-icons/md';
import { FaUsers } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { mapResumeData } from '../../utils/resumeUtils';
import CommonInterviewQuestionsPanel from '../../components/CommonInterviewQuestionsPanel';
import ApplicantQuestionsPanel from '../../components/ApplicantQuestionsPanel';
import DraggablePanel from '../../components/DraggablePanel';
import PanelLayoutManager from '../../components/PanelLayoutManager';
import RecommendedApplicantList from '../../components/RecommendedApplicantList';
import ResumeGrid from '../../components/ResumeGrid';
import ResumePage from '../resume/ResumePage';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';

function InterviewProgress() {
  const { jobPostId, interviewStage = 'first', applicantId } = useParams(); // applicantId 파라미터 추가
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 디버깅용 로그
  console.log('🔍 InterviewProgress 파라미터:', { jobPostId, interviewStage, applicantId });
  
  // 면접 단계별 설정
  const isAiInterview = interviewStage === 'ai'; // AI 면접
  const isFirstInterview = interviewStage === 'first'; // 1차 면접 (실무진)
  const isSecondInterview = interviewStage === 'second'; // 2차 면접 (임원)
  
  // 면접 단계별 제목 및 설정
  const interviewConfig = {
    ai: {
      title: 'AI 면접',
      subtitle: 'AI 기반 자동 면접 진행',
      evaluatorType: 'AI',
      color: 'green'
    },
    first: {
      title: '1차 면접 (실무진)',
      subtitle: '실무 역량 및 기술 검증',
      evaluatorType: 'PRACTICAL',
      color: 'blue'
    },
    second: {
      title: '2차 면접 (임원)',
      subtitle: '리더십 및 문화 적합성 검증',
      evaluatorType: 'EXECUTIVE',
      color: 'purple'
    }
  };
  
  const currentConfig = interviewConfig[interviewStage] || interviewConfig.first;
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [selectedApplicantIndex, setSelectedApplicantIndex] = useState(null);
  const [resume, setResume] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [interviewChecklist, setInterviewChecklist] = useState(null);
  const [strengthsWeaknesses, setStrengthsWeaknesses] = useState(null);
  const [interviewGuideline, setInterviewGuideline] = useState(null);
  const [evaluationCriteria, setEvaluationCriteria] = useState(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [memo, setMemo] = useState('');
  const [evaluation, setEvaluation] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobPost, setJobPost] = useState(null);
  const [jobPostLoading, setJobPostLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [lastSaved, setLastSaved] = useState(null); // 마지막 저장된 평가/메모 상태
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false); // 자동 저장 상태 추가
  const [existingEvaluationId, setExistingEvaluationId] = useState(null); // 기존 평가 ID
  const saveTimer = useRef(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true); // 자동저장 ON이 기본값
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 좌측 width 드래그 조절 및 닫기/열기
  const [leftWidth, setLeftWidth] = useState(240);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const isDragging = useRef(false);

  // 공통 면접 질문 상태
  const [commonQuestions, setCommonQuestions] = useState([]);

  // 공고 기반 면접 도구 상태
  const [commonChecklist, setCommonChecklist] = useState(null);
  const [commonGuideline, setCommonGuideline] = useState(null);
  const [commonCriteria, setCommonCriteria] = useState(null);
  const [commonStrengths, setCommonStrengths] = useState(null);
  const [commonToolsLoading, setCommonToolsLoading] = useState(false);
  const [commonQuestionsLoading, setCommonQuestionsLoading] = useState(false);
  const [commonQuestionsError, setCommonQuestionsError] = useState(null);
  const [preloadingStatus, setPreloadingStatus] = useState('idle'); // 'idle', 'loading', 'completed'

  // 새로운 UI 시스템 상태
  const [activePanel, setActivePanel] = useState('common-questions'); // 기본값으로 설정
  
  // AI 면접인 경우 activePanel을 'ai'로 설정하는 useEffect 추가
  useEffect(() => {
    if (isAiInterview) {
      setActivePanel('ai');
    }
  }, [isAiInterview]);

  // 패널 변경 핸들러 (모달 표시)
  const handlePanelChange = (panelId) => {
    setActivePanel(panelId);
    setShowPanelModal(true);
  };
  const [panelSelectorCollapsed, setPanelSelectorCollapsed] = useState(true); // 첫 화면에서 접힌 상태로 시작
  const [resumeWindows, setResumeWindows] = useState([]); // 다중 이력서 창 관리
  const [activeResumeWindow, setActiveResumeWindow] = useState(null);
  const [resumeWindowCounter, setResumeWindowCounter] = useState(0);
  const [currentApplicantsDrawerOpen, setCurrentApplicantsDrawerOpen] = useState(false); // 현재 면접자들 Drawer
  const [draggablePanels, setDraggablePanels] = useState([]); // 드래그 가능한 패널들
  const [useDraggableLayout, setUseDraggableLayout] = useState(false); // 드래그 가능한 레이아웃 사용 여부
  const [useRecommendedLayout, setUseRecommendedLayout] = useState(false); // 권장 레이아웃 사용 여부
  const [showPanelModal, setShowPanelModal] = useState(false); // 패널 모달 표시 여부

  // AI 면접 시스템으로 리다이렉트 (지원자가 선택된 경우)
  console.log('🔍 AI 면접 리다이렉트 조건 확인:', { isAiInterview, applicantId, condition: isAiInterview && applicantId });

  // 백그라운드 이력서 및 면접 도구 프리로딩 함수
  const preloadResumes = async (applicants) => {
    if (!applicants || applicants.length === 0) return;
    
    setPreloadingStatus('loading');
    console.log('🔄 백그라운드 프리로딩 시작...');
    
    try {
      // 1단계: 모든 지원자의 이력서를 병렬로 프리로딩
      const resumePromises = applicants.map(async (applicant) => {
        const id = applicant.applicant_id || applicant.id;
        try {
          // 백그라운드에서 이력서 데이터를 캐시에 저장
          const resumeRes = await api.get(`/applications/${id}`);
          return { success: true, applicantId: id, resumeData: resumeRes.data };
        } catch (error) {
          console.warn(`이력서 프리로딩 실패 (${id}):`, error);
          return { success: false, applicantId: id, error };
        }
      });
      
      const resumeResults = await Promise.allSettled(resumePromises);
      const successfulResumes = resumeResults
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value);
      
      console.log(`✅ 이력서 프리로딩 완료: ${successfulResumes.length}/${applicants.length} 성공`);
      
      // 2단계: 성공한 이력서에 대해 면접 도구 프리로딩 (선택적)
      if (successfulResumes.length > 0 && jobPost?.company?.name) {
        console.log('🔄 면접 도구 프리로딩 시작...');
        
        // 첫 번째 지원자에 대해서만 면접 도구 프리로딩 (비용 절약)
        const firstResume = successfulResumes[0];
        const workflowRequest = {
          resume_id: firstResume.resumeData.resume_id,
          application_id: firstResume.applicantId,
          company_name: jobPost.company.name,
          name: applicants.find(a => (a.applicant_id || a.id) === firstResume.applicantId)?.name || '',
          interview_stage: interviewStage,
          evaluator_type: currentConfig.evaluatorType
        };
        
        try {
          // 면접 도구들을 병렬로 프리로딩
          await Promise.allSettled([
            api.post('/interview-questions/interview-checklist', workflowRequest),
            api.post('/interview-questions/strengths-weaknesses', workflowRequest),
            api.post('/interview-questions/interview-guideline', workflowRequest),
            api.post('/interview-questions/evaluation-criteria', workflowRequest)
          ]);
          console.log('✅ 면접 도구 프리로딩 완료');
        } catch (error) {
          console.warn('면접 도구 프리로딩 실패:', error);
        }
      }
      
      console.log(`🎉 전체 프리로딩 완료: ${successfulResumes.length}/${applicants.length} 지원자`);
      setPreloadingStatus('completed');
    } catch (error) {
      console.error('백그라운드 프리로딩 오류:', error);
      setPreloadingStatus('completed');
    }
  };

  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true);
      setError(null);
      try {
        // 면접 단계에 따라 다른 API 호출
        let endpoint;
        if (isAiInterview) {
          endpoint = `/applications/job/${jobPostId}/applicants-with-ai-interview`;
        } else if (isFirstInterview) {
          endpoint = `/applications/job/${jobPostId}/applicants-with-interview`;
        } else {
          endpoint = `/applications/job/${jobPostId}/applicants-with-second-interview`;
        }
        
        const res = await api.get(endpoint);
        setApplicants(res.data);

        // 1. 면접시간 기준 정렬
        const sorted = [...res.data].sort((a, b) => new Date(a.schedule_date) - new Date(b.schedule_date));
        if (sorted.length > 0) {
          // 2. 첫 지원자만 상세 fetch
          handleApplicantClick(sorted[0], 0);
        }
        
        // 3. 백그라운드에서 나머지 지원자 이력서 프리로딩
        setTimeout(() => {
          preloadResumes(res.data);
        }, 1000); // 1초 후 백그라운드 프리로딩 시작
        
      } catch (err) {
        setError('지원자 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    if (jobPostId) fetchApplicants();
  }, [jobPostId, isAiInterview, isFirstInterview, isSecondInterview]);

  useEffect(() => {
    const fetchJobPost = async () => {
      setJobPostLoading(true);
      try {
        const res = await api.get(`/company/jobposts/${jobPostId}`);
        setJobPost(res.data);
      } catch (err) {
        setJobPost(null);
      } finally {
        setJobPostLoading(false);
      }
    };
    if (jobPostId) fetchJobPost();
  }, [jobPostId]);

  const fetchApplicantQuestions = async (resumeId, companyName, applicantName, applicationId) => {
    const requestData = { 
      resume_id: resumeId, 
      company_name: companyName, 
      name: applicantName,
      application_id: applicationId,
      interview_stage: interviewStage, // 면접 단계 추가
      evaluator_type: currentConfig.evaluatorType // 평가자 유형 추가
    };
    try {
      let endpoint;
      if (isAiInterview) {
        // AI 면접: applicationId로 질문 조회
        try {
          const data = await AiInterviewApi.getAiInterviewQuestionsByApplication(applicationId);
          if (data && data.total_count > 0) {
            const allQuestions = [];
            Object.values(data.questions).forEach(categoryQuestions => {
              allQuestions.push(...categoryQuestions.map(q => q.question_text));
            });
            setQuestions(allQuestions);
            console.log(`✅ 기존 AI 면접 질문 ${data.total_count}개 로드`);
            return;
          }
        } catch (error) {
          console.log('기존 AI 면접 질문 없음, 새로 생성합니다.');
        }
        // 기존 질문이 없으면 새로 생성하고 DB에 저장
        endpoint = '/interview-questions/ai-interview-save';
        const res = await api.post(endpoint, { ...requestData, save_to_db: true });
        setQuestions(res.data.questions ? res.data.questions.split('\n') : []);
        console.log(`✅ AI 면접 질문 ${res.data.saved_questions_count}개 생성 및 저장 완료`);
      } else if (isFirstInterview) {
        endpoint = '/interview-questions/project-questions';
        const res = await api.post(endpoint, requestData);
        setQuestions(res.data.questions || []);
      } else {
        endpoint = '/interview-questions/executive-interview';
        const res = await api.post(endpoint, requestData);
        setQuestions(res.data.questions || []);
      }
    } catch (e) {
      console.error('면접 질문 생성 오류:', e);
      setQuestions([]);
    }
  };

  // LangGraph 워크플로우를 사용한 면접 도구 생성
  const fetchInterviewToolsWithWorkflow = async (resumeId, applicationId, companyName, applicantName) => {
    if (!resumeId) return;
    setToolsLoading(true);
    
    try {
      // LangGraph 워크플로우를 사용한 종합 분석
      const workflowRequest = { 
        resume_id: resumeId, 
        application_id: applicationId, 
        company_name: companyName, 
        name: applicantName,
        interview_stage: interviewStage, // 면접 단계 추가
        evaluator_type: currentConfig.evaluatorType // 평가자 유형 추가
      };
      
      // 면접 단계에 따라 다른 엔드포인트 사용
      let endpoint;
      if (isAiInterview) {
        endpoint = '/interview-questions/ai-tools';
      } else if (isFirstInterview) {
        endpoint = '/interview-questions/project-questions';
      } else {
        endpoint = '/interview-questions/executive-tools';
      }
      
      // 워크플로우 결과에서 평가 도구 추출
      const workflowRes = await api.post(endpoint, workflowRequest);
      const workflowData = workflowRes.data;
      
      // 평가 도구가 포함된 경우 사용
      if (workflowData.evaluation_tools) {
        setInterviewChecklist(workflowData.evaluation_tools.checklist || null);
        setStrengthsWeaknesses(workflowData.evaluation_tools.strengths_weaknesses || null);
        setInterviewGuideline(workflowData.evaluation_tools.guideline || null);
        setEvaluationCriteria(workflowData.evaluation_tools.evaluation_criteria || null);
      } else {
        // 기존 방식으로 폴백
        const [
          checklistRes,
          strengthsRes,
          guidelineRes,
          criteriaRes
        ] = await Promise.allSettled([
          api.post('/interview-questions/interview-checklist', workflowRequest),
          api.post('/interview-questions/strengths-weaknesses', workflowRequest),
          api.post('/interview-questions/interview-guideline', workflowRequest),
          api.post('/interview-questions/evaluation-criteria', workflowRequest)
        ]);
        setInterviewChecklist(checklistRes.status === 'fulfilled' ? checklistRes.value.data : null);
        setStrengthsWeaknesses(strengthsRes.status === 'fulfilled' ? strengthsRes.value.data : null);
        setInterviewGuideline(guidelineRes.status === 'fulfilled' ? guidelineRes.value.data : null);
        setEvaluationCriteria(criteriaRes.status === 'fulfilled' ? criteriaRes.value.data : null);
      }
    } catch (e) {
      console.error('면접 도구 생성 오류:', e);
      setInterviewChecklist(null);
      setStrengthsWeaknesses(null);
      setInterviewGuideline(null);
      setEvaluationCriteria(null);
    } finally {
      setToolsLoading(false);
    }
  };

  // 드래그 핸들러
  const handleMouseDown = (e) => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
  };
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current || !isLeftOpen) return;
      const min = 160, max = 400;
      setLeftWidth(Math.max(min, Math.min(max, e.clientX - 90)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isLeftOpen]);

  const handleApplicantClick = async (applicant, index) => {
    const id = applicant.applicant_id || applicant.id;
    // 지원자 클릭 시 Drawer(공통질문패널) 자동 오픈 로직 제거
    setSelectedApplicantIndex(index);
    setResume(null);
    try {
      const res = await api.get(`/applications/${id}`);
      const mappedResume = mapResumeData(res.data);
      setResume(mappedResume);
      // applicant_id를 id로 설정하여 일관성 유지
      setSelectedApplicant({
        ...applicant,
        id: applicant.applicant_id || applicant.id
      });
      setMemo('');
      setEvaluation({});
      setExistingEvaluationId(null);
      
      // 지원자 클릭 시 자동으로 이력서 창 열기
      openResumeWindow(applicant, mappedResume);
      
      // LangGraph 워크플로우를 사용한 면접 도구 및 질문 생성
      await fetchInterviewToolsWithWorkflow(
        mappedResume.id,
        applicant.applicant_id || applicant.id,
        jobPost?.company?.name,
        applicant.name
      );
      await fetchApplicantQuestions(mappedResume.id, jobPost?.company?.name, applicant.name, applicant.applicant_id || applicant.id);
    } catch (err) {
      console.error('지원자 데이터 로드 실패:', err);
      setResume(null);
      setInterviewChecklist(null);
      setStrengthsWeaknesses(null);
      setInterviewGuideline(null);
      setEvaluationCriteria(null);
    }
  };

  const handleEvaluationChange = (item, level) => {
    setEvaluation(prev => ({ ...prev, [item]: level }));
  };

  // 평가 저장 핸들러 (자동 저장용, 중복 방지)
  const handleSaveEvaluation = async (auto = false) => {
    if (auto && !autoSaveEnabled) return; // 오토세이브 OFF면 무시
    if (!selectedApplicant || !user?.id) {
      if (!auto) setSaveStatus('지원자 또는 평가자 정보가 없습니다.');
      return;
    }
    
    // 새로운 평가 항목 배열로 변환
    const evaluationItems = [];
    Object.entries(evaluation).forEach(([category, items]) => {
      Object.entries(items || {}).forEach(([item, score]) => {
        if (score && typeof score === 'number') {
          // 점수에 따른 등급 계산
          let grade = 'C';
          if (score >= 4) grade = 'A';
          else if (score >= 3) grade = 'B';
          
          evaluationItems.push({
            evaluate_type: `${category}_${item}`,
            evaluate_score: score,
            grade: grade,
            comment: `${category}의 ${item} 평가`
          });
        }
      });
    });
    
    // 기존 details 배열 (호환성)
    const details = [];
    Object.entries(evaluation).forEach(([category, items]) => {
      Object.entries(items || {}).forEach(([grade, score]) => {
        if (score) {
          details.push({ category, grade, score });
        }
      });
    });
    
    // 평균점수 계산
    const allScores = evaluationItems.map(d => d.evaluate_score).filter(s => typeof s === 'number');
    const avgScore = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : null;
    
    // 변경사항이 없으면 저장하지 않음
    const current = JSON.stringify({ evaluation, memo });
    if (lastSaved === current && auto) {
      if (auto) setIsAutoSaving(false); // <- 이 줄이 반드시 필요!
      return;
    }
    
    // 저장 상태 설정
    if (auto) {
      setIsAutoSaving(true);
    } else {
      setIsSaving(true);
    }
    
    // 실제 interview_id 찾기
    let interviewId = null;
    try {
      // selectedApplicant.id가 유효한지 확인
      if (!selectedApplicant.id) {
        console.warn('selectedApplicant.id가 undefined입니다.');
        setSaveStatus('지원자 정보가 올바르지 않습니다.');
        return;
      }
      
      // schedule_interview 테이블에서 해당 지원자의 면접 ID 조회
      const scheduleResponse = await api.get(`/interview-evaluations/interview-schedules/applicant/${selectedApplicant.id}`);
      if (scheduleResponse.data && scheduleResponse.data.length > 0) {
        interviewId = scheduleResponse.data[0].id;
      }
    } catch (scheduleError) {
      console.error('면접 일정 조회 오류:', scheduleError);
      interviewId = null;
    }
    if (!interviewId) {
      setSaveStatus('면접 일정이 존재하지 않아 평가를 저장할 수 없습니다.');
      return;
    }

    // 항상 최신 평가ID를 GET해서 분기
    let evaluationId = null;
    try {
      const existingResponse = await api.get(`/interview-evaluations/interview/${interviewId}/evaluator/${user.id}`);
      if (existingResponse.data && existingResponse.data.id) {
        evaluationId = existingResponse.data.id;
        setExistingEvaluationId(evaluationId);
      } else {
        setExistingEvaluationId(null);
      }
    } catch (e) {
      setExistingEvaluationId(null);
    }
    
    const evaluationData = {
      interview_id: interviewId,
      evaluator_id: user.id,
      is_ai: false, // 수동 평가
      total_score: avgScore,  // score -> total_score로 변경
      summary: memo,
      status: 'SUBMITTED', // 평가 완료 상태
      details,  // 기존 호환성
      evaluation_items: evaluationItems,  // 새로운 구조
      interview_stage: interviewStage, // 면접 단계 추가
      evaluator_type: currentConfig.evaluatorType // 평가자 유형 추가
    };
    
    try {
      let response;
      if (evaluationId) {
        // 기존 평가 업데이트
        response = await api.put(`/interview-evaluations/${evaluationId}`, evaluationData);
        setSaveStatus(auto ? '자동 저장 완료' : '평가가 업데이트되었습니다!');
      } else {
        // 새 평가 생성
        response = await api.post('/interview-evaluations', evaluationData);
        if (response.data && response.data.id) {
          setExistingEvaluationId(response.data.id);
        }
        setSaveStatus(auto ? '자동 저장 완료' : '평가가 저장되었습니다!');
      }
      
      setLastSaved(current);
    } catch (err) {
      console.error('평가 저장 오류:', err);
      setSaveStatus('저장 실패: ' + (err.response?.data?.detail || '오류'));
    } finally {
      if (auto) {
        setIsAutoSaving(false);
      } else {
        setIsSaving(false);
      }
    }
  };

  // 자동저장 토글 핸들러
  const handleToggleAutoSave = () => setAutoSaveEnabled((prev) => !prev);

  // 권장 레이아웃 토글 핸들러
  const handleToggleRecommendedLayout = () => {
    setUseRecommendedLayout(prev => !prev);
    if (!useRecommendedLayout) {
      setUseDraggableLayout(false); // 권장 레이아웃 활성화 시 드래그 레이아웃 비활성화
    }
  };

  // 패널 모달 렌더링 함수
  const renderPanelModal = () => {
    if (!showPanelModal) return null;

    const modalContent = () => {
      switch (activePanel) {
        case 'common-questions':
          return (
            <CommonInterviewQuestionsPanel
              questions={commonQuestions}
              onChange={setCommonQuestions}
              fullWidth={true}
              resumeId={resume?.id}
              jobPostId={jobPostId}
              applicationId={selectedApplicant?.id}
              companyName={jobPost?.company?.name}
              applicantName={selectedApplicant?.name}
              interviewChecklist={commonChecklist}
              strengthsWeaknesses={null} // ❌ 개별 분석 데이터 제거
              interviewGuideline={commonGuideline}
              evaluationCriteria={commonCriteria}
              toolsLoading={commonToolsLoading || commonQuestionsLoading}
              error={commonQuestionsError}
            />
          );
        case 'applicant-questions':
          return (
            <ApplicantQuestionsPanel
              questions={questions}
              onChange={setQuestions}
              fullWidth={true}
              applicantName={selectedApplicant?.name}
              toolsLoading={toolsLoading}
            />
          );
        case 'interviewer':
          return (
            <InterviewerEvaluationPanel
              selectedApplicant={selectedApplicant}
              onEvaluationSubmit={handleEvaluationSubmit}
              isConnected={true}
            />
          );
        case 'ai':
          return (
            <InterviewPanel
              questions={questions}
              interviewChecklist={interviewChecklist}
              strengthsWeaknesses={strengthsWeaknesses}
              interviewGuideline={interviewGuideline}
              evaluationCriteria={evaluationCriteria}
              toolsLoading={toolsLoading}
              memo={memo}
              onMemoChange={setMemo}
              evaluation={evaluation}
              onEvaluationChange={setEvaluation}
              isAutoSaving={isAutoSaving}
              resumeId={resume?.id}
              applicationId={selectedApplicant?.id}
              companyName={jobPost?.company?.name}
              applicantName={selectedApplicant?.name}
              audioFile={selectedApplicant?.audio_file || null}
              jobInfo={jobPost ? JSON.stringify(jobPost) : null}
              resumeInfo={resume ? JSON.stringify(resume) : null}
              jobPostId={jobPostId}
            />
          );
        default:
          return <div>패널을 선택해주세요.</div>;
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4"
        onClick={() => setShowPanelModal(false)}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 모달 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {activePanel === 'common-questions' && '공통 질문'}
              {activePanel === 'applicant-questions' && '지원자 질문'}
              {activePanel === 'interviewer' && '면접관 평가'}
              {activePanel === 'ai' && 'AI 평가'}
            </h3>
            <button
              onClick={() => setShowPanelModal(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {/* 모달 컨텐츠 */}
          <div className="flex-1 overflow-y-auto p-4">
            {modalContent()}
          </div>
        </div>
      </div>
    );
  };

  // 다중 이력서 창 관리 함수들
  const openResumeWindow = (applicant, resumeData) => {
    console.log('🪟 이력서 창 열기 시도:', { applicant, resumeData });
    
    // 현재 시간대의 모든 지원자 찾기 (시간미정 제외)
    const currentTime = applicant.schedule_date;
    const sameTimeApplicants = applicants.filter(a => 
      a.schedule_date === currentTime && 
      a.schedule_date !== '시간 미정' && 
      a.schedule_date !== null
    );
    
    if (sameTimeApplicants.length === 0) {
      console.log('🪟 해당 시간대에 지원자가 없습니다');
      return;
    }
    
    // 기존 창들 제거
    setResumeWindows([]);
    
    // 같은 시간대의 모든 지원자에 대해 이력서 창 생성
    const newWindows = sameTimeApplicants.map((app, index) => {
      const windowId = `resume-group-${currentTime}-${index}`;
      return {
        id: windowId,
        applicant: app,
        resume: null, // 나중에 로드
        position: { 
          x: 100 + (index * 50), 
          y: 100 + (index * 50) 
        },
        size: { 
          width: 600, 
          height: Math.floor(800 / sameTimeApplicants.length) // 세로 분할
        }
      };
    });
    
    console.log('🪟 그룹 창 정보:', newWindows);
    
    setResumeWindows(newWindows);
    setActiveResumeWindow(newWindows[0]?.id || null);
    setResumeWindowCounter(prev => prev + 1);
    
    // 각 지원자의 이력서 데이터 로드
    newWindows.forEach(async (window, index) => {
      try {
        const res = await api.get(`/applications/${window.applicant.applicant_id || window.applicant.id}`);
        const mappedResume = mapResumeData(res.data);
        
        setResumeWindows(prev => 
          prev.map(w => 
            w.id === window.id 
              ? { ...w, resume: mappedResume }
              : w
          )
        );
      } catch (error) {
        console.error('이력서 로드 실패:', error);
      }
    });
  };

  const closeResumeWindow = (windowId) => {
    setResumeWindows(prev => prev.filter(w => w.id !== windowId));
    if (activeResumeWindow === windowId) {
      setActiveResumeWindow(null);
    }
  };

  const focusResumeWindow = (windowId) => {
    setActiveResumeWindow(windowId);
  };

  const handleEvaluationSubmit = (evaluationData) => {
    console.log('면접관 평가 제출:', evaluationData);
    // TODO: API로 평가 데이터 전송
  };

  // 자동 저장 useEffect (10초마다)
  useEffect(() => {
    if (!selectedApplicant || !autoSaveEnabled) {
      if (saveTimer.current) clearInterval(saveTimer.current);
      setIsAutoSaving(false); // 오프시 즉시 상태 해제
      return;
    }
    if (saveTimer.current) clearInterval(saveTimer.current);
    saveTimer.current = setInterval(() => {
      if (autoSaveEnabled) {
        handleSaveEvaluation(true);
      }
    }, 10000); // 10초마다
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
  }, [evaluation, memo, selectedApplicant, user, autoSaveEnabled]);

  // 면접 시간별 지원자 그룹화
  const groupedApplicants = applicants.reduce((groups, applicant) => {
    const time = applicant.schedule_date || '시간 미정';
    if (!groups[time]) {
      groups[time] = [];
    }
    groups[time].push(applicant);
    return groups;
  }, {});

  // 나이 계산 함수
  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // 공통 질문 API 호출 함수
  const fetchCommonQuestions = async () => {
    if (!jobPostId || !jobPost?.company?.name) {
      console.warn('⚠️ 공통 질문 fetch 조건 불충족');
      return;
    }
    
    setCommonQuestionsLoading(true);
    setCommonQuestionsError(null);
    
    try {
      console.log('📡 공통 질문 API 호출 시작');
      const res = await api.post('/interview-questions/job-common-questions', null, {
        params: { job_post_id: jobPostId, company_name: jobPost.company.name }
      });
      
      console.log('✅ 공통 질문 API 응답 성공:', res.data);
      
      if (res.data && res.data.question_bundle) {
        const bundle = res.data.question_bundle;
        const allQuestions = Object.values(bundle).flat();
        setCommonQuestions(allQuestions);
        console.log('📝 공통 질문 설정 완료:', allQuestions);
      } else if (res.data && res.data.common_questions) {
        // fallback: common_questions 배열이 있는 경우
        setCommonQuestions(res.data.common_questions);
        console.log('📝 공통 질문 설정 완료 (fallback):', res.data.common_questions);
      } else {
        console.warn('⚠️ 응답에 질문 데이터가 없음, 기본 질문 사용');
        // 기본 질문으로 fallback
        setCommonQuestions([
          '자기소개를 해주세요.',
          '지원 동기는 무엇인가요?',
          '본인의 강점과 약점은 무엇인가요?'
        ]);
      }
    } catch (error) {
      console.error('❌ 공통 질문 API 호출 실패:', error);
      setCommonQuestionsError(error.message || '공통 질문을 불러오는데 실패했습니다.');
      // 에러 시에도 기본 질문 사용
      setCommonQuestions([
        '자기소개를 해주세요.',
        '지원 동기는 무엇인가요?',
        '본인의 강점과 약점은 무엇인가요?'
      ]);
    } finally {
      setCommonQuestionsLoading(false);
    }
  };

  // 공고 기반 면접 도구 fetch (이력서가 없을 때만)
  useEffect(() => {
    if (resume == null && jobPostId && jobPost?.company?.name) {
      setCommonToolsLoading(true);
      const requestData = { job_post_id: jobPostId, company_name: jobPost.company.name };
      
      // 면접 도구 fetch
      Promise.allSettled([
        api.post('/interview-questions/interview-checklist/job-based', requestData),
        api.post('/interview-questions/strengths-weaknesses/job-based', requestData),
        api.post('/interview-questions/interview-guideline/job-based', requestData),
        api.post('/interview-questions/evaluation-criteria/job-based', requestData)
      ]).then(([checklistRes, strengthsRes, guidelineRes, criteriaRes]) => {
        setCommonChecklist(checklistRes.status === 'fulfilled' ? checklistRes.value.data : null);
        setCommonStrengths(strengthsRes.status === 'fulfilled' ? strengthsRes.value.data : null);
        setCommonGuideline(guidelineRes.status === 'fulfilled' ? guidelineRes.value.data : null);
        setCommonCriteria(criteriaRes.status === 'fulfilled' ? criteriaRes.value.data : null);
      }).finally(() => setCommonToolsLoading(false));
      
      // 공통 질문 fetch
      fetchCommonQuestions();
    }
  }, [resume, jobPostId, jobPost?.company?.name]);

  if (loading || jobPostLoading) {
    return (
      <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Navbar />
        <ViewPostSidebar jobPost={null} />
        <div className="flex h-screen items-center justify-center dark:text-gray-100">로딩 중...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Navbar />
        <ViewPostSidebar jobPost={null} />
        <div className="flex h-screen items-center justify-center text-red-500 dark:text-red-400">{error}</div>
      </div>
    );
  }

  // AI 면접 시스템으로 리다이렉트 (지원자가 선택된 경우)
  if (isAiInterview && applicantId) {
    console.log('✅ AiInterviewSystem으로 리다이렉트');
    return <AiInterviewSystem />;
  }

  // 레이아웃: Navbar(상단), ViewPostSidebar(좌측), 나머지 flex
  return (
    <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <ViewPostSidebar jobPost={jobPost} />
      
      {/* 면접 단계별 헤더 */}
      <div className={`fixed top-[64px] left-[90px] right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-6 py-3 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold text-${currentConfig.color}-600 dark:text-${currentConfig.color}-400`}>
              {currentConfig.title}
            </h1><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {currentConfig.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* 프리로딩 상태 표시 */}
            {preloadingStatus === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                이력서 프리로딩 중...
              </div>
            )}
            {preloadingStatus === 'completed' && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <span>✅</span>
                캐시 준비 완료
              </div>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-${currentConfig.color}-100 text-${currentConfig.color}-800 dark:bg-${currentConfig.color}-900 dark:text-${currentConfig.color}-200`}>
              {isFirstInterview ? '실무진' : '임원진'}
            </span>
          </div>
        </div>
      </div>
      {/* 좌측 지원자 리스트: fixed */}
      <div
        className="fixed left-[90px] bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 flex flex-col"
        style={{ 
          width: isLeftOpen ? leftWidth : 16, 
          top: '120px', // 헤더 높이 반영 (64px + 56px)
          height: 'calc(100vh - 120px)', 
          zIndex: 1000 
        }}
      >
        {/* 닫기/열기 버튼 */}
        <button
          className="absolute top-2 right-2 z-30 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full w-7 h-7 flex items-center justify-center shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          style={{ right: isLeftOpen ? '-18px' : '-18px', left: isLeftOpen ? 'auto' : '0', zIndex: 30 }}
          onClick={() => setIsLeftOpen(open => !open)}
          aria-label={isLeftOpen ? '리스트 닫기' : '리스트 열기'}
        >
          {isLeftOpen ? <FiChevronLeft size={20} /> : <FiChevronRight size={20} />}
        </button>
        {/* 드래그 핸들러 */}
        {isLeftOpen && (
          <div className="absolute top-0 right-0 w-2 h-full cursor-col-resize z-20" onMouseDown={handleMouseDown} />
        )}
        {/* 지원자 목록 */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-1">
          {isLeftOpen ? (
            <InterviewApplicantList
              applicants={applicants}
              splitMode={true}
              selectedApplicantId={selectedApplicant?.id}
              selectedApplicantIndex={selectedApplicantIndex}
              onSelectApplicant={handleApplicantClick}
              handleApplicantClick={handleApplicantClick}
              handleCloseDetailedView={() => {}}
              toggleBookmark={() => {}}
              bookmarkedList={[]}
              selectedCardRef={null}
              calculateAge={() => ''}
              compact={true}
            />
          ) : null}
        </div>
      </div>
      {/* Drawer: 공통 면접 질문 패널 (이력서 선택 후에도 접근 가능) */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 480, maxWidth: '100vw' } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>공통 면접 질문/도구</span>
            <Button onClick={() => setDrawerOpen(false)} color="primary">닫기</Button>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <CommonInterviewQuestionsPanel
              questions={commonQuestions}
              onChange={setCommonQuestions}
              fullWidth
              resumeId={resume?.id}
              jobPostId={jobPostId}
              applicationId={selectedApplicant?.id}
              companyName={jobPost?.companyName}
              applicantName={selectedApplicant?.name}
              interviewChecklist={commonChecklist}
              strengthsWeaknesses={null}
              interviewGuideline={commonGuideline}
              evaluationCriteria={commonCriteria}
              toolsLoading={commonToolsLoading || commonQuestionsLoading}
              error={commonQuestionsError}
            />
          </div>
        </div>
      </Drawer>

      {/* Drawer: 현재 면접자들 목록 */}
      <Drawer
        anchor="left"
        open={currentApplicantsDrawerOpen}
        onClose={() => setCurrentApplicantsDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 400, maxWidth: '100vw' } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>1차 면접 지원자 목록</span>
            <Button onClick={() => setCurrentApplicantsDrawerOpen(false)} color="primary">닫기</Button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <InterviewApplicantList
              applicants={applicants}
              selectedApplicantId={selectedApplicant?.id}
              selectedApplicantIndex={selectedApplicantIndex}
              onSelectApplicant={handleApplicantClick}
              handleApplicantClick={handleApplicantClick}
              handleCloseDetailedView={() => {}}
              toggleBookmark={() => {}}
              bookmarkedList={[]}
              selectedCardRef={null}
              calculateAge={() => ''}
              compact={false}
              splitMode={false}
              showAll={true} // Drawer에서는 모든 지원자 표시
            />
          </div>
        </div>
      </Drawer>
      {/* 새로운 UI 시스템: 중앙 영역 */}
      <div
        className="flex flex-row"
        style={{
          paddingTop: 120, // 헤더 높이 반영 (64px + 56px)
          marginLeft: (isLeftOpen ? leftWidth : 16) + 90,
          marginRight: 0, // 오른쪽 공간 완전 활용
          height: 'calc(100vh - 120px)'
        }}
      >
        {/* 중앙 메인 영역 */}
        <div className="flex-1 flex flex-col h-full min-h-0 bg-gray-50 dark:bg-gray-900 relative">

          {/* 이력서 창 개수 표시 */}
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                열린 창: {resumeWindows.length}개
              </span>
            </div>
          </div>

          {/* 메인 콘텐츠 영역 - 동적 패널 */}
          {isAiInterview && !applicantId ? (
            // AI 면접에서 지원자가 선택되지 않은 경우
            <div className="flex-1 h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center max-w-md mx-auto p-8">
                <div className="text-6xl mb-6">🤖</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  AI 면접 시스템
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  AI 면접을 진행할 지원자를 선택해주세요.
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    지원자 목록
                  </h3>
                  {applicants.length > 0 ? (
                    <div className="space-y-2">
                      {applicants.slice(0, 5).map((applicant, index) => (
                        <button
                          key={applicant.applicant_id || applicant.id}
                          onClick={() => navigate(`/interview-progress/${jobPostId}/ai/${applicant.applicant_id || applicant.id}`)}
                          className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {applicant.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {applicant.schedule_date || '시간 미정'}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      AI 면접 대상 지원자가 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : useDraggableLayout ? (
            <PanelLayoutManager
              panels={[
                {
                  id: 'common-questions',
                  title: '공통 질문',
                  position: { x: 20, y: 20 },
                  size: { width: 400, height: 300 },
                  content: (
                    <CommonInterviewQuestionsPanel
                      questions={commonQuestions}
                      onChange={setCommonQuestions}
                      fullWidth={true}
                      resumeId={resume?.id}
                      jobPostId={jobPostId}
                      applicationId={selectedApplicant?.id}
                      companyName={jobPost?.company?.name}
                      applicantName={selectedApplicant?.name}
                      interviewChecklist={commonChecklist}
                      strengthsWeaknesses={null} // ❌ 개별 분석 데이터 제거
                      interviewGuideline={commonGuideline}
                      evaluationCriteria={commonCriteria}
                      toolsLoading={commonToolsLoading || commonQuestionsLoading}
                      error={commonQuestionsError}
                    />
                  )
                },
                {
                  id: 'applicant-questions',
                  title: '지원자 질문',
                  position: { x: 440, y: 20 },
                  size: { width: 400, height: 300 },
                  content: (
                    <ApplicantQuestionsPanel
                      questions={questions}
                      onChange={setQuestions}
                      fullWidth={true}
                      applicantName={selectedApplicant?.name}
                      toolsLoading={toolsLoading}
                    />
                  )
                },
                {
                  id: 'interviewer-evaluation',
                  title: '면접관 평가',
                  position: { x: 20, y: 340 },
                  size: { width: 400, height: 300 },
                  content: (
                    <InterviewerEvaluationPanel
                      selectedApplicant={selectedApplicant}
                      onEvaluationSubmit={handleEvaluationSubmit}
                      isConnected={true}
                    />
                  )
                },
                {
                  id: 'ai-evaluation',
                  title: 'AI 평가',
                  position: { x: 440, y: 340 },
                  size: { width: 400, height: 300 },
                  content: (
                    <InterviewPanel
                      questions={questions}
                      interviewChecklist={interviewChecklist}
                      strengthsWeaknesses={strengthsWeaknesses}
                      interviewGuideline={interviewGuideline}
                      evaluationCriteria={evaluationCriteria}
                      toolsLoading={toolsLoading}
                      memo={memo}
                      onMemoChange={setMemo}
                      evaluation={evaluation}
                      onEvaluationChange={setEvaluation}
                      isAutoSaving={isAutoSaving}
                      resumeId={resume?.id}
                      applicationId={selectedApplicant?.id}
                      companyName={jobPost?.company?.name}
                      applicantName={selectedApplicant?.name}
                      audioFile={selectedApplicant?.audio_file || null}
                      jobInfo={jobPost ? JSON.stringify(jobPost) : null}
                      resumeInfo={resume ? JSON.stringify(resume) : null}
                      jobPostId={jobPostId}
                    />
                  )
                }
              ]}
              layoutMode="auto"
            />
          ) : isAiInterview && applicantId ? (
            // AI 면접에서 지원자가 선택된 경우 - AI 면접 전용 UI
            <div className="flex-1 h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center max-w-2xl mx-auto p-8">
                <div className="text-6xl mb-6">🎯</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  AI 면접 준비 완료
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  선택된 지원자: {selectedApplicant?.name || '알 수 없음'}
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    AI 면접 시작
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    AI 면접 시스템을 시작하려면 아래 버튼을 클릭하세요.
                  </p>
                  <button
                    onClick={() => navigate(`/interview-progress/${jobPostId}/ai/${applicantId}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    AI 면접 시작
                  </button>
                </div>
              </div>
            </div>
          ) : useRecommendedLayout ? (
            // 권장 레이아웃: 3등분 구조
            <div className="flex h-full">
              {/* 왼쪽 1/3: ResumePage 상하 3등분 */}
              <div className="w-1/3 border-r border-gray-300 dark:border-gray-600 flex flex-col">
                <div className="h-1/3 border-b border-gray-300 dark:border-gray-600">
                  <ResumePage 
                    resume={resume} 
                    loading={false} 
                    error={null} 
                  />
                </div>
                <div className="h-1/3 border-b border-gray-300 dark:border-gray-600">
                  <ResumePage 
                    resume={resume} 
                    loading={false} 
                    error={null} 
                  />
                </div>
                <div className="h-1/3">
                  <ResumePage 
                    resume={resume} 
                    loading={false} 
                    error={null} 
                  />
                </div>
              </div>

              {/* 가운데 1/3: 공통 질문 + 지원자 질문 (상하 구조) */}
              <div className="w-1/3 border-r border-gray-300 dark:border-gray-600 flex flex-col">
                <div className="h-1/2 border-b border-gray-300 dark:border-gray-600">
                  <CommonInterviewQuestionsPanel
                    questions={commonQuestions}
                    onChange={setCommonQuestions}
                    fullWidth={true}
                    resumeId={resume?.id}
                    jobPostId={jobPostId}
                    applicationId={selectedApplicant?.id}
                    companyName={jobPost?.company?.name}
                    applicantName={selectedApplicant?.name}
                    interviewChecklist={commonChecklist}
                    strengthsWeaknesses={null} // ❌ 개별 분석 데이터 제거
                    interviewGuideline={commonGuideline}
                    evaluationCriteria={commonCriteria}
                    toolsLoading={commonToolsLoading || commonQuestionsLoading}
                    error={commonQuestionsError}
                  />
                </div>
                <div className="h-1/2">
                  <ApplicantQuestionsPanel
                    questions={questions}
                    onChange={setQuestions}
                    fullWidth={true}
                    applicantName={selectedApplicant?.name}
                    toolsLoading={toolsLoading}
                  />
                </div>
              </div>

              {/* 오른쪽 1/3: 면접관 평가 + AI 평가 (상하 구조) */}
              <div className="w-1/3 flex flex-col">
                <div className="h-1/2 border-b border-gray-300 dark:border-gray-600">
                  <InterviewerEvaluationPanel
                    selectedApplicant={selectedApplicant}
                    onEvaluationSubmit={handleEvaluationSubmit}
                    isConnected={true}
                  />
                </div>
                <div className="h-1/2">
                  <InterviewPanel
                    questions={questions}
                    interviewChecklist={interviewChecklist}
                    strengthsWeaknesses={strengthsWeaknesses}
                    interviewGuideline={interviewGuideline}
                    evaluationCriteria={evaluationCriteria}
                    toolsLoading={toolsLoading}
                    memo={memo}
                    onMemoChange={setMemo}
                    evaluation={evaluation}
                    onEvaluationChange={setEvaluation}
                    isAutoSaving={isAutoSaving}
                    resumeId={resume?.id}
                    applicationId={selectedApplicant?.id}
                    companyName={jobPost?.company?.name}
                    applicantName={selectedApplicant?.name}
                    audioFile={selectedApplicant?.audio_file || null}
                    jobInfo={jobPost ? JSON.stringify(jobPost) : null}
                    resumeInfo={resume ? JSON.stringify(resume) : null}
                    jobPostId={jobPostId}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 h-full overflow-y-auto flex flex-col items-stretch justify-start p-4">
              {activePanel === 'common-questions' ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full">
                  <CommonInterviewQuestionsPanel
                    questions={commonQuestions}
                    onChange={setCommonQuestions}
                    fullWidth={true}
                    resumeId={resume?.id}
                    jobPostId={jobPostId}
                    applicationId={selectedApplicant?.id}
                    companyName={jobPost?.company?.name}
                    applicantName={selectedApplicant?.name}
                    interviewChecklist={commonChecklist}
                    strengthsWeaknesses={null} // ❌ 개별 분석 데이터 제거
                    interviewGuideline={commonGuideline}
                    evaluationCriteria={commonCriteria}
                    toolsLoading={commonToolsLoading || commonQuestionsLoading}
                    error={commonQuestionsError}
                  />
                </div>
              ) : activePanel === 'applicant-questions' ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full">
                  <ApplicantQuestionsPanel
                    questions={questions}
                    onChange={setQuestions}
                    fullWidth={true}
                    applicantName={selectedApplicant?.name}
                    toolsLoading={toolsLoading}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {activePanel === 'interviewer' ? '면접관 평가 패널' : 'AI 평가 패널'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      오른쪽 패널에서 평가를 진행하세요.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        
      </div>

      {/* 오른쪽 패널 선택기 */}
      <InterviewPanelSelector
        activePanel={activePanel}
        onPanelChange={handlePanelChange}
        isCollapsed={panelSelectorCollapsed}
        onToggleCollapse={() => setPanelSelectorCollapsed(!panelSelectorCollapsed)}
      />

      {/* 패널 모달 */}
      {renderPanelModal()}

      {/* 다중 이력서 창들 */}
      {console.log('🪟 렌더링할 창 개수:', resumeWindows.length)}
      {console.log('🪟 창 목록:', resumeWindows)}
      {resumeWindows.map((window) => {
        console.log('🪟 창 렌더링:', window);
        return (
          <DraggableResumeWindow
            key={window.id}
            id={window.id}
            applicant={window.applicant}
            resume={window.resume}
            onClose={closeResumeWindow}
            onFocus={focusResumeWindow}
            isActive={activeResumeWindow === window.id}
            initialPosition={window.position}
            initialSize={window.size}
          />
        );
      })}
      
      {/* 디버깅용 창 상태 표시 */}
      {resumeWindows.length > 0 && (
        <div className="fixed top-20 left-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded z-[9999]">
          <div>창 개수: {resumeWindows.length}</div>
          <div>활성 창: {activeResumeWindow}</div>
        </div>
      )}

      {/* 공통 면접 질문 버튼 */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          right: panelSelectorCollapsed ? 80 : 220,
          transform: 'translateY(-50%)',
          zIndex: 1300,
        }}
      >

      </div>
    </div>
  );
}

export default InterviewProgress; 