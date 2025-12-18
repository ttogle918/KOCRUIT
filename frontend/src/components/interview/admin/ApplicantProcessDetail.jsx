import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaChevronDown, FaChevronUp, FaFileAlt, FaBrain, FaCheckCircle, FaClock, FaTimesCircle, FaCrown } from 'react-icons/fa';
import { MdOutlineBusinessCenter } from 'react-icons/md';
import api from '../../../api/api';

// 상세 결과 컴포넌트들 임포트
import AiInterviewResults from '../AiInterviewResults';
import InterviewEvaluationItems from '../InterviewEvaluationItems';
import ResumeCard from '../../ResumeCard';

const ApplicantProcessDetail = ({ applicant, onBack }) => {
  const [processData, setProcessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState(null); // 아코디언 상태
  const [activeDetailView, setActiveDetailView] = useState(null); // 하단 상세 뷰 상태 ('resume', 'ai', 'practical', 'executive')

  useEffect(() => {
    const loadProcessData = async () => {
      try {
        const response = await api.get(`/applications/${applicant.application_id}`);
        setProcessData(response.data);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProcessData();
  }, [applicant.application_id]);

  const toggleStage = (stageName) => {
    setExpandedStage(expandedStage === stageName ? null : stageName);
  };

  if (loading) return <div className="p-10 text-center">전형 데이터를 불러오는 중...</div>;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {/* 상단 헤더 */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <FaArrowLeft />
          </button>
          <div>
            <h2 className="text-2xl font-bold">{applicant.name} 지원자 프로세스</h2>
            <p className="opacity-90">{applicant.email} | {applicant.job_post?.title || '지원 공고 정보 없음'}</p>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 왼쪽: 단계별 전형 사유 (Dropdown/Accordion) */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">전형 단계별 판정 사유</h3>
          {processData?.stages?.map((stage) => (
            <div key={stage.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleStage(stage.stage_name)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                  expandedStage === stage.stage_name ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {stage.status === 'PASSED' ? <FaCheckCircle className="text-green-500" /> : <FaClock className="text-yellow-500" />}
                  <span className="font-semibold text-gray-700">{stage.stage_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    stage.status === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stage.status}
                  </span>
                </div>
                {expandedStage === stage.stage_name ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              
              {expandedStage === stage.stage_name && (
                <div className="p-4 bg-white border-t border-gray-100 animate-fadeIn">
                  <p className="text-sm text-gray-500 mb-2 font-medium">판정 사유 및 피드백:</p>
                  <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded">
                    {stage.reason || "기록된 사유가 없습니다."}
                  </p>
                  {stage.score && (
                    <div className="mt-2 text-right">
                      <span className="text-xs font-bold text-blue-600">획득 점수: {stage.score}점</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 오른쪽: 상세 정보 보기 버튼 및 컨텐츠 영역 */}
        <div className="flex flex-col space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">상세 결과 리포트</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={() => setActiveDetailView('resume')}
              className={`p-4 rounded-xl border flex flex-col items-center transition-all ${activeDetailView === 'resume' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 hover:bg-white border-gray-200'}`}
            >
              <FaFileAlt className={`text-2xl mb-2 ${activeDetailView === 'resume' ? 'text-white' : 'text-gray-600'}`} />
              <span className="text-sm font-medium">지원서/이력서</span>
            </button>
            <button 
              onClick={() => setActiveDetailView('ai')}
              className={`p-4 rounded-xl border flex flex-col items-center transition-all ${activeDetailView === 'ai' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-50 hover:bg-white border-gray-200'}`}
            >
              <FaBrain className={`text-2xl mb-2 ${activeDetailView === 'ai' ? 'text-white' : 'text-purple-600'}`} />
              <span className="text-sm font-medium">AI 면접 결과</span>
            </button>
            <button 
              onClick={() => setActiveDetailView('practical')}
              className={`p-4 rounded-xl border flex flex-col items-center transition-all ${activeDetailView === 'practical' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-50 hover:bg-white border-gray-200'}`}
            >
              <MdOutlineBusinessCenter className={`text-2xl mb-2 ${activeDetailView === 'practical' ? 'text-white' : 'text-green-600'}`} />
              <span className="text-sm font-medium">실무진 면접 리포트</span>
            </button>
            <button 
              onClick={() => setActiveDetailView('executive')}
              className={`p-4 rounded-xl border flex flex-col items-center transition-all ${activeDetailView === 'executive' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 hover:bg-white border-gray-200'}`}
            >
              <FaCrown className={`text-2xl mb-2 ${activeDetailView === 'executive' ? 'text-white' : 'text-indigo-600'}`} />
              <span className="text-sm font-medium">임원진 면접 리포트</span>
            </button>
          </div>

          {/* 상세 컨텐츠 표시 영역 */}
          <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-300 min-h-[400px]">
            {!activeDetailView && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p>위의 버튼을 눌러 상세 리포트를 확인하세요.</p>
              </div>
            )}
            
            {activeDetailView === 'resume' && (
              <div className="h-[500px] overflow-auto">
                <ResumeCard 
                   resume={processData?.resume} 
                   applicationId={applicant.application_id}
                   jobpostId={applicant.job_post_id}
                />
              </div>
            )}
            
            {activeDetailView === 'ai' && (
              <AiInterviewResults applicationId={applicant.application_id} />
            )}
            
            {activeDetailView === 'practical' && (
              <InterviewEvaluationItems 
                resumeId={applicant.resume_id}
                applicationId={applicant.application_id}
                interviewStage="practical"
              />
            )}

            {activeDetailView === 'executive' && (
              <InterviewEvaluationItems 
                resumeId={applicant.resume_id}
                applicationId={applicant.application_id}
                interviewStage="executive"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantProcessDetail;