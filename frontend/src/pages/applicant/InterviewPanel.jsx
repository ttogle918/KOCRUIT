import React, { useState, useEffect } from 'react';
import Rating from '@mui/material/Rating';
import api from '../../api/api';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ApplicantCard from '../../components/ApplicantCard';

function InterviewPanel({ questions = [], memo = '', onMemoChange, evaluation = {}, onEvaluationChange, isAutoSaving = false, resumeId, applicationId, companyName, applicantName }) {
  // 면접관 지원 도구 상태
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [interviewChecklist, setInterviewChecklist] = useState(null);
  const [strengthsWeaknesses, setStrengthsWeaknesses] = useState(null);
  const [interviewGuideline, setInterviewGuideline] = useState(null);
  const [evaluationCriteria, setEvaluationCriteria] = useState(null);
  const [loadingTools, setLoadingTools] = useState(false);
  const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'analysis', 'checklist', 'guideline', 'criteria'

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

  // 면접관 지원 도구 로드
  const loadInterviewTools = async () => {
    if (!resumeId) return;
    
    setLoadingTools(true);
    try {
      const requestData = {
        resume_id: resumeId,
        application_id: applicationId,
        company_name: companyName,
        name: applicantName
      };

      // 병렬로 모든 도구 데이터 로드
      const [analysisRes, checklistRes, strengthsRes, guidelineRes, criteriaRes] = await Promise.allSettled([
        api.post('/interview-questions/resume-analysis', requestData),
        api.post('/interview-questions/interview-checklist', requestData),
        api.post('/interview-questions/strengths-weaknesses', requestData),
        api.post('/interview-questions/interview-guideline', requestData),
        api.post('/interview-questions/evaluation-criteria', requestData)
      ]);

      if (analysisRes.status === 'fulfilled') setResumeAnalysis(analysisRes.value.data);
      if (checklistRes.status === 'fulfilled') setInterviewChecklist(checklistRes.value.data);
      if (strengthsRes.status === 'fulfilled') setStrengthsWeaknesses(strengthsRes.value.data);
      if (guidelineRes.status === 'fulfilled') setInterviewGuideline(guidelineRes.value.data);
      if (criteriaRes.status === 'fulfilled') setEvaluationCriteria(criteriaRes.value.data);

    } catch (error) {
      console.error('면접관 지원 도구 로드 실패:', error);
    } finally {
      setLoadingTools(false);
    }
  };

  // 컴포넌트 마운트 시 도구 로드
  useEffect(() => {
    if (resumeId) {
      loadInterviewTools();
    }
  }, [resumeId, applicationId]);

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* 자동 저장 상태 표시 */}
      {isAutoSaving && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          자동 저장 중...
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
          이력서 분석
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
            <div className="mb-2 font-bold text-lg">이력서 분석 리포트</div>
            {loadingTools ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">분석 중...</span>
              </div>
            ) : resumeAnalysis ? (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">이력서 요약</h4>
                  <p className="text-gray-700 dark:text-gray-200">{resumeAnalysis.resume_summary}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">주요 프로젝트</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {resumeAnalysis.key_projects?.map((project, i) => <li key={i}>{project}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">기술 스택</h4>
                  <div className="flex flex-wrap gap-1">
                    {resumeAnalysis.technical_skills?.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">면접 집중 영역</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {resumeAnalysis.interview_focus_areas?.map((area, i) => <li key={i}>{area}</li>)}
                  </ul>
                </div>
                {resumeAnalysis.job_matching_score && (
                  <div>
                    <h4 className="font-semibold text-blue-700 dark:text-blue-300">직무 매칭 점수</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-600 rounded-full" 
                          style={{ width: `${resumeAnalysis.job_matching_score * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm">{(resumeAnalysis.job_matching_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">이력서 분석 정보를 불러올 수 없습니다.</div>
            )}
          </div>
        )}

        {activeTab === 'checklist' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 체크리스트</div>
            {loadingTools ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">체크리스트 생성 중...</span>
              </div>
            ) : interviewChecklist ? (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-green-700 dark:text-green-300">면접 전 체크리스트</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewChecklist.pre_interview_checklist?.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">면접 중 체크리스트</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewChecklist.during_interview_checklist?.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 dark:text-red-300">주의할 레드플래그</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewChecklist.red_flags_to_watch?.map((flag, i) => <li key={i}>{flag}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-700 dark:text-green-300">확인할 그린플래그</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewChecklist.green_flags_to_confirm?.map((flag, i) => <li key={i}>{flag}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">체크리스트를 생성할 수 없습니다.</div>
            )}
          </div>
        )}

        {activeTab === 'guideline' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 가이드라인</div>
            {loadingTools ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">가이드라인 생성 중...</span>
              </div>
            ) : interviewGuideline ? (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">면접 접근 방식</h4>
                  <p className="text-gray-700 dark:text-gray-200">{interviewGuideline.interview_approach}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">시간 배분</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(interviewGuideline.time_allocation || {}).map(([area, time]) => (
                      <div key={area} className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-200">{area}:</span>
                        <span className="font-medium">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">후속 질문</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewGuideline.follow_up_questions?.map((question, i) => <li key={i}>{question}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">가이드라인을 생성할 수 없습니다.</div>
            )}
          </div>
        )}

        {activeTab === 'criteria' && (
          <div>
            <div className="mb-2 font-bold text-lg">평가 기준 제안</div>
            {loadingTools ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">평가 기준 생성 중...</span>
              </div>
            ) : evaluationCriteria ? (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">제안 평가 기준</h4>
                  {evaluationCriteria.suggested_criteria?.map((criteria, i) => (
                    <div key={i} className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="font-medium">{criteria.criterion}</div>
                      <div className="text-gray-600 dark:text-gray-400">{criteria.description}</div>
                      <div className="text-xs text-gray-500">최대 점수: {criteria.max_score}점</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">가중치 권장사항</h4>
                  {evaluationCriteria.weight_recommendations?.map((weight, i) => (
                    <div key={i} className="mb-1">
                      <span className="font-medium">{weight.criterion}:</span>
                      <span className="ml-2">{(weight.weight * 100).toFixed(0)}%</span>
                      <div className="text-xs text-gray-500 ml-4">{weight.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">평가 기준을 생성할 수 없습니다.</div>
            )}
          </div>
        )}
      </div>

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
      </div>
    </div>
  );
}

export default InterviewPanel;