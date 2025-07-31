import React, { useState, useEffect } from 'react';
import { FiX, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiBook, FiAward, FiStar, FiClock, FiCheckCircle } from 'react-icons/fi';
import { FaGraduationCap, FaCertificate } from 'react-icons/fa';
import api from '../api/api';
import { calculateAge } from '../utils/resumeUtils';

const ApplicantInfoModal = ({ isOpen, onClose, applicant, jobPostId }) => {
  const [resumeData, setResumeData] = useState(null);
  const [interviewEvaluations, setInterviewEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (isOpen && applicant) {
      loadData();
    }
  }, [isOpen, applicant]);

  const loadData = async () => {
    if (!applicant) return;

    setLoading(true);
    try {
      // 이력서 상세 정보 조회
      if (applicant.resume_id) {
        const resumeRes = await api.get(`/resumes/${applicant.resume_id}`);
        setResumeData(resumeRes.data);
      }

      // 면접 평가 기록 조회
      if (applicant.id) {
        try {
          const evalRes = await api.get(`/interview-evaluations/application/${applicant.id}/all`);
          setInterviewEvaluations(evalRes.data.evaluations || []);
        } catch (error) {
          console.log('면접 평가 기록 조회 실패:', error);
          setInterviewEvaluations([]);
        }
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: '기본정보', icon: <FiUser /> },
    { id: 'resume', label: '이력서', icon: <FiBook /> },
    { id: 'evaluation', label: '평가기록', icon: <FiStar /> }
  ];

  const getInterviewStatusLabel = (status) => {
    if (!status) return { label: '미진행', color: 'text-gray-500 bg-gray-100' };
    
    const statusLabels = {
      'FIRST_INTERVIEW_SCHEDULED': { label: '1차 일정 확정', color: 'text-blue-600 bg-blue-100' },
      'FIRST_INTERVIEW_IN_PROGRESS': { label: '1차 진행중', color: 'text-yellow-600 bg-yellow-100' },
      'FIRST_INTERVIEW_COMPLETED': { label: '1차 완료', color: 'text-green-600 bg-green-100' },
      'FIRST_INTERVIEW_PASSED': { label: '1차 합격', color: 'text-green-700 bg-green-200' },
      'FIRST_INTERVIEW_FAILED': { label: '1차 불합격', color: 'text-red-600 bg-red-100' },
      'CANCELLED': { label: '취소', color: 'text-gray-500 bg-gray-100' }
    };
    
    return statusLabels[status] || { label: '알 수 없음', color: 'text-gray-500 bg-gray-100' };
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      {/* 프로필 섹션 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {applicant.name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {applicant.name}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {applicant.birth_date && (
                <span className="flex items-center gap-1">
                  <FiCalendar className="w-4 h-4" />
                  {calculateAge(applicant.birth_date)}세
                </span>
              )}
              {applicant.gender && (
                <span>{applicant.gender}</span>
              )}
              <span className="flex items-center gap-1">
                <FiClock className="w-4 h-4" />
                지원일: {applicant.applied_at ? new Date(applicant.applied_at).toLocaleDateString('ko-KR') : 'N/A'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getInterviewStatusLabel(applicant.interview_status).color}`}>
              {getInterviewStatusLabel(applicant.interview_status).label}
            </span>
          </div>
        </div>
      </div>

      {/* 연락처 정보 */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <FiMail className="w-5 h-5 text-blue-600" />
          연락처 정보
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <FiMail className="w-4 h-4 text-gray-500" />
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">이메일</span>
              <p className="font-medium">{applicant.email || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FiPhone className="w-4 h-4 text-gray-500" />
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">전화번호</span>
              <p className="font-medium">{applicant.phone || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <FiMapPin className="w-4 h-4 text-gray-500" />
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">주소</span>
              <p className="font-medium">{applicant.address || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 학력 정보 */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <FaGraduationCap className="w-5 h-5 text-green-600" />
          학력 정보
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">최종학력</span>
            <p className="font-medium">{applicant.education || 'N/A'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">학위</span>
            <p className="font-medium">{applicant.degree || 'N/A'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">전공</span>
            <p className="font-medium">{applicant.major || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* 자격증 */}
      {applicant.certificates && applicant.certificates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FaCertificate className="w-5 h-5 text-purple-600" />
            자격증
          </h4>
          <div className="space-y-3">
            {applicant.certificates.map((cert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium">{cert.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {cert.date} {cert.duration && `• ${cert.duration}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 면접 일정 */}
      {applicant.schedule_date && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FiCalendar className="w-5 h-5 text-orange-600" />
            면접 일정
          </h4>
          <div className="flex items-center gap-3">
            <FiClock className="w-5 h-5 text-orange-500" />
            <span className="font-medium">
              {new Date(applicant.schedule_date).toLocaleString('ko-KR')}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderResumeInfo = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : resumeData ? (
        <div className="space-y-6">
          {/* 이력서 내용 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              이력서 내용
            </h4>
            <div className="prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg overflow-auto max-h-96">
                {resumeData.content || '이력서 내용이 없습니다.'}
              </pre>
            </div>
          </div>

          {/* 기술 스택 */}
          {resumeData.skills && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                기술 스택
              </h4>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.split(',').map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <FiBook className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">이력서 정보를 불러올 수 없습니다.</p>
        </div>
      )}
    </div>
  );

  const renderEvaluationInfo = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : interviewEvaluations.length > 0 ? (
        <div className="space-y-6">
          {interviewEvaluations.map((evaluation, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {evaluation.type || '면접'} 평가
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {evaluation.total_score || 0}점
                  </span>
                  <FiStar className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">평가자</span>
                  <p className="font-medium">{evaluation.evaluator_name || 'AI'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">평가일</span>
                  <p className="font-medium">
                    {evaluation.created_at ? new Date(evaluation.created_at).toLocaleDateString('ko-KR') : 'N/A'}
                  </p>
                </div>
              </div>

              {evaluation.summary && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">종합 평가</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {evaluation.summary}
                  </p>
                </div>
              )}

              {evaluation.items && evaluation.items.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">세부 평가</span>
                  <div className="mt-2 space-y-2">
                    {evaluation.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="font-medium">{item.type || item.evaluate_type}:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {item.score || item.evaluate_score}점
                          </span>
                          {item.comment && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              - {item.comment}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FiStar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">평가 기록이 없습니다.</p>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicInfo();
      case 'resume':
        return renderResumeInfo();
      case 'evaluation':
        return renderEvaluationInfo();
      default:
        return renderBasicInfo();
    }
  };

  if (!isOpen || !applicant) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ paddingTop: '5rem', paddingLeft: '18rem' }}>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[75vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {applicant.name} 지원자 상세 정보
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                개인정보 및 평가 기록 확인
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ApplicantInfoModal; 