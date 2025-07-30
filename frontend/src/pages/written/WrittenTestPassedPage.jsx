import React, { useState, useEffect } from 'react';
import Layout from '../../layout/Layout';
import { FaRegStar, FaStar, FaEnvelope } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import PassReasonCard from '../../components/PassReasonCard';
import InterviewInfoModal from '../../components/InterviewInfoModal';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import { calculateAge } from '../../utils/resumeUtils';
import { getWrittenTestAnswers } from '../../api/writtenTestApi';

// 문제별 답안 모달
function AnswerDetailModal({ open, onClose, answers }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={onClose}>✕</button>
        <h3 className="text-lg font-bold mb-4">지원자 답안 상세</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-3 py-2 border">문제 번호</th>
                <th className="px-3 py-2 border">지원자 답변</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((a, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 border text-center">{idx + 1}</td>
                  <td className="px-3 py-2 border whitespace-pre-line max-w-xs break-words">{a.answer_text || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// WrittenTestPassDetail: 필기 합격자 상세 패널 (합격 사유 + 문제별 피드백)
function WrittenTestPassDetail({ applicant, feedbacks, onBack, onShowAnswers }) {
  if (!applicant) return null;
  // 합격 사유는 고정 문구
  const mainPassReason = '필기 평가에서 우수한 성과를 보여 합격 처리되었습니다.';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full overflow-y-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
        ← 목록으로
      </button>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{applicant.user_name}</h2>
      <div className="mb-4 text-lg font-semibold text-green-700">필기 합격</div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">합격 사유</h3>
        <div className="rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {mainPassReason}
          </p>
          {feedbacks && feedbacks.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">문제별 피드백</h4>
              <ul className="list-disc pl-6">
                {feedbacks.map((fb, idx) => (
                  <li key={idx} className="text-gray-700 dark:text-gray-300 mb-1">
                    <span className="font-bold">문제 {idx + 1}:</span> {fb.feedback}
                    {typeof fb.score !== 'undefined' && (
                      <span className="ml-2 text-blue-700 font-semibold">(점수: {fb.score})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="text-md text-gray-600 dark:text-gray-300 mb-4">최종 필기 점수: <span className="font-bold text-blue-700">{applicant.written_test_score}</span></div>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mt-2"
        onClick={onShowAnswers}
      >
        지원자 답안 보기
      </button>
    </div>
  );
}

export default function WrittenTestPassedPage() {
  const [passedApplicants, setPassedApplicants] = useState([]);
  const [bookmarkedList, setBookmarkedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedApplicants, setSelectedApplicants] = useState([]);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState([]);
  const navigate = useNavigate();
  const { jobpostId } = useParams();
  const [jobPost, setJobPost] = useState(null);
  const [jobPostLoading, setJobPostLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [sortOrder, setSortOrder] = useState(null); // 'asc' | 'desc' | null
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [totalApplicants, setTotalApplicants] = useState(null);
  const [documentPassedCount, setDocumentPassedCount] = useState(null);
  const passMultiplier = 5; // 정책상 5배수

  // 디버깅을 위한 로그
  console.log('WrittenTestPassedPage 렌더링:', {
    jobpostId,
    jobpostIdType: typeof jobpostId,
    currentUrl: window.location.pathname,
    searchParams: window.location.search,
    documentPassedCount,
    totalApplicants,
    jobPost: jobPost ? { id: jobPost.id, title: jobPost.title, headcount: jobPost.headcount } : null,
    passedApplicantsLength: passedApplicants.length
  });

  // jobpostId 유효성 검사 개선
  const isValidJobPostId = jobpostId && 
                          jobpostId !== 'undefined' && 
                          jobpostId !== 'null' && 
                          !isNaN(parseInt(jobpostId)) && 
                          parseInt(jobpostId) > 0;

  console.log('jobpostId 유효성 검사:', {
    jobpostId,
    isValidJobPostId,
    parsedValue: jobpostId ? parseInt(jobpostId) : null
  });

  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        // URL에서 jobpostId를 직접 추출하는 fallback 로직
        let effectiveJobPostId = jobpostId;
        
        if (!effectiveJobPostId) {
          const pathParts = window.location.pathname.split('/');
          const possibleJobPostId = pathParts[pathParts.length - 1];
          if (possibleJobPostId && !isNaN(parseInt(possibleJobPostId)) && parseInt(possibleJobPostId) > 0) {
            effectiveJobPostId = possibleJobPostId;
            console.log('URL에서 jobpostId 추출:', effectiveJobPostId);
          }
        }
        
        if (!effectiveJobPostId || !isValidJobPostId) {
          console.error('유효하지 않은 jobpostId:', { jobpostId, effectiveJobPostId, isValidJobPostId });
          setError('채용공고 ID가 필요합니다. 올바른 URL로 접근해주세요.');
          setLoading(false);
          return;
        }
        
        console.log('필기 합격자 조회 시작:', { 
          originalJobpostId: jobpostId,
          effectiveJobPostId,
          currentUrl: window.location.pathname
        });
        
        const res = await api.get(`/ai-evaluate/written-test/passed/${effectiveJobPostId}`);
        const data = res.data;
        
        console.log('필기 합격자 조회 결과:', { 
          count: data.length, 
          data: data 
        });
        
        // 데이터 유효성 검사 추가
        if (!Array.isArray(data)) {
          console.error('필기 합격자 데이터가 배열이 아닙니다:', data);
          setError('필기 합격자 데이터 형식이 올바르지 않습니다.');
          setLoading(false);
          return;
        }
        
        setPassedApplicants(data);
        setBookmarkedList(data.map(() => false));
        setCurrentPage(1);
        setLoading(false);
        setError(null); // 성공 시 에러 상태 초기화
      } catch (err) {
        console.error('필기 합격자 조회 오류:', err);
        
        // 더 구체적인 에러 메시지
        let errorMessage = '합격자 목록을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.';
        
        if (err.response) {
          if (err.response.status === 404) {
            errorMessage = '해당 공고의 필기 합격자 데이터를 찾을 수 없습니다.';
          } else if (err.response.status === 500) {
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          }
        } else if (err.code === 'ECONNABORTED') {
          errorMessage = '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };
    fetchApplicants();
  }, [jobpostId, isValidJobPostId]);

  useEffect(() => {
    const fetchJobPost = async () => {
      // URL에서 jobpostId를 직접 추출하는 fallback 로직
      let effectiveJobPostId = jobpostId;
      
      if (!effectiveJobPostId) {
        const pathParts = window.location.pathname.split('/');
        const possibleJobPostId = pathParts[pathParts.length - 1];
        if (possibleJobPostId && !isNaN(parseInt(possibleJobPostId)) && parseInt(possibleJobPostId) > 0) {
          effectiveJobPostId = possibleJobPostId;
        }
      }
      
      if (!effectiveJobPostId || !isValidJobPostId) return;
      
      setJobPostLoading(true);
      try {
        console.log('공고 정보 조회 시작:', { 
          originalJobpostId: jobpostId,
          effectiveJobPostId,
          currentUrl: window.location.pathname
        });
        // 공개 jobpost 정보 API 사용
        const res = await api.get(`/public/jobposts/${effectiveJobPostId}`);
        // jobPost 객체에 id 필드를 명시적으로 추가
        const jobPostData = { ...res.data, id: effectiveJobPostId };
        setJobPost(jobPostData);
        console.log('공고 정보 조회 완료:', jobPostData);
      } catch (err) {
        console.error('JobPost fetch error:', err);
        // jobpost 정보가 없어도 페이지는 계속 로드되도록 기본 정보 설정
        setJobPost({
          id: effectiveJobPostId,
          title: `채용공고 ${effectiveJobPostId}`,
          companyName: '기업명',
          headcount: 1
        });
      } finally {
        setJobPostLoading(false);
      }
    };
    fetchJobPost();
  }, [jobpostId, isValidJobPostId]);

  // 전체 응시자 수와 서류 합격자 수를 한 번에 fetch
  useEffect(() => {
    const fetchCounts = async () => {
      // URL에서 jobpostId를 직접 추출하는 fallback 로직
      let effectiveJobPostId = jobpostId;
      
      if (!effectiveJobPostId) {
        const pathParts = window.location.pathname.split('/');
        const possibleJobPostId = pathParts[pathParts.length - 1];
        if (possibleJobPostId && !isNaN(parseInt(possibleJobPostId)) && parseInt(possibleJobPostId) > 0) {
          effectiveJobPostId = possibleJobPostId;
        }
      }
      
      if (!effectiveJobPostId || !isValidJobPostId) {
        console.log('카운트 조회 중단: 유효하지 않은 jobpostId', { jobpostId, effectiveJobPostId, isValidJobPostId });
        return;
      }
      
      console.log('카운트 조회 시작:', { effectiveJobPostId });
      
      try {
        // 먼저 간단한 API 시도
        const res = await api.get(`/applications/job/${effectiveJobPostId}/simple-counts`, { timeout: 3000 });
        console.log('간단한 카운트 조회 응답:', res.data);
        
        if (res.data && typeof res.data.total_applicants === 'number') {
          console.log('전체 응시자 수 설정:', res.data.total_applicants);
          setTotalApplicants(res.data.total_applicants);
        }
        
        if (res.data && typeof res.data.passed_applicants === 'number') {
          console.log('서류 합격자 수 설정:', res.data.passed_applicants);
          setDocumentPassedCount(res.data.passed_applicants);
        }
      } catch (err) {
        console.error('간단한 카운트 조회 오류:', err);
        
        // 기존 카운트 API 시도
        try {
          const res = await api.get(`/applications/job/${effectiveJobPostId}/counts`, { timeout: 3000 });
          console.log('기존 카운트 조회 응답:', res.data);
          
          if (res.data && typeof res.data.total_applicants === 'number') {
            setTotalApplicants(res.data.total_applicants);
          }
          
          if (res.data && typeof res.data.passed_applicants === 'number') {
            setDocumentPassedCount(res.data.passed_applicants);
          }
        } catch (countErr) {
          console.error('기존 카운트 조회도 실패:', countErr);
          
          // 타임아웃이나 에러 시 fallback 시도
          console.log('카운트 조회 실패, fallback 시도');
          
          try {
            // 기존 API로 개별 조회 시도
            const [totalRes, passedRes] = await Promise.allSettled([
              api.get(`/applications/job/${effectiveJobPostId}/applicants`, { timeout: 3000 }),
              api.get(`/applications/job/${effectiveJobPostId}/passed-applicants`, { timeout: 3000 })
            ]);
            
            if (totalRes.status === 'fulfilled' && Array.isArray(totalRes.value.data)) {
              setTotalApplicants(totalRes.value.data.length);
            }
            
            if (passedRes.status === 'fulfilled' && passedRes.value.data) {
              if (typeof passedRes.value.data.total_count === 'number') {
                setDocumentPassedCount(passedRes.value.data.total_count);
              } else if (Array.isArray(passedRes.value.data)) {
                setDocumentPassedCount(passedRes.value.data.length);
              }
            }
          } catch (fallbackErr) {
            console.error('Fallback 조회도 실패:', fallbackErr);
            
            // 필기 합격자 데이터가 있으면 추정값 사용
            if (passedApplicants.length > 0) {
              console.log('필기 합격자 데이터에서 추정값 사용');
              setTotalApplicants(passedApplicants.length * 3); // 추정: 필기 합격자 3배
              setDocumentPassedCount(passedApplicants.length * 2); // 추정: 필기 합격자 2배
            } else {
              setTotalApplicants(0);
              setDocumentPassedCount(0);
            }
          }
        }
      }
    };
    fetchCounts();
  }, [jobpostId, isValidJobPostId]);

  const handleApplicantClick = async (applicant) => {
    console.log('applicant:', applicant); // applicant 구조 확인용 로그
    setSelectedApplicant(applicant);
    setSplitMode(true);
    // 문제별 피드백 불러오기
    if (!isValidJobPostId) {
      setSelectedFeedbacks([]);
      setSelectedAnswers([]);
      return;
    }
    try {
      const answers = await getWrittenTestAnswers({ jobPostId: jobpostId, userId: applicant.user_id });
      console.log('written-test answers:', answers); // 응답 확인용 로그
      setSelectedFeedbacks(answers.map(a => ({ question_id: a.question_id, feedback: a.feedback, score: a.score, answer_text: a.answer_text })));
      setSelectedAnswers(answers); // answer_text 포함 전체 저장
    } catch {
      setSelectedFeedbacks([]);
      setSelectedAnswers([]);
    }
  };

  const handleBackToList = () => {
    setSplitMode(false);
    setSelectedApplicant(null);
  };

  const handleCheckboxChange = (applicant) => {
    setSelectedApplicants(prev => {
      if (prev.some(a => a.user_name === applicant.user_name)) {
        return prev.filter(a => a.user_name !== applicant.user_name);
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

  // 정렬 함수
  const getSortedApplicants = () => {
    if (!sortOrder) return passedApplicants;
    return [...passedApplicants].sort((a, b) => {
      const aScore = a.written_test_score ?? 0;
      const bScore = b.written_test_score ?? 0;
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-xl text-gray-600">필기 합격자 명단을 불러오는 중...</div>
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
          <div className="text-center max-w-md">
            <div className="text-red-500 text-xl mb-4">⚠️ 오류 발생</div>
            <div className="text-gray-600 mb-6">{error}</div>
            
            {/* 디버깅 정보 표시 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-left">
              <div className="text-gray-800 font-medium mb-2">디버깅 정보:</div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>현재 URL: {window.location.pathname}</div>
                <div>jobpostId: {jobpostId || 'undefined'}</div>
                <div>jobpostId 타입: {typeof jobpostId}</div>
                <div>유효성 검사: {isValidJobPostId ? '통과' : '실패'}</div>
                <div>URL 파라미터: {window.location.search}</div>
              </div>
            </div>
            
            {!isValidJobPostId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="text-yellow-800 font-medium mb-2">올바른 URL 형식:</div>
                <div className="text-sm text-yellow-700">
                  <code>/written-test-passed/1</code><br />
                  <code>/written-test-passed/2</code><br />
                  (1, 2는 채용공고 ID)
                </div>
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                새로고침
              </button>
              <button
                onClick={() => navigate('/corporatehome')}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors ml-2"
              >
                홈으로 돌아가기
              </button>
              <button
                onClick={() => {
                  console.log('현재 상태:', {
                    jobpostId,
                    isValidJobPostId,
                    currentUrl: window.location.pathname,
                    searchParams: window.location.search
                  });
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors ml-2"
              >
                디버그 정보 출력
              </button>
            </div>
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
            필기 합격자 명단
          </div>
          <button
            onClick={() => navigate(`/applicantlist/${jobpostId}`)}
            disabled={!isValidJobPostId}
            className={`px-4 py-2 rounded transition-colors ${
              isValidJobPostId 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            목록으로 돌아가기
          </button>
        </div>
        {/* 안내 멘트 */}
        <div className="w-full flex justify-center items-center py-2">
          {typeof documentPassedCount === 'number' && jobPost && jobPost.headcount ? (
            <span className="text-2xl font-bold text-gray-700 dark:text-gray-200">
              서류 합격자 {documentPassedCount}명 중 최종 선발인원의 {passMultiplier}배수({jobPost.headcount * passMultiplier}명) 기준, 동점자를 포함하여 총 {passedApplicants.length}명이 필기 합격되었습니다.
            </span>
          ) : (
            <div className="text-center">
              <div className="text-xl font-bold text-gray-400 mb-2">필기 합격자/선발 인원 정보를 불러오는 중...</div>
              <div className="text-sm text-gray-500">
                {!jobPost ? '공고 정보 로딩 중' : 
                 typeof documentPassedCount !== 'number' ? '서류 합격자 수 조회 중' : 
                 '데이터 처리 중'}
              </div>
            </div>
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
                    key={applicant.user_name || i}
                    className={`relative bg-white dark:bg-gray-800 rounded-3xl border p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all ${
                      selectedApplicant?.user_name === applicant.user_name 
                        ? 'border-blue-500 shadow-lg' 
                        : 'border-gray-200'
                    }`}
                    style={{ borderRadius: '1.5rem' }}
                    onClick={() => handleApplicantClick(applicant)}
                  >
                    {/* 체크박스 */}
                    <input
                      type="checkbox"
                      checked={selectedApplicants.some(a => a.user_name === applicant.user_name)}
                      onChange={e => { e.stopPropagation(); handleCheckboxChange(applicant); }}
                      className="absolute top-2 left-8 w-4 h-4"
                    />
                    {/* 번호 */}
                    <div className="absolute top-2 left-2 text-xs font-bold text-blue-600">{i + 1}</div>
                    {/* 즐겨찾기 별 버튼 (필기 합격자에는 북마크 기능이 없으므로 비활성화) */}
                    <button 
                      className="absolute top-2 right-2 text-xl"
                      disabled
                    >
                      <FaRegStar className="text-gray-300" />
                    </button>
                    {/* 프로필 이미지 */}
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                      <i className="fa-solid fa-user text-white text-xl" />
                    </div>
                    {/* 중앙 텍스트 정보 */}
                    <div className="flex flex-col flex-grow">
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                        {/* 필기 합격자라 지원일 정보 없음 */}
                      </div>
                      <div className="text-lg font-semibold text-gray-800 dark:text-white">
                        {applicant.user_name}
                      </div>
                    </div>
                    {/* 점수 원 */}
                    <div className="w-16 h-16 border-2 border-blue-300 rounded-full flex items-center justify-center text-sm font-bold text-gray-800 dark:text-white">
                      {applicant.written_test_score || 0}점
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
                <WrittenTestPassDetail
                  applicant={selectedApplicant}
                  feedbacks={selectedFeedbacks}
                  onBack={handleBackToList}
                  onShowAnswers={() => setShowAnswerModal(true)}
                />
              </div>
            )}
          </div>
        </div>
        {/* Floating Action Buttons */}
        <div className="fixed bottom-4 right-16 flex flex-row gap-4 z-[9999]">
          <button 
            className="w-14 h-14 flex items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition text-2xl"
            onClick={handleEmailClick}
            disabled={selectedApplicants.length === 0}
            style={{ zIndex: 9999 }}
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
      {/* 지원자 답안 상세 모달 */}
      <AnswerDetailModal open={showAnswerModal} onClose={() => setShowAnswerModal(false)} answers={selectedAnswers} />
    </Layout>
  );
} 