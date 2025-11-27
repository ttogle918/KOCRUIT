import React, { useState, useEffect } from 'react';
import Layout from '../../layout/Layout';
import { FaRegStar, FaStar, FaCalendarAlt, FaEnvelope } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import PassReasonCard from '../../components/PassReasonCard';
import InterviewInfoModal from '../../components/interview/InterviewInfoModal';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import { calculateAge } from '../../utils/resumeUtils';

export default function PassedApplicants() {
  const [passedApplicants, setPassedApplicants] = useState([]);
  const [totalApplicants, setTotalApplicants] = useState(0);  // 전체 지원자 수 추가
  const [bookmarkedList, setBookmarkedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedApplicants, setSelectedApplicants] = useState([]);
  const navigate = useNavigate();
  const { jobPostId } = useParams();
  const [jobPost, setJobPost] = useState(null);
  const [jobPostLoading, setJobPostLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [sortOrder, setSortOrder] = useState(null); // 'desc' | 'asc' | null
  const [showSortOptions, setShowSortOptions] = useState(false);

  useEffect(() => {
    const fetchApplicants = async (retryCount = 0) => {
      try {
        console.log('서류 합격자 목록 조회 시작:', { jobPostId, retryCount });
        
        // 전체 지원자 목록 조회 (타임아웃 설정 제거, 기본 60초 사용)
        const res = await api.get(`/applications/job/${jobPostId}/applicants`);
        const data = res.data;
        console.log('전체 지원자 수:', data.length);
        
        // 서류 합격자만 필터링
        const filtered = data.filter(app => app.document_status === 'PASSED');
        console.log('서류 합격자 수 (필터링):', filtered.length);
        
        setPassedApplicants(filtered);
        setTotalApplicants(data.length); // 전체 지원자 수 업데이트
        setBookmarkedList(filtered.map(app => app.isBookmarked === 'Y'));
        setCurrentPage(1);
        setLoading(false);
        setError(null); // 성공 시 에러 상태 초기화
      } catch (err) {
        console.error('서류 합격자 목록 조회 오류:', err);
        
        // 재시도 로직 (최대 3회)
        if (retryCount < 3 && (err.code === 'ECONNABORTED' || err.response?.status >= 500)) {
          console.log(`재시도 ${retryCount + 1}/3`);
          setTimeout(() => {
            fetchApplicants(retryCount + 1);
          }, 2000 * (retryCount + 1)); // 지수 백오프
          return;
        }
        
        // 더 구체적인 에러 메시지
        let errorMessage = '합격자 목록을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.';
        
        if (err.response) {
          if (err.response.status === 404) {
            errorMessage = '해당 공고의 지원자 데이터를 찾을 수 없습니다.';
          } else if (err.response.status === 500) {
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          }
        } else if (err.code === 'ECONNABORTED') {
          errorMessage = '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
        } else if (err.userMessage) {
          errorMessage = err.userMessage;
        }
        
        setError(errorMessage);
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

  const handleApplicantClick = (applicant) => {
    setSelectedApplicant(applicant);
    setSplitMode(true);
  };

  const handleBackToList = () => {
    setSplitMode(false);
    setSelectedApplicant(null);
  };

  const handleCheckboxChange = (applicant) => {
    setSelectedApplicants(prev => {
      if (prev.some(a => a.id === applicant.id)) {
        return prev.filter(a => a.id !== applicant.id);
      } else {
        return [...prev, applicant];
      }
    });
  };

  const handleEmailClick = () => {
    if (selectedApplicants.length === 0) {
      alert('이메일을 보낼 합격자를 한 명 이상 선택하세요.');
      return;
    }
    setShowInterviewModal(true);
  };

  const handleInterviewSubmit = (interviewInfo) => {
    setShowInterviewModal(false);
    navigate('/email', { state: { applicants: selectedApplicants, interviewInfo } });
  };

  // 지원자 상태 변경 함수
  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      console.log('상태 변경 요청:', { applicationId, newStatus });
      
      // 백엔드 API 호출 (PUT 메서드 사용)
      const response = await api.put(`/applications/${applicationId}/status`, {
        document_status: newStatus
      });
      
      console.log('상태 변경 성공:', response.data);
      
      // 로컬 상태 업데이트
      setPassedApplicants(prev => 
        prev.filter(app => app.application_id !== applicationId)
      );
      
      // 선택된 지원자가 변경된 경우 선택 해제
      if (selectedApplicant?.application_id === applicationId) {
        setSelectedApplicant(null);
        setSplitMode(false);
      }
      
      // 성공 메시지
      alert(`지원자 상태가 ${newStatus === 'REJECTED' ? '불합격' : newStatus}으로 변경되었습니다.`);
      
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 정렬 함수
  const getSortedApplicants = () => {
    if (!sortOrder) return passedApplicants;
    return [...passedApplicants].sort((a, b) => {
      const aScore = a.ai_score ?? 0;
      const bScore = b.ai_score ?? 0;
      if (sortOrder === 'asc') return aScore - bScore;
      if (sortOrder === 'desc') return bScore - aScore;
      return 0;
    });
  };
  const sortedApplicants = getSortedApplicants();
  const totalPages = Math.ceil(sortedApplicants.length / PAGE_SIZE);
  const pagedApplicants = sortedApplicants.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);

  if (loading) {
    return (
      <Layout>
        <ViewPostSidebar jobPost={jobPost} />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-xl text-gray-600">서류 합격자 목록을 불러오는 중...</div>
            <div className="text-sm text-gray-400 mt-2">잠시만 기다려주세요</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ViewPostSidebar jobPost={jobPost} />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl text-red-500 mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ViewPostSidebar jobPost={jobPost} />
      <div className="h-screen flex flex-col px-4 py-24" style={{ marginLeft: 90 }}>
        {/* Title Box */}
        <div className="bg-white dark:bg-gray-800 shadow px-8 py-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            서류 합격자 명단
          </div>
          <button
            onClick={() => navigate(`/applicantlist/${jobPostId}`)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
        {/* 안내 멘트 */}
        <div className="w-full flex justify-center items-center py-2">
          {typeof jobPost?.headcount === 'number' ? (
            <span className="text-2xl font-bold text-gray-700 dark:text-gray-200">
              지원자 {totalApplicants ?? '-'}명 중 최종 선발인원의 10배수({jobPost.headcount * 10}명) 기준, 동점자를 포함하여 총 {passedApplicants?.length ?? '-'}명이 서류 합격되었습니다.
            </span>
          ) : (
            <span className="text-xl font-bold text-gray-400">합격자/정원 정보를 불러오는 중...</span>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className={`w-full h-full ${splitMode ? 'flex gap-6' : ''}`}>
            {/* Left Panel - Applicant List */}
            <div className={`${splitMode ? 'w-1/2 min-h-[600px]' : 'w-full'} h-auto`}>
              {/* Filter Tabs + Sort Button */}
              <div className="flex justify-between items-center mb-4">
                <div className="relative">
                  <button
                    className="text-sm text-gray-700 bg-white border border-gray-300 px-3 py-1 rounded shadow-sm hover:bg-gray-100"
                    onClick={() => setShowSortOptions((prev) => !prev)}
                  >
                    점수 정렬
                  </button>
                  {showSortOptions && (
                    <div className="absolute left-0 mt-2 bg-white border rounded shadow z-10 flex flex-col min-w-[120px]">
                      <button
                        className={`px-4 py-2 text-left hover:bg-gray-100 ${sortOrder === 'asc' ? 'font-bold text-blue-600' : ''}`}
                        onClick={() => { setSortOrder('asc'); setShowSortOptions(false); setCurrentPage(1); }}
                      >
                        오름차순
                      </button>
                      <button
                        className={`px-4 py-2 text-left hover:bg-gray-100 ${sortOrder === 'desc' ? 'font-bold text-blue-600' : ''}`}
                        onClick={() => { setSortOrder('desc'); setShowSortOptions(false); setCurrentPage(1); }}
                      >
                        내림차순
                      </button>
                      <button
                        className="px-4 py-2 text-left hover:bg-gray-100 text-gray-500"
                        onClick={() => { setSortOrder(null); setShowSortOptions(false); setCurrentPage(1); }}
                      >
                        정렬 해제
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 지원자 카드 그리드 (스크롤 없음) */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {pagedApplicants.map((applicant, i) => (
                  <div
                    key={applicant.id}
                    className={`relative bg-white dark:bg-gray-800 rounded-3xl border p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all ${
                      selectedApplicant?.id === applicant.id 
                        ? 'border-blue-500 shadow-lg' 
                        : 'border-gray-200'
                    }`}
                    style={{ borderRadius: '1.5rem' }}
                    onClick={() => handleApplicantClick(applicant)}
                  >
                    {/* 체크박스 */}
                    <input
                      type="checkbox"
                      checked={selectedApplicants.some(a => a.id === applicant.id)}
                      onChange={e => { e.stopPropagation(); handleCheckboxChange(applicant); }}
                      className="absolute top-2 left-8 w-4 h-4"
                    />
                    {/* 번호 */}
                    <div className="absolute top-2 left-2 text-xs font-bold text-blue-600">{i + 1}</div>
                    {/* 즐겨찾기 별 버튼 */}
                    <button 
                      className="absolute top-2 right-2 text-xl"
                      onClick={(e) => {
                        e.stopPropagation(); // 상세 페이지로 이동하지 않도록
                      }}
                    >
                      {bookmarkedList[i] ? (
                        <FaStar className="text-yellow-400" />
                      ) : (
                        <FaRegStar className="text-gray-400" />
                      )}
                    </button>
                    {/* 프로필 이미지 */}
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                      <i className="fa-solid fa-user text-white text-xl" />
                    </div>
                    {/* 중앙 텍스트 정보 */}
                    <div className="flex flex-col flex-grow">
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                        {new Date(applicant.appliedAt).toLocaleDateString()}
                      </div>
                      <div className="text-lg font-semibold text-gray-800 dark:text-white">
                        {applicant.name} ({calculateAge(applicant.birthDate)}세)
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {applicant.applicationSource || 'DIRECT'}
                      </div>
                    </div>
                    {/* 점수 원 */}
                    <div className="w-16 h-16 border-2 border-blue-300 rounded-full flex items-center justify-center text-sm font-bold text-gray-800 dark:text-white">
                      {applicant.ai_score || 0}점
                    </div>
                  </div>
                ))}
              </div>
              {/* 페이지네이션 버튼 (항상 아래 고정) */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                  {Array.from({ length: totalPages }, (_, idx) => (
                    <button
                      key={idx}
                      className={`px-3 py-1 rounded ${currentPage === idx+1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      onClick={() => setCurrentPage(idx+1)}
                    >
                      {idx+1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel - Applicant Detail */}
            {splitMode && selectedApplicant && (
              <div className="w-1/2 min-h-[600px]">
                <PassReasonCard 
                  applicant={selectedApplicant} 
                  onBack={handleBackToList} 
                  onStatusChange={handleStatusChange} 
                />
              </div>
            )}
          </div>
        </div>
        {/* Floating Action Buttons */}
        <div className="fixed bottom-8 right-16 flex flex-row gap-4 z-50">
          <button 
            className="w-14 h-14 flex items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition text-2xl"
            onClick={handleEmailClick}
            disabled={selectedApplicants.length === 0}
          >
            <FaEnvelope />
          </button>
        </div>
      </div>
      
      {/* Interview Info Modal */}
      {showInterviewModal && (
        <InterviewInfoModal
          onSubmit={handleInterviewSubmit}
          onClose={() => setShowInterviewModal(false)}
        />
      )}
    </Layout>
  );
}