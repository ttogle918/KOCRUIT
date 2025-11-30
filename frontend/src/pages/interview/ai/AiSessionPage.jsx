import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaEye, FaUsers, FaUser
} from 'react-icons/fa';

import api from '../../../api/api';
import ViewPostSidebar from '../../../components/ViewPostSidebar';
import ApplicantCard, { getStatusInfo } from '../../../components/interview/ai/ApplicantCard';
import InterviewResultDetail from '../../../components/interview/ai/InterviewResultDetail';
import QuestionVideoAnalysisModal from '../../../components/common/QuestionVideoAnalysisModal';
import DetailedWhisperAnalysis from '../../../components/common/DetailedWhisperAnalysis';

const AiSessionPage = () => {
  const { jobPostId } = useParams();
  const navigate = useNavigate();
  
  // 상태 관리
  const [applicantsList, setApplicantsList] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // AI 면접 전용 상태 변수들 (면접 진행 관리 제거)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedApplicantForCancel, setSelectedApplicantForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showQuestionAnalysisModal, setShowQuestionAnalysisModal] = useState(false);
  const [showDetailedWhisperAnalysis, setShowDetailedWhisperAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [reAnalysisTarget, setReAnalysisTarget] = useState(null);
  const [isClosingPracticalInterview, setIsClosingPracticalInterview] = useState(false);
  const [isCompletingStage, setIsCompletingStage] = useState(false);

  // 성능 최적화: 지원자 선택 핸들러를 useCallback으로 최적화
  const handleApplicantSelect = useCallback((applicant) => {
    setSelectedApplicant(applicant);
  }, []);

  // 성능 최적화: 뒤로가기 핸들러를 useCallback으로 최적화
  const handleBackToList = useCallback(() => {
    setSelectedApplicant(null);
  }, []);

  // 현재 면접 단계와 다음 단계 정보 계산
  const getCurrentStageInfo = useMemo(() => {
    if (!applicantsList.length) return null;
    
    // 현재 단계별 지원자 수 계산
    const stageCounts = {
      first_completed: 0,
      first_passed: 0,
      second_completed: 0,
      second_passed: 0,
      final_completed: 0,
      final_passed: 0
    };
    
    applicantsList.forEach(applicant => {
      const status = applicant.interview_status;
      if (status === 'PRACTICAL_INTERVIEW_COMPLETED') stageCounts.first_completed++;
      if (status === 'PRACTICAL_INTERVIEW_PASSED') stageCounts.first_passed++;
      if (status === 'EXECUTIVE_INTERVIEW_COMPLETED') stageCounts.second_completed++;
      if (status === 'EXECUTIVE_INTERVIEW_PASSED') stageCounts.second_passed++;
      if (status === 'FINAL_INTERVIEW_COMPLETED') stageCounts.final_completed++;
      if (status === 'FINAL_INTERVIEW_PASSED') stageCounts.final_passed++;
    });
    
    // 현재 단계와 다음 단계 결정
    if (stageCounts.first_completed > 0) {
      return {
        currentStage: '1차 면접 완료',
        nextStage: '1차 면접 합격/불합격 결정',
        action: 'complete_first_stage',
        count: stageCounts.first_completed
      };
    } else if (stageCounts.first_passed > 0 && stageCounts.second_completed === 0) {
      return {
        currentStage: '1차 면접 합격',
        nextStage: '2차 면접 진행',
        action: 'start_second_stage',
        count: stageCounts.first_passed
      };
    } else if (stageCounts.second_completed > 0) {
      return {
        currentStage: '2차 면접 완료',
        nextStage: '2차 면접 합격/불합격 결정',
        action: 'complete_second_stage',
        count: stageCounts.second_completed
      };
    } else if (stageCounts.second_passed > 0 && stageCounts.final_completed === 0) {
      return {
        currentStage: '2차 면접 합격',
        nextStage: '최종 면접 진행',
        action: 'start_final_stage',
        count: stageCounts.second_passed
      };
    } else if (stageCounts.final_completed > 0) {
      return {
        currentStage: '최종 면접 완료',
        nextStage: '최종 합격자 결정',
        action: 'complete_final_stage',
        count: stageCounts.final_completed
      };
    } else if (stageCounts.final_passed > 0) {
      return {
        currentStage: '최종 면접 합격',
        nextStage: '최종 합격자 확정',
        action: 'finalize_selection',
        count: stageCounts.final_passed
      };
    }
    
    return null;
  }, [applicantsList]);

    // AI 면접 결과 확인 핸들러 (통합)
  const handleViewResults = useCallback((applicant) => {
    // AI 면접 결과를 현재 페이지에서 상세 보기로 표시
    setSelectedApplicant(applicant);
  }, []);

  // 합격 취소 핸들러
  const handleCancelPass = useCallback(async () => {
    if (!selectedApplicantForCancel) return;
    
    try {
      const response = await api.put(`/schedules/${selectedApplicantForCancel.application_id}/interview-status-with-history`, {
        interview_status: selectedApplicantForCancel.interview_status.replace('PASSED', 'FAILED'),
        reason: cancelReason || '합격 취소'
      });
      
      if (response.data.success) {
        alert('합격이 취소되었습니다.');
        setShowCancelModal(false);
        setSelectedApplicantForCancel(null);
        setCancelReason('');
        window.location.reload();
      }
    } catch (error) {
      console.error('합격 취소 오류:', error);
      alert('합격 취소 중 오류가 발생했습니다.');
    }
  }, [selectedApplicantForCancel, cancelReason]);

  // 합격 취소 모달 열기
  const openCancelModal = useCallback((applicant) => {
    setSelectedApplicantForCancel(applicant);
    setShowCancelModal(true);
  }, []);
  
  // 지원자 목록 로드
  useEffect(() => {
    const fetchApplicantsList = async () => {
      if (!jobPostId) return;
      
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      
      try {
        // 1. 캐시 확인
        const cache = JSON.parse(localStorage.getItem('applicantsCache') || '{}');
        if (cache.applicantsCache && cache.applicantsCache[jobPostId]) {
          const cachedApplicants = cache.applicantsCache[jobPostId];
          
          // 캐시된 데이터에도 필터링 적용 (AI 면접 PASSED, FAILED, 그리고 실무진/임원진 면접 단계 지원자 모두 표시)
          const filteredCachedApplicants = cachedApplicants.filter(applicant => {
            const aiStatus = applicant.ai_interview_status;
            const interviewStatus = applicant.interview_status;
            
            // AI 면접 PASSED, FAILED인 지원자 모두 포함
            if (aiStatus === 'PASSED' || aiStatus === 'FAILED') {
              return true;
            }
            
            // 실무진/임원진 면접 단계에 있는 지원자도 포함
            if (interviewStatus && (
              interviewStatus.startsWith('PRACTICAL_INTERVIEW_') || 
              interviewStatus.startsWith('EXECUTIVE_INTERVIEW_') || 
              interviewStatus.startsWith('FINAL_INTERVIEW_')
            )) {
              return true;
            }
            
            return false;
          });
          
          setApplicantsList(filteredCachedApplicants);
          setLoadingProgress(100);
          setIsInitialLoad(false);
          console.log('✅ AI 면접 결과 목록 캐시에서 로드 (AI/실무진/임원진 면접):', filteredCachedApplicants.length, '명');
        } else {
          // 2. 지원자 목록 로드
          setLoadingProgress(60);
          console.log('🔍 API 호출 시작:', `/applications/job/${jobPostId}/applicants-with-ai-interview`);
          const applicantsRes = await api.get(`/applications/job/${jobPostId}/applicants-with-ai-interview`);
          console.log('✅ API 응답:', applicantsRes.data);
          const applicants = applicantsRes.data || [];
          
          // 지원자 데이터 매핑 개선
          const mappedApplicants = applicants.map(applicant => ({
            ...applicant,
            application_id: applicant.application_id,
            applicant_id: applicant.applicant_id,
            name: applicant.name || '',
            email: applicant.email || '',
            interview_status: applicant.interview_status,
            applied_at: applicant.applied_at,
            ai_interview_score: applicant.ai_interview_score,
            resume_id: applicant.resume_id || null,
            // 디버깅을 위한 로그
            debug_info: {
              original_resume_id: applicant.resume_id,
              mapped_resume_id: applicant.resume_id || null
            }
          }));
          
          console.log('🔍 매핑된 지원자 데이터:', mappedApplicants.map(app => ({
            id: app.application_id,
            name: app.name,
            resume_id: app.resume_id,
            debug_info: app.debug_info
          })));
          
          // AI 면접 상태에 따라 필터링 (AI 면접 PASSED, FAILED, 그리고 실무진/임원진 면접 단계 지원자 모두 표시)
          const filteredApplicants = mappedApplicants.filter(applicant => {
            const aiStatus = applicant.ai_interview_status;
            const interviewStatus = applicant.interview_status;
            
            // AI 면접 PASSED, FAILED인 지원자 모두 포함
            if (aiStatus === 'PASSED' || aiStatus === 'FAILED') {
              return true;
            }
            
            // 실무진/임원진 면접 단계에 있는 지원자도 포함
            if (interviewStatus && (
              interviewStatus.startsWith('AI_INTERVIEW_INTERVIEW_') || 
              interviewStatus.startsWith('PRACTICAL_INTERVIEW_') || 
              interviewStatus.startsWith('EXECUTIVE_INTERVIEW_') || 
              interviewStatus.startsWith('FINAL_INTERVIEW_')
            )) {
              return true;
            }
            
            return false;
          });
          
          // 점수 기준 내림차순 정렬
          const sortedApplicants = filteredApplicants.sort((a, b) => {
            const scoreA = a.ai_interview_score || 0;
            const scoreB = b.ai_interview_score || 0;
            return scoreB - scoreA;
          });
          
          setApplicantsList(sortedApplicants);
          setLoadingProgress(100);
          setIsInitialLoad(false);
          
          // 캐시에 저장
          const updatedCache = {
            ...cache,
            applicantsCache: {
              ...cache.applicantsCache,
              [jobPostId]: sortedApplicants
            }
          };
          localStorage.setItem('applicantsCache', JSON.stringify(updatedCache));
          
          console.log('✅ AI 면접 결과 목록 로드 완료 (AI/실무진/임원진 면접):', sortedApplicants.length, '명');
        }
      } catch (error) {
        console.error('지원자 목록 로드 오류:', error);
        if (error.response) {
          console.error('API 응답 오류:', error.response.data);
          setError(`API 오류: ${error.response.data.detail || error.response.data.message || '지원자 목록을 불러오는 중 오류가 발생했습니다.'}`);
        } else if (error.request) {
          console.error('네트워크 오류:', error.request);
          setError('네트워크 연결을 확인해주세요.');
        } else {
          setError('지원자 목록을 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchApplicantsList();
  }, [jobPostId]);

  // 재분석 핸들러
  const handleReAnalyze = useCallback(async (applicant) => {
    try {
      setIsReAnalyzing(true);
      setReAnalysisTarget(applicant.application_id);
      
      // 재분석 API 호출 (타임아웃 5분으로 증가)
      const response = await api.post(`/whisper-analysis/process-qa/${applicant.application_id}`, {
        run_emotion_context: true,
        delete_video_after: true
      }, {
        timeout: 300000 // 5분 (300초)
      });
      
      if (response.data.success) {
        alert(`${applicant.name} 지원자의 재분석이 시작되었습니다.\n\n분석이 완료될 때까지 기다려주세요.\n(예상 소요시간: 3-5분)`);
        // 목록 새로고침
        window.location.reload();
      } else {
        alert('재분석 시작에 실패했습니다.');
      }
    } catch (error) {
      console.error('재분석 오류:', error);
      alert('재분석 중 오류가 발생했습니다.');
    } finally {
      setIsReAnalyzing(false);
      setReAnalysisTarget(null);
    }
  }, []);

  // 실무진 면접 마감 핸들러
  const handleClosePracticalInterview = useCallback(async () => {
    try {
      setIsClosingPracticalInterview(true);
      
      // 실무진 면접 마감 API 호출 (구현 예정)
      alert('실무진 면접 마감 기능은 구현 예정입니다.');
      
    } catch (error) {
      console.error('실무진 면접 마감 오류:', error);
      alert('실무진 면접 마감 중 오류가 발생했습니다.');
    } finally {
      setIsClosingPracticalInterview(false);
    }
  }, []);

  // 단계 마무리 완료 핸들러
  const handleCompleteStage = useCallback(async () => {
    try {
      setIsCompletingStage(true);
      
      // 단계 마무리 API 호출 (구현 예정)
      alert('단계 마무리 기능은 구현 예정입니다.');
      
    } catch (error) {
      console.error('단계 마무리 오류:', error);
      alert('단계 마무리 중 오류가 발생했습니다.');
    } finally {
      setIsCompletingStage(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">지원자 목록을 불러오는 중...</p>
                <div className="w-64 bg-gray-200 rounded-full h-2 mt-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <p className="text-red-600 text-lg mb-2">오류가 발생했습니다</p>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ViewPostSidebar 추가 */}
      <ViewPostSidebar jobPost={jobPostId ? { id: jobPostId } : null} />
      
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI 면접 시스템</h1>
              <p className="text-gray-600 mt-1">채용 공고 ID: {jobPostId}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">AI 면접 대상</p>
                <p className="text-2xl font-bold text-purple-600">{applicantsList.length}명</p>
              </div>
              <button
                onClick={() => navigate(`/interview-management/${jobPostId}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                title="전체 면접 관리 시스템으로 이동"
              >
                <FaUsers className="w-4 h-4" />
                전체 면접 관리
              </button>
              <button
                onClick={() => navigate(`/ai-interview-demo/${jobPostId}/demo`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                title="AI 면접 시스템 데모 보기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                AI 면접 데모
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                돌아가기
              </button>
            </div>
          </div>
          
          {/* 실무진 면접 합격/불합격 통계 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const stats = {
                passed: 0,
                failed: 0,
                pending: 0
              };
              
              applicantsList.forEach(applicant => {
                // AI 면접 상태에 따라 통계 계산
                if (applicant.ai_interview_status === 'PASSED') {
                  stats.passed++;
                } else if (applicant.ai_interview_status === 'FAILED') {
                  stats.failed++;
                } else {
                  stats.pending++;
                }
              });
              
              return (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-green-600">AI 면접 합격</p>
                        <p className="text-2xl font-bold text-green-700">{stats.passed}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-red-600">AI 면접 불합격</p>
                        <p className="text-2xl font-bold text-red-700">{stats.failed}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-gray-600">평가 대기중</p>
                        <p className="text-2xl font-bold text-gray-700">{stats.pending}명</p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Application 상태 통계 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            {(() => {
              const appStats = {
                inProgress: 0,
                passed: 0,
                failed: 0,
                selected: 0
              };
              
              applicantsList.forEach(applicant => {
                if (applicant.final_status === 'SELECTED') appStats.selected++;
                else if (applicant.document_status === 'PASSED') {
                  if (applicant.interview_status && applicant.interview_status.includes('FAILED')) {
                    appStats.failed++;
                  } else {
                    appStats.passed++;
                  }
                } else {
                  appStats.inProgress++;
                }
              });
              
              return (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-blue-600">진행중</p>
                        <p className="text-2xl font-bold text-blue-700">{appStats.inProgress}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-green-600">합격</p>
                        <p className="text-2xl font-bold text-green-700">{appStats.passed}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-red-600">불합격</p>
                        <p className="text-2xl font-bold text-red-700">{appStats.failed}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-purple-600">최종 선발</p>
                        <p className="text-2xl font-bold text-purple-700">{appStats.selected}명</p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* 실무진 면접 마감 버튼 */}
          {(() => {
            const practicalInterviewApplicants = applicantsList.filter(applicant => {
              const status = applicant.interview_status;
              return status === 'PRACTICAL_INTERVIEW_IN_PROGRESS' || 
                     status === 'PRACTICAL_INTERVIEW_COMPLETED' || 
                     status === 'PRACTICAL_INTERVIEW_PASSED' || 
                     status === 'PRACTICAL_INTERVIEW_FAILED';
            });
            
            if (practicalInterviewApplicants.length > 0) {
              return (
                <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">실무진 면접 마감</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        실무진 면접 단계를 한번에 마감하고 다음 단계로 진행합니다. ({practicalInterviewApplicants.length}명)
                      </p>
                      <p className="text-xs text-orange-600 mt-2">
                        ⚠️ 진행중인 면접은 완료로, 완료된 면접은 합격으로 처리됩니다.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        💡 이 버튼을 클릭하면 실무진 면접 단계를 건너뛰고 다음 단계로 진행할 수 있습니다.
                      </p>
                    </div>
                    <button
                      onClick={handleClosePracticalInterview}
                      disabled={isClosingPracticalInterview}
                      className={`px-6 py-3 text-white rounded-lg font-medium transition-colors ${
                        isClosingPracticalInterview
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                      }`}
                    >
                      {isClosingPracticalInterview ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          마감중...
                        </div>
                      ) : (
                        '실무진 면접 마감'
                      )}
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* 단계 마무리 완료 버튼 */}
          {getCurrentStageInfo && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">현재 단계: {getCurrentStageInfo.currentStage}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    다음 단계: {getCurrentStageInfo.nextStage} ({getCurrentStageInfo.count}명)
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 이 버튼을 클릭하면 현재 단계를 마무리하고 다음 단계로 진행합니다.
                  </p>
                </div>
                <button
                  onClick={handleCompleteStage}
                  disabled={isCompletingStage}
                  className={`px-6 py-3 text-white rounded-lg font-medium transition-colors ${
                    isCompletingStage
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {isCompletingStage ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      처리중...
                    </div>
                  ) : (
                    '단계 마무리 완료'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 메인 콘텐츠 */}
        {selectedApplicant ? (
          <InterviewResultDetail 
            applicant={selectedApplicant} 
            onBack={handleBackToList}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">AI 면접 결과 목록</h2>
              <p className="text-gray-600">AI 면접 합격자, 불합격자, 그리고 실무진/임원진 면접 단계에 있는 지원자들의 결과를 확인할 수 있습니다.</p>
            </div>

            {applicantsList.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500 text-lg mb-2">AI 면접 결과가 없습니다</p>
                <p className="text-gray-400 text-sm">AI 면접 합격자, 불합격자, 또는 실무진/임원진 면접 단계에 있는 지원자가 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applicantsList.map((applicant) => (
                  <ApplicantCard 
                    key={applicant.application_id}
                    applicant={applicant}
                    isSelected={false}
                    onClick={handleApplicantSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 합격 취소 모달 */}
      {showCancelModal && selectedApplicantForCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              합격 취소 확인
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>{selectedApplicantForCancel.name}</strong>님의 합격을 취소하시겠습니까?
              </p>
              <p className="text-xs text-gray-500">
                현재 상태: {getStatusInfo(selectedApplicantForCancel.interview_status).label}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                취소 사유 (선택사항)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="합격 취소 사유를 입력하세요..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedApplicantForCancel(null);
                  setCancelReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCancelPass}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                합격 취소
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 질문별 분석 버튼 추가 */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowQuestionAnalysisModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
        >
          질문별 분석 결과
        </button>
        {/* ... existing buttons ... */}
      </div>

      {/* 질문별 분석 모달 */}
      <QuestionVideoAnalysisModal
        isOpen={showQuestionAnalysisModal}
        onClose={() => setShowQuestionAnalysisModal(false)}
        applicationId={selectedApplicant?.application_id}
      />
      
      {/* 상세 Whisper 분석 모달 */}
      {showDetailedWhisperAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  상세 Whisper 분석 결과
                </h3>
                <button
                  onClick={() => setShowDetailedWhisperAnalysis(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <DetailedWhisperAnalysis applicationId={selectedApplicant?.application_id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiSessionPage;