import React, { useState, useEffect } from 'react';
import { 
  FaArrowLeft, 
  FaFileAlt, 
  FaBrain, 
  FaCheckCircle, 
  FaClock, 
  FaCrown, 
  FaChevronDown, 
  FaChevronUp,
  FaTimesCircle
} from 'react-icons/fa';
import { MdOutlineBusinessCenter } from 'react-icons/md';
import { FiTarget } from 'react-icons/fi';
import InterviewApi from '../../../api/interviewApi';

// 상세 리포트 컴포넌트 임포트
import InterviewResultDetail from '../ai/InterviewResultDetail';
import InterviewEvaluationItems from '../InterviewEvaluationItems';
import ResumeCard from '../../ResumeCard';
import InterviewQuestionLogs from './InterviewQuestionLogs';

const ApplicantProcessDetail = ({ applicant, onBack }) => {
  const [processData, setProcessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState(null); // 좌측 아코디언 상태
  const [activeView, setActiveView] = useState('summary'); // 우측 상세 뷰 상태

  useEffect(() => {
    const loadProcessData = async () => {
      if (!applicant?.id) return;
      
      try {
        setLoading(true);
        const data = await InterviewApi.getApplication(applicant.id);
        setProcessData(data);
      } catch (error) {
        console.error('프로세스 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProcessData();
  }, [applicant?.id]);

  const toggleAccordion = (stageName) => {
    setExpandedStage(expandedStage === stageName ? null : stageName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-xl shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">지원자 프로세스 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 단계별 아이콘 및 스타일 매핑
  const stageIcons = {
    'DOCUMENT': <FaFileAlt className="text-gray-500" />,
    'AI_INTERVIEW': <FaBrain className="text-purple-500" />,
    'PRACTICAL_INTERVIEW': <MdOutlineBusinessCenter className="text-green-500" />,
    'EXECUTIVE_INTERVIEW': <FaCrown className="text-orange-500" />,
    'FINAL_RESULT': <FiTarget className="text-blue-500" />
  };

  const getStageDisplay = (stageName) => {
    const names = {
      'DOCUMENT': '서류 전형',
      'WRITTEN_TEST': '필기 시험',
      'AI_INTERVIEW': 'AI 면접',
      'PRACTICAL_INTERVIEW': '실무진 면접',
      'EXECUTIVE_INTERVIEW': '임원진 면접',
      'FINAL_RESULT': '최종 합격'
    };
    return names[stageName] || stageName;
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
      case 'COMPLETED':
        return <span className="flex items-center text-green-600 text-[11px] font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100"><FaCheckCircle className="mr-1" /> 통과</span>;
      case 'FAILED':
        return <span className="flex items-center text-red-600 text-[11px] font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100"><FaTimesCircle className="mr-1" /> 불합격</span>;
      case 'IN_PROGRESS':
        return <span className="flex items-center text-blue-600 text-[11px] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100"><FaClock className="mr-1" /> 진행중</span>;
      default:
        return <span className="flex items-center text-gray-500 text-[11px] font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-100"><FaClock className="mr-1" /> 대기</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 animate-fadeIn h-full flex flex-col">
      {/* 헤더 섹션 */}
      <div className="px-8 py-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={onBack}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"
              title="목록으로 돌아가기"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h2 className="text-2xl font-black tracking-tight">{processData?.name || processData?.applicantName || applicant?.name}</h2>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  (processData?.overallStatus || processData?.overall_status || applicant?.overall_status) === 'PASSED' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                  (processData?.overallStatus || processData?.overall_status || applicant?.overall_status) === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {processData?.overallStatus || processData?.overall_status || applicant?.overall_status}
                </span>
              </div>
              <p className="text-slate-400 text-sm font-medium">
                {processData?.email || applicant?.email} • {processData?.jobPostingTitle || applicant?.job_posting_title || '지원 공고 정보 없음'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <div className="text-right px-4 py-2 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Score</p>
              <p className="text-xl font-black text-purple-400">{processData?.aiInterviewScore || processData?.aiScore || processData?.ai_score || applicant?.aiScore || applicant?.ai_score || '-'}</p>
            </div>
            <div className="text-right px-4 py-2 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Final Score</p>
              <p className="text-xl font-black text-blue-400">{processData?.finalScore || processData?.final_score || applicant?.finalScore || applicant?.final_score || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-slate-50">
        {/* 좌측 패널: 단계별 진행 현황 */}
        <div className="w-[380px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-inner">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full mr-2"></span>
              전형 단계별 히스토리
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">Total {processData?.stages?.length || 0} Stages</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {processData?.stages?.sort((a, b) => (a.stageOrder || a.stage_order) - (b.stageOrder || b.stage_order)).map((stage) => {
              const sName = stage.stageName || stage.stage_name;
              const isExpanded = expandedStage === sName;
              
              return (
                <div 
                  key={stage.id} 
                  className={`group rounded-2xl transition-all duration-300 border ${
                    isExpanded 
                      ? 'border-blue-400 bg-blue-50/30 shadow-md ring-4 ring-blue-500/5' 
                      : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <button
                    onClick={() => toggleAccordion(sName)}
                    className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2.5 rounded-xl transition-all ${
                        isExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
                      }`}>
                        {stageIcons[sName] || <FaFileAlt />}
                      </div>
                      <div>
                        <p className={`text-sm font-black transition-colors ${isExpanded ? 'text-blue-700' : 'text-slate-700'}`}>
                          {getStageDisplay(sName)}
                        </p>
                        <div className="mt-1">
                          {getStatusBadge(stage.status)}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <FaChevronUp className="text-blue-400" /> : <FaChevronDown className="text-slate-300 group-hover:text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 animate-fadeIn">
                      <div className="pt-2 pb-4 border-t border-blue-100">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-2">판정 사유 및 피드백</p>
                        <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-inner">
                          <p className="text-xs text-slate-600 leading-relaxed font-medium italic">
                            "{stage.reason || stage.passReason || stage.failReason || stage.pass_reason || stage.fail_reason || "기록된 상세 사유가 없습니다."}"
                          </p>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center bg-blue-50 px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-bold text-blue-400 mr-2">SCORE</span>
                            <span className="text-sm font-black text-blue-700">{stage.score || '-'}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveView('logs');
                              }}
                              className="flex items-center text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-tighter transition-all"
                            >
                              질문 답변 로그
                            </button>
                            <span className="text-slate-300">|</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (sName === 'AI_INTERVIEW') setActiveView('ai');
                                else if (sName === 'PRACTICAL_INTERVIEW') setActiveView('practical');
                                else if (sName === 'EXECUTIVE_INTERVIEW') setActiveView('executive');
                                else if (sName === 'DOCUMENT') setActiveView('resume');
                              }}
                              className="flex items-center text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tighter transition-all group/btn"
                            >
                              상세 리포트 보기
                              <span className="ml-1 transition-transform group-hover/btn:translate-x-1">→</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측 패널: 상세 리포트 뷰 */}
        <div className="flex-1 bg-slate-50 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-5xl mx-auto p-10 pb-24">
            {!activeView || activeView === 'summary' ? (
              <div className="h-full flex flex-col items-center justify-center py-20 animate-fadeIn">
                <div className="relative mb-10">
                  <div className="w-24 h-24 bg-blue-600/10 rounded-[30%] rotate-12 absolute -top-2 -left-2"></div>
                  <div className="w-24 h-24 bg-blue-600 rounded-[30%] flex items-center justify-center shadow-2xl shadow-blue-200 relative z-10">
                    <FaFileAlt className="text-white text-3xl" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">상세 전형 데이터를 선택하세요</h3>
                <p className="text-slate-500 font-medium text-center max-w-sm leading-relaxed mb-10">
                  좌측 히스토리에서 보고 싶은 전형 단계의 <br/>
                  <span className="text-blue-600 font-bold">상세 리포트 보기</span> 버튼을 클릭하여 <br/>
                  데이터 기반의 심층 분석 결과를 확인할 수 있습니다.
                </p>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                  <button 
                    onClick={() => setActiveView('resume')}
                    className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center group"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-50 transition-colors">
                      <FaFileAlt className="text-slate-400 group-hover:text-blue-600 text-xl" />
                    </div>
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">지원서 조회</span>
                  </button>
                  <button 
                    onClick={() => setActiveView('ai')}
                    className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-500 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center group"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-50 transition-colors">
                      <FaBrain className="text-slate-400 group-hover:text-purple-600 text-xl" />
                    </div>
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">AI 면접 분석</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-slideUp">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                    {activeView === 'resume' && '지원서 및 포트폴리오 분석'}
                    {activeView === 'ai' && 'AI 역량 면접 심층 분석'}
                    {activeView === 'practical' && '실무진 심층 면접 리포트'}
                    {activeView === 'executive' && '임원진 심층 면접 리포트'}
                    {activeView === 'logs' && '면접 질문 및 답변 로그'}
                  </h3>
                  <button 
                    onClick={() => setActiveView('summary')}
                    className="group flex items-center px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl transition-all"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest mr-2">닫기</span>
                    <FaChevronUp className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                  </button>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-slate-200/50 min-h-[500px]">
                  {activeView === 'resume' && (
                    <div className="p-0">
                      <ResumeCard 
                        resume={processData} 
                        applicationId={applicant?.id}
                        jobpostId={applicant?.job_post_id}
                      />
                    </div>
                  )}
                  
                  {activeView === 'ai' && (
                    <div className="p-0">
                      <InterviewResultDetail 
                        applicant={{
                          ...applicant,
                          application_id: applicant.id || applicant.application_id,
                          ...processData
                        }}
                        onBack={() => setActiveView('summary')}
                      />
                    </div>
                  )}
                  
                  {activeView === 'practical' && (
                    <div className="p-8">
                      <InterviewEvaluationItems 
                        resumeId={applicant?.resume_id || processData?.resume_id}
                        applicationId={applicant?.id}
                        interviewStage="practical"
                      />
                    </div>
                  )}

                  {activeView === 'executive' && (
                    <div className="p-8">
                      <InterviewEvaluationItems 
                        resumeId={applicant?.resume_id || processData?.resume_id}
                        applicationId={applicant?.id}
                        interviewStage="executive"
                      />
                    </div>
                  )}

                  {activeView === 'logs' && (
                    <div className="p-8">
                      <InterviewQuestionLogs 
                        applicationId={applicant?.id} 
                        interviewType={expandedStage}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* 하단 그림자 효과 (스크롤 방지 시각적 힌트) */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantProcessDetail;
