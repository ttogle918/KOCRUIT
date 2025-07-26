import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CiSettings, CiUser, CiCalendar } from 'react-icons/ci';
import { MdOutlinePlayCircle, MdCheckCircle } from 'react-icons/md';
import { MdOutlineAutoAwesome, MdOutlineGroups, MdOutlineBusiness } from 'react-icons/md';

export default function ViewPostSidebar({ jobPost }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobPostId: urlJobPostId } = useParams();
  const [isHovered, setIsHovered] = useState(false);
  const headerHeight = 64;
  // jobPost 객체의 id를 우선적으로 사용, 없으면 URL 파라미터 사용
  const effectiveJobPostId = jobPost?.id || urlJobPostId || '';
  
  console.log('[ViewPostSidebar] jobPost 정보:', {
    jobPost: jobPost,
    jobPostId: jobPost?.id,
    urlJobPostId: urlJobPostId,
    effectiveJobPostId: effectiveJobPostId,
    effectiveJobPostIdType: typeof effectiveJobPostId
  });

  // 각 버튼의 경로
  const applicantListPath = `/applicantlist/${effectiveJobPostId}`;
  const passedApplicantsPath = `/passedapplicants/${effectiveJobPostId}`;
  const interviewProgressPath = `/interview-progress/${effectiveJobPostId}`;
  
  // 면접 단계별 경로
  const aiInterviewPath = `/interview-progress/${effectiveJobPostId}/ai`;
  const firstInterviewPath = `/interview-progress/${effectiveJobPostId}/first`;
  const secondInterviewPath = `/interview-progress/${effectiveJobPostId}/second`;



  // 현재 경로와 비교
  const isApplicantList = location.pathname === applicantListPath;
  const isPassedApplicants = location.pathname === passedApplicantsPath;
  const isInterviewProgress = location.pathname === interviewProgressPath;
  
  // 면접 단계별 활성 상태 확인
  const isAiInterview = location.pathname === aiInterviewPath;
  const isFirstInterview = location.pathname === firstInterviewPath;
  const isSecondInterview = location.pathname === secondInterviewPath;

  return (
    <div
      className="fixed left-0 top-[64px] dark:bg-gray-800 dark:text-gray-100 bg-white text-gray-900 flex flex-col items-center pt-4 transition-all"
      style={{ zIndex: 9999, width: isHovered ? 180 : 90, height: `calc(100vh - ${headerHeight}px)`, borderRight: '1px solid #e2e8f0' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 공고 정보 (jobPost 있을 때만) */}
      {jobPost && (
        <div className="w-full mb-4 px-1">
          <div className="font-bold text-md dark:text-gray-100 mb-1 truncate">{jobPost?.title || '공고 제목'}</div>
          <div className="text-xs text-gray-400 dark:text-gray-400 truncate">{jobPost?.startDate} ~ {jobPost?.endDate}</div>
        </div>
      )}
      {/* 네비게이션 버튼 (항상 표시) */}
      <div className="flex flex-col gap-2 w-full mb-6">
        {/* 공고 조회 버튼 추가 */}
        <button
          className={`flex items-center w-full h-11 rounded-md px-2 transition text-sm font-semibold
            ${isHovered ? 'justify-start' : 'justify-center'}
            bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800'
          `}
          onClick={() => navigate(`/viewpost/${effectiveJobPostId}`)}
        >
          <MdOutlineBusiness size={22} />
          {isHovered && <span className="ml-2">공고 조회</span>}
        </button>
        <button
          className={`flex items-center w-full h-11 rounded-md px-2 transition text-sm font-semibold
            ${isHovered ? 'justify-start' : 'justify-center'}
            ${isApplicantList
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}
          `}
          onClick={() => navigate(applicantListPath)}
        >
          <CiUser size={22} />
          {isHovered && <span className="ml-2">지원자 조회</span>}
        </button>
        <button
          className={`flex items-center w-full h-11 rounded-md px-2 transition text-sm font-semibold
            ${isHovered ? 'justify-start' : 'justify-center'}
            ${isPassedApplicants
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}
          `}
          onClick={() => navigate(passedApplicantsPath)}
        >
          <MdCheckCircle size={22} />
          {isHovered && <span className="ml-2">서류 합격자 명단</span>}
        </button>
        {/* 필기 질문 생성 버튼 추가 */}
        <button
          className={`flex items-center w-full h-11 rounded-md px-2 transition text-sm font-semibold
            ${isHovered ? 'justify-start' : 'justify-center'}
            bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200 hover:bg-teal-200 dark:hover:bg-teal-800'
          `}
          onClick={() => navigate('/applicant/written-test-generator')}
        >
          <MdOutlinePlayCircle size={20} />
          {isHovered && <span className="ml-2">필기 질문 생성</span>}
        </button>
        {/* 필기 합격자 명단 버튼 */}
        <button
          className={`flex items-center w-full h-11 rounded-md px-2 transition text-sm font-semibold
            ${isHovered ? 'justify-start' : 'justify-center'}
            bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
          `}
          onClick={() => navigate(`/written-test-passed/${effectiveJobPostId}`)}
        >
          <MdCheckCircle size={20} />
          {isHovered && <span className="ml-2">필기 합격자 명단</span>}
        </button>
      </div>
      
      {/* 면접 단계별 네비게이션 */}
      <div className="flex flex-col gap-1 w-full mb-6">
        <div className={`text-xs font-semibold px-2 mb-1 ${isHovered ? 'block' : 'hidden'}`}>
          면접 진행
        </div>
        {/* AI 면접 */}
        <button
          className={`flex items-center w-full h-10 rounded-md px-2 transition text-sm font-semibold
            ${isHovered ? 'justify-start' : 'justify-center'}
            ${isAiInterview
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}
          `}
          onClick={() => navigate(aiInterviewPath)}
        >
          <MdOutlineAutoAwesome size={20} />
          {isHovered && <span className="ml-2">AI 면접</span>}
        </button>
        {/* 1차 면접 (실무진) */}
        <button
          className={`flex items-center w-full h-10 rounded-md px-2 transition text-sm font-semibold
            ${isHovered ? 'justify-start' : 'justify-center'}
            ${isFirstInterview
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}
          `}
          onClick={() => navigate(firstInterviewPath)}
        >
          <MdOutlineGroups size={20} />
          {isHovered && <span className="ml-2">1차 면접</span>}
        </button>
        {/* 2차 면접 (임원) */}
        <button
          className={`flex items-center w-full h-10 rounded-md px-2 transition text-sm font-semibold
            ${isHovered ? 'justify-start' : 'justify-center'}
            ${isSecondInterview
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}
          `}
          onClick={() => navigate(secondInterviewPath)}
        >
          <MdOutlineBusiness size={20} />
          {isHovered && <span className="ml-2">2차 면접</span>}
        </button>
      </div>
      
      {/* 보고서 버튼들 (항상 표시) */}
      <div className="flex flex-col gap-1 w-full mb-6">
        {/* 서류 보고서 버튼 */}
        <button
          className={`flex items-center w-full h-9 rounded-md px-2 transition text-sm
            ${isHovered ? 'justify-start' : 'justify-center'}
            ${effectiveJobPostId ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
          `}
          onClick={() => effectiveJobPostId && navigate(`/report/document?job_post_id=${effectiveJobPostId}`)}
          disabled={!effectiveJobPostId}
        >
          <MdCheckCircle size={18} />
          {isHovered && <span className="ml-2 text-sm">서류전형 평가서</span>}
        </button>
        {/* 직무적성평가 보고서 버튼 */}
        <button
          className={`flex items-center w-full h-9 rounded-md px-2 transition text-sm
            ${isHovered ? 'justify-start' : 'justify-center'}
            ${effectiveJobPostId ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
          `}
          onClick={() => effectiveJobPostId && navigate(`/report/job-aptitude?job_post_id=${effectiveJobPostId}`)}
          disabled={!effectiveJobPostId}
        >
          <MdCheckCircle size={18} />
          {isHovered && <span className="ml-2 text-sm">직무적성평가 보고서</span>}
        </button>
        {/* 면접 보고서 버튼 */}
        <button
          className={`flex items-center w-full h-9 rounded-md px-2 transition text-sm
            ${isHovered ? 'justify-start' : 'justify-center'}
            ${effectiveJobPostId ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
          `}
          onClick={() => effectiveJobPostId && navigate(`/interview-report?job_post_id=${effectiveJobPostId}`)}
          disabled={!effectiveJobPostId}
        >
          <MdCheckCircle size={18} />
          {isHovered && <span className="ml-2 text-sm">면접 보고서</span>}
        </button>
        {/* 최종 보고서 버튼 */}
        <button
          className={`flex items-center w-full h-9 rounded-md px-2 transition text-sm
            ${isHovered ? 'justify-start' : 'justify-center'}
            ${effectiveJobPostId ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
          `}
          onClick={() => effectiveJobPostId && navigate(`/report/final?job_post_id=${effectiveJobPostId}`)}
          disabled={!effectiveJobPostId}
        >
          <MdCheckCircle size={18} />
          {isHovered && <span className="ml-2 text-sm">최종 보고서</span>}
        </button>
      </div>
      {/* 하단 네비게이션 */}
      <div className="flex flex-col gap-2 w-full mb-4">
        <button
          className={`flex items-center w-full h-10 rounded-md px-2 transition text-sm
            ${isHovered ? 'justify-start' : 'justify-center'}
            bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`}
          onClick={() => navigate(`/interview-panel-management/${effectiveJobPostId}`)}
        >
          <CiCalendar size={22} />
          {isHovered && <span className="ml-2">면접관 편성</span>}
        </button>
        <button
          className={`flex items-center w-full h-10 rounded-md px-2 transition text-sm
            ${isHovered ? 'justify-start' : 'justify-center'}
            bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`}
          onClick={() => navigate('/settings')}
        >
          <CiSettings size={22} />
          {isHovered && <span className="ml-2">설정</span>}
        </button>
        <button
          className={`flex items-center w-full h-10 rounded-md px-2 transition text-sm
            ${isHovered ? 'justify-start' : 'justify-center'}
            bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`}
          onClick={() => navigate('/mypage')}
        >
          <CiUser size={22} />
          {isHovered && <span className="ml-2">내 정보</span>}
        </button>
      </div>
    </div>
  );
}