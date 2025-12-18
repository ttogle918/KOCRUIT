import React, { useState, useEffect } from 'react';
import InterviewWorkspace from '../../../../../components/interview/common/InterviewWorkspace';
import useInterviewData from '../../../../../hooks/useInterviewData';
import { getExecutiveCandidates } from '../../../../../api/api'; 

// 임원진 면접 페이지 (Split View 구조)
export default function ExecutiveInterviewPage() {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 선택된 지원자의 면접 데이터 로딩
  const { questions, application, loading: dataLoading, error: dataError } = useInterviewData('executive', selectedCandidateId);

  // 1. 지원자 목록 조회
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setListLoading(true);
        // 임원진 면접 대상자 조회
        const data = await getExecutiveCandidates(); 
        setCandidates(data);
      } catch (err) {
        console.error("지원자 목록 로딩 실패:", err);
      } finally {
        setListLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* 1. Left Sidebar: 지원자 목록 */}
      <div 
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col relative`}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-purple-50">
          <h2 className="text-lg font-bold text-gray-800">임원진 면접 대기</h2>
          <span className="bg-purple-200 text-purple-800 text-xs px-2 py-0.5 rounded-full">
            {candidates.length}명
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {listLoading ? (
            <div className="p-4 text-center text-gray-500">로딩 중...</div>
          ) : candidates.length === 0 ? (
            <div className="p-4 text-center text-gray-500">대기 중인 지원자가 없습니다.</div>
          ) : (
            candidates.map((candidate, index) => (
              <div 
                key={candidate.application_id}
                onClick={() => setSelectedCandidateId(candidate.application_id)}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                  selectedCandidateId === candidate.application_id 
                    ? 'bg-purple-50 border-purple-500 shadow-md transform scale-[1.02]' 
                    : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                      {index + 1}
                    </span>
                    <h3 className="font-bold text-gray-900">{candidate.applicant_name}</h3>
                  </div>
                  {/* 상태 뱃지 */}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    candidate.stage_status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    candidate.stage_status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {candidate.stage_status === 'IN_PROGRESS' ? '면접중' : 
                     candidate.stage_status === 'COMPLETED' ? '완료' : '대기'}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-1 font-medium">{candidate.job_title}</div>
                
                <div className="flex justify-between items-center mt-3 text-xs text-gray-500 border-t pt-2 border-gray-100">
                  <span>{candidate.applicant_email}</span>
                  <span>{candidate.applied_at?.split('T')[0]}</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* 사이드바 접기/펼치기 버튼 */}
        <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 shadow-md hover:bg-gray-50 focus:outline-none z-10"
            title={sidebarOpen ? "목록 접기" : "목록 펼치기"}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                )}
            </svg>
        </button>
      </div>

      {/* 2. Main Content: 면접 워크스페이스 */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
         {!sidebarOpen && (
            <button
                onClick={() => setSidebarOpen(true)}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-r-md p-2 shadow-md hover:bg-gray-50 focus:outline-none z-10"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
         )}

        {selectedCandidateId ? (
          dataLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-lg text-gray-600">데이터 불러오는 중...</div>
            </div>
          ) : dataError ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-red-600">데이터 로딩 오류: {dataError.message}</div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
               <InterviewWorkspace 
                  questions={questions}
                  applicantName={application?.applicantName || application?.name}
                  jobInfo={{ title: application?.job_title || '직무 정보 없음' }}
                  resumeInfo={application} 
                  interviewType="executive"
                  interviewStage="executive"
                  applicationId={selectedCandidateId}
                />
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl font-medium">면접을 진행할 지원자를 왼쪽 목록에서 선택해주세요.</p>
            <p className="mt-2 text-sm">임원진 면접 대상자만 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
