import React, { useState, useEffect } from 'react';
import { MdClose, MdDescription, MdQuestionAnswer, MdAssessment } from 'react-icons/md';
import api from '../api/api';

const ApplicantDetailModal = ({ isOpen, onClose, applicant, jobPostId }) => {
  const [activeTab, setActiveTab] = useState('resume');
  const [loading, setLoading] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [interviewQAData, setInterviewQAData] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);

  useEffect(() => {
    if (isOpen && applicant) {
      loadData();
    }
  }, [isOpen, applicant, activeTab]);

  const loadData = async () => {
    if (!applicant) return;

    setLoading(true);
    try {
      switch (activeTab) {
        case 'resume':
          const resumeRes = await api.get(`/resumes/${applicant.resume_id || applicant.id}`);
          setResumeData(resumeRes.data);
          break;
        case 'interview_qa':
          const qaRes = await api.get(`/interview-questions/application/${applicant.id}`);
          setInterviewQAData(qaRes.data);
          break;
        case 'evaluation':
          const evalRes = await api.get(`/interview-evaluation/application/${applicant.id}/all`);
          setEvaluationData(evalRes.data);
          break;
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'resume', label: '이력서', icon: <MdDescription /> },
    { id: 'interview_qa', label: '면접 문답', icon: <MdQuestionAnswer /> },
    { id: 'evaluation', label: '면접평가서', icon: <MdAssessment /> }
  ];

  const renderResumeContent = () => {
    if (!resumeData) return <div className="text-gray-500">이력서 정보를 불러올 수 없습니다.</div>;
    
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">기본 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="font-medium">이름:</span> {resumeData.name || applicant.name}</div>
            <div><span className="font-medium">이메일:</span> {resumeData.email}</div>
            <div><span className="font-medium">전화번호:</span> {resumeData.phone}</div>
            <div><span className="font-medium">학력:</span> {resumeData.education}</div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">경력 사항</h3>
          <div className="space-y-2">
            {resumeData.experience && resumeData.experience.split('\n').map((exp, idx) => (
              <div key={idx} className="text-sm">{exp}</div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">기술 스택</h3>
          <div className="flex flex-wrap gap-2">
            {resumeData.skills && resumeData.skills.split(',').map((skill, idx) => (
              <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {skill.trim()}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderInterviewQAContent = () => {
    if (!interviewQAData) return <div className="text-gray-500">면접 문답 정보를 불러올 수 없습니다.</div>;
    
    return (
      <div className="space-y-4">
        {interviewQAData.questions && interviewQAData.questions.map((qa, idx) => (
          <div key={idx} className="bg-gray-50 p-4 rounded-lg">
            <div className="font-semibold text-blue-600 mb-2">Q{idx + 1}. {qa.question}</div>
            <div className="text-gray-700">{qa.answer || '답변 없음'}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderEvaluationContent = () => {
    if (!evaluationData) return <div className="text-gray-500">면접 평가 정보를 불러올 수 없습니다.</div>;
    
    return (
      <div className="space-y-4">
        {evaluationData.evaluations && evaluationData.evaluations.map((evaluation, idx) => (
          <div key={idx} className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{evaluation.type} 면접 평가</h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div><span className="font-medium">총점:</span> {evaluation.total_score}점</div>
              <div><span className="font-medium">평가자:</span> {evaluation.evaluator_name || 'AI'}</div>
            </div>
            <div className="mb-3">
              <span className="font-medium">종합 평가:</span>
              <div className="text-gray-700 mt-1">{evaluation.summary}</div>
            </div>
            {evaluation.items && evaluation.items.length > 0 && (
              <div>
                <span className="font-medium">세부 평가:</span>
                <div className="mt-2 space-y-2">
                  {evaluation.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="text-sm">
                      <span className="font-medium">{item.type}:</span> {item.score}점 - {item.comment}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'resume':
        return renderResumeContent();
      case 'interview_qa':
        return renderInterviewQAContent();
      case 'evaluation':
        return renderEvaluationContent();
      default:
        return <div>내용을 선택해주세요.</div>;
    }
  };

  if (!isOpen || !applicant) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            {applicant.name} 지원자 상세 정보
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetailModal; 