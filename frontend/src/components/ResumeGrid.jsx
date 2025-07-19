import React, { useState, useEffect } from 'react';
import { mapResumeData } from '../utils/resumeUtils';
import api from '../api/api';

const ResumeGrid = ({
  applicants = [],
  selectedApplicantId,
  onApplicantSelect,
  calculateAge = () => ''
}) => {
  const [resumeData, setResumeData] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  // 지원자별 이력서 데이터 로드
  const loadResumeData = async (applicantId) => {
    if (resumeData[applicantId]) return; // 이미 로드된 경우

    setLoadingStates(prev => ({ ...prev, [applicantId]: true }));
    
    try {
      const res = await api.get(`/applications/${applicantId}`);
      const mappedResume = mapResumeData(res.data);
      setResumeData(prev => ({ ...prev, [applicantId]: mappedResume }));
    } catch (error) {
      console.error('이력서 로드 실패:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [applicantId]: false }));
    }
  };

  // 지원자 클릭 시 이력서 로드 및 선택
  const handleApplicantClick = async (applicant) => {
    const applicantId = applicant.applicant_id || applicant.id;
    await loadResumeData(applicantId);
    onApplicantSelect(applicant);
  };

  // 컴포넌트 마운트 시 모든 지원자의 이력서 프리로드
  useEffect(() => {
    applicants.forEach(applicant => {
      const applicantId = applicant.applicant_id || applicant.id;
      loadResumeData(applicantId);
    });
  }, [applicants]);

  if (applicants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        지원자가 없습니다.
      </div>
    );
  }

  // 지원자 수에 따른 그리드 레이아웃 계산
  const getGridLayout = (count) => {
    if (count <= 2) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-3'; // 최대 3열
  };

  const gridClass = getGridLayout(applicants.length);
  const itemHeight = applicants.length <= 2 ? 'h-1/2' : 'h-1/3';

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-300 dark:border-gray-600">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          이력서 미리보기 ({applicants.length}명)
        </h3>
      </div>

      {/* 이력서 그리드 */}
      <div className={`flex-1 p-4 grid ${gridClass} gap-4 overflow-y-auto`}>
        {applicants.map((applicant, index) => {
          const applicantId = applicant.applicant_id || applicant.id;
          const isSelected = selectedApplicantId === applicantId;
          const resume = resumeData[applicantId];
          const isLoading = loadingStates[applicantId];

          return (
            <div
              key={applicantId}
              className={`${itemHeight} border rounded-lg cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'border-2 border-blue-500 ring-2 ring-blue-200 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              onClick={() => handleApplicantClick(applicant)}
            >
              {isLoading ? (
                // 로딩 상태
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : resume ? (
                // 이력서 내용
                <div className="p-3 h-full overflow-y-auto">
                  {/* 지원자 정보 헤더 */}
                  <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {applicant.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {calculateAge(applicant.birthDate)}세 • {applicant.applicationSource || 'DIRECT'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          AI: {applicant.ai_score || 0}점
                        </div>
                        <div className="text-xs text-gray-500">
                          서류: {applicant.ai_score || 0}점
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 이력서 내용 */}
                  <div className="space-y-2 text-xs">
                    {/* 학력 */}
                    {resume.education && resume.education.length > 0 && (
                      <div>
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">학력</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {resume.education[0]?.school} {resume.education[0]?.major}
                        </div>
                      </div>
                    )}

                    {/* 경력 */}
                    {resume.experience && resume.experience.length > 0 && (
                      <div>
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">경력</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {resume.experience[0]?.company} • {resume.experience[0]?.position}
                        </div>
                      </div>
                    )}

                    {/* 기술 스택 */}
                    {resume.skills && resume.skills.length > 0 && (
                      <div>
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">기술</div>
                        <div className="flex flex-wrap gap-1">
                          {resume.skills.slice(0, 5).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                          {resume.skills.length > 5 && (
                            <span className="text-xs text-gray-500">+{resume.skills.length - 5}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 자기소개 */}
                    {resume.introduction && (
                      <div>
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">자기소개</div>
                        <div className="text-gray-600 dark:text-gray-400 line-clamp-3">
                          {resume.introduction}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // 에러 상태
                <div className="flex items-center justify-center h-full text-red-500 text-sm">
                  이력서를 불러올 수 없습니다.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResumeGrid; 