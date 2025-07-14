import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import InterviewApplicantList from './InterviewApplicantList';
import ResumePage from '../resume/ResumePage';
import InterviewPanel from './InterviewPanel';
import api from '../../api/api';
import { FiChevronLeft, FiChevronRight, FiSave } from 'react-icons/fi';
import { MdOutlineAutoAwesome } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import { mapResumeData } from '../../utils/resumeUtils';

function InterviewProgress() {
  const { jobPostId } = useParams();
  const { user } = useAuth();
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

  // 좌측 width 드래그 조절 및 닫기/열기
  const [leftWidth, setLeftWidth] = useState(240);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const isDragging = useRef(false);

  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/applications/job/${jobPostId}/applicants-with-interview`);
        setApplicants(res.data);
        console.log('applicants:', applicants);
      } catch (err) {
        setError('지원자 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    if (jobPostId) fetchApplicants();
  }, [jobPostId]);

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

  const fetchInterviewTools = async (resumeId, applicationId, companyName, applicantName) => {
    if (!resumeId) return;
    setToolsLoading(true);
    const requestData = { resume_id: resumeId, application_id: applicationId, company_name: companyName, name: applicantName };
    try {
      const [
        questionsRes,
        checklistRes,
        strengthsRes,
        guidelineRes,
        criteriaRes
      ] = await Promise.allSettled([
        api.post('/interview-questions/integrated-questions', requestData),
        api.post('/interview-questions/interview-checklist', requestData),
        api.post('/interview-questions/strengths-weaknesses', requestData),
        api.post('/interview-questions/interview-guideline', requestData),
        api.post('/interview-questions/evaluation-criteria', requestData)
      ]);
      setQuestions(questionsRes.status === 'fulfilled' ? questionsRes.value.data.questions || [] : []);
      setInterviewChecklist(checklistRes.status === 'fulfilled' ? checklistRes.value.data : null);
      setStrengthsWeaknesses(strengthsRes.status === 'fulfilled' ? strengthsRes.value.data : null);
      setInterviewGuideline(guidelineRes.status === 'fulfilled' ? guidelineRes.value.data : null);
      setEvaluationCriteria(criteriaRes.status === 'fulfilled' ? criteriaRes.value.data : null);
    } catch (e) {
      setQuestions([]);
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
    const id = applicant.applicant_id || applicant.id; // 우선 applicant_id 사용
    setSelectedApplicantIndex(index);
    setResume(null);
    try {
      const res = await api.get(`/applications/${id}`);
      const mappedResume = mapResumeData(res.data);
      setResume(mappedResume);
      setSelectedApplicant(applicant);
      setMemo('');
      setEvaluation({});
      setExistingEvaluationId(null);
      // 면접관 도구 fetch
      await fetchInterviewTools(
        mappedResume.id,
        applicant.id,
        jobPost?.company?.name,
        applicant.name
      );
    } catch (err) {
      console.error('지원자 데이터 로드 실패:', err);
      setResume(null);
      setQuestions([]);
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
    if (lastSaved === current && auto) return;
    
    // 저장 상태 설정
    if (auto) {
      setIsAutoSaving(true);
    } else {
      setIsSaving(true);
    }
    
    // 실제 interview_id 찾기
    let interviewId = 1; // 기본값
    try {
      // schedule_interview 테이블에서 해당 지원자의 면접 ID 조회
      const scheduleResponse = await api.get(`/interview-evaluations/interview-schedules/applicant/${selectedApplicant.id}`);
      if (scheduleResponse.data && scheduleResponse.data.length > 0) {
        interviewId = scheduleResponse.data[0].id;
      }
    } catch (scheduleError) {
      console.warn('면접 일정 조회 실패, 기본값 사용:', scheduleError);
      // 면접 일정이 없으면 기본값 1 사용
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
      evaluation_items: evaluationItems  // 새로운 구조
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

  // 자동 저장 useEffect (10초마다)
  useEffect(() => {
    if (!selectedApplicant || !autoSaveEnabled) return;
    if (saveTimer.current) clearInterval(saveTimer.current);
    saveTimer.current = setInterval(() => {
      handleSaveEvaluation(true);
    }, 10000); // 10초마다
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
  }, [evaluation, memo, selectedApplicant, user, autoSaveEnabled]);

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

  // 레이아웃: Navbar(상단), ViewPostSidebar(좌측), 나머지 flex
  return (
    <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <ViewPostSidebar jobPost={jobPost} />
      {/* 좌측 지원자 리스트: fixed */}
      <div
        className="fixed left-[90px] top-[64px] bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 flex flex-col"
        style={{ width: isLeftOpen ? leftWidth : 16, height: 'calc(100vh - 64px)', zIndex: 1000 }}
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
              selectedApplicantIndex={selectedApplicantIndex}
              onSelectApplicant={handleApplicantClick}
              handleApplicantClick={handleApplicantClick}
              handleCloseDetailedView={() => {}}
              calculateAge={() => ''}
              compact={true}
            />
          ) : null}
        </div>
      </div>
      {/* 중앙/우측 패널: 좌측 패널 width만큼 margin-left */}
      <div
        className="flex flex-row"
        style={{
          paddingTop: 64,
          marginLeft: (isLeftOpen ? leftWidth : 16) + 90,
          height: 'calc(100vh - 64px)'
        }}
      >
        {/* 중앙 이력서 */}
        <div className="flex-1 flex flex-col h-full min-h-0 bg-[#f7faff] dark:bg-gray-900">
          <div className="flex-1 h-full overflow-y-auto flex flex-col items-stretch justify-start">
            {resume ? (
              <ResumePage resume={resume} loading={false} error={null} />
            ) : (
              <div className="text-gray-400 dark:text-gray-500 flex items-center justify-center h-full">지원자를 선택하세요</div>
            )}
          </div>
        </div>
        {/* 우측 면접 질문/메모 */}
        <div className="w-[400px] border-l border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 h-full min-h-0 flex flex-col">
          <div className="h-full min-h-0 flex flex-col">
            {/* 자동저장 토글 버튼 및 상태 메시지 (상단) */}
            <div className="flex items-center justify-end gap-4 px-4 pt-4 min-h-[40px]">
              {/* 자동저장 상태 메시지 */}
              {isAutoSaving && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  자동 저장 중...
                </div>
              )}
              {/* 자동저장 토글 스위치 */}
              <button
                onClick={handleToggleAutoSave}
                className={`flex items-center gap-1 px-2 py-1 rounded font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400
                  ${autoSaveEnabled
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}
                `}
                aria-pressed={autoSaveEnabled}
                title={autoSaveEnabled ? '자동저장 ON' : '자동저장 OFF'}
              >
                {autoSaveEnabled ? (
                  <MdOutlineAutoAwesome size={20} className="text-blue-500" />
                ) : (
                  <FiSave size={18} className="text-gray-500" />
                )}
                <span className="ml-1 select-none">자동저장</span>
                <span
                  className={`ml-2 w-8 h-4 flex items-center bg-gray-300 rounded-full p-1 transition-colors duration-200 ${autoSaveEnabled ? 'bg-blue-400' : 'bg-gray-300'}`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full bg-white shadow transform transition-transform duration-200 ${autoSaveEnabled ? 'translate-x-4' : ''}`}
                  />
                </span>
              </button>
            </div>
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
            />
            <div className="mt-4 flex flex-col items-end gap-2 px-4 pb-4">
              {/* 하단 자동저장 상태 메시지 제거, 저장 버튼만 남김 */}
              <button
                className={`font-bold py-2 px-6 rounded shadow transition-colors ${
                  !selectedApplicant || !user?.id || isSaving || isAutoSaving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                onClick={() => handleSaveEvaluation(false)}
                disabled={!selectedApplicant || !user?.id || isSaving || isAutoSaving}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    저장 중...
                  </div>
                ) : (
                  '평가 저장'
                )}
              </button>
              {/* 저장 결과 메시지는 그대로 유지 */}
              {saveStatus && (
                <div className={`text-xs ${
                  saveStatus.includes('실패') 
                    ? 'text-red-500 dark:text-red-400' 
                    : saveStatus.includes('자동') 
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-green-500 dark:text-green-400'
                }`}>
                  {saveStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewProgress; 