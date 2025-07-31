import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiUsers, FiClock, FiCheckCircle, FiStar, FiSearch, FiEye } from 'react-icons/fi';
import api from '../api/api';
import ApplicantInfoModal from './ApplicantInfoModal';

const ExecutiveInterviewModal = ({ isOpen, onClose, jobPostId, jobPost }) => {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showApplicantInfo, setShowApplicantInfo] = useState(false);
  const [selectedApplicantForInfo, setSelectedApplicantForInfo] = useState(null);

  useEffect(() => {
    if (isOpen && jobPostId) {
      fetchApplicants();
    }
  }, [isOpen, jobPostId]);

  // 1단계: 기본 지원자 목록 우선 로딩
  const fetchBasicApplicants = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 임원진 면접 모달 기본 데이터 로딩 시작');
      
      // 기본 지원자 목록 로드 (빠른 로딩)
      const endpoint = `/applications/job/${jobPostId}/applicants-with-second-interview`;
      const res = await api.get(endpoint);
      
      // 기본 정보만 포함한 지원자 목록 (매핑 개선)
      const basicApplicants = (res.data || []).map(app => ({
        // 기본 식별자
        application_id: app.id,
        applicant_id: app.user_id,
        id: app.id, // 호환성 유지
        
        // 사용자 정보
        name: app.user?.name || app.name || '',
        email: app.user?.email || app.email || '',
        phone: app.user?.phone || app.phone || '',
        
        // 지원 정보
        interview_status: app.interview_status,
        final_status: app.final_status,
        applied_at: app.applied_at || app.created_at,
        created_at: app.created_at,
        
        // 점수 정보
        ai_interview_score: app.ai_interview_score,
        practical_score: app.practical_score || null,
        executive_score: app.executive_score || null,
        
        // 이력서 정보
        resume_id: app.resume_id,
        resume: app.resume || null,
        
        // 상세 정보는 나중에 로드
        evaluation_details: null,
        practical_evaluation: null,
        executive_evaluation: null
      }));
      
      setApplicants(basicApplicants);
      console.log('✅ 기본 지원자 목록 로드 완료:', basicApplicants.length, '명');
      
      // 2단계: 백그라운드에서 상세 데이터 로드
      setTimeout(() => {
        console.log('🔄 백그라운드에서 상세 데이터 로드 시작');
        fetchDetailedApplicantData(basicApplicants);
      }, 100);
      
    } catch (err) {
      setError('지원자 목록을 불러오지 못했습니다.');
      console.error('Error fetching basic applicants:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 백그라운드에서 상세 데이터 로드
  const fetchDetailedApplicantData = async (basicApplicants) => {
    try {
      console.log('🔄 상세 데이터 백그라운드 로딩 시작');
      
      // 각 지원자별로 상세 정보 로드 (병렬 처리)
      const detailedApplicants = await Promise.all(
        basicApplicants.map(async (app) => {
          try {
            // 지원자별 상세 정보 로드
            const detailRes = await api.get(`/executive-interview/candidate/${app.application_id}/details`);
            const detailData = detailRes.data;
            
            return {
              ...app,
              // 평가 점수 업데이트
              practical_score: detailData.practical_evaluation?.total_score || app.practical_score,
              executive_score: detailData.executive_evaluation?.total_score || app.executive_score,
              
              // 상세 평가 정보
              practical_evaluation: detailData.practical_evaluation,
              executive_evaluation: detailData.executive_evaluation,
              
              // 이력서 정보 업데이트
              resume: detailData.resume,
              resume_id: detailData.resume?.id || app.resume_id,
              
              // 사용자 정보 업데이트
              name: detailData.user?.name || app.name,
              email: detailData.user?.email || app.email,
              phone: detailData.user?.phone || app.phone,
              
              // 평가 상세 정보
              evaluation_details: {
                practical: detailData.practical_evaluation,
                executive: detailData.executive_evaluation
              }
            };
          } catch (error) {
            console.error(`지원자 ${app.application_id} 상세 정보 로드 실패:`, error);
            return app; // 실패 시 기본 정보 유지
          }
        })
      );
      
      setApplicants(detailedApplicants);
      console.log('✅ 상세 데이터 로드 완료');
      
    } catch (error) {
      console.error('상세 데이터 로드 실패:', error);
      // 상세 데이터 로드 실패해도 기본 목록은 유지
    }
  };

  // 기존 fetchApplicants 함수 (호환성 유지)
  const fetchApplicants = async () => {
    await fetchBasicApplicants();
  };

  // 면접 상태별 라벨 반환 함수
  const getInterviewStatusLabel = (status, finalStatus) => {
    if (!status) {
      return {
        label: '미진행',
        color: 'text-gray-500 bg-gray-100'
      };
    }
    
    // final_status가 SELECTED면 최종 선발, NOT_SELECTED면 임원진 면접에서 떨어진 것
    if (finalStatus === 'SELECTED') {
      return {
        label: '최종 선발',
        color: 'text-green-700 bg-green-200'
      };
    } else if (finalStatus === 'NOT_SELECTED') {
      return {
        label: '임원진 면접 불합격',
        color: 'text-red-600 bg-red-100'
      };
    }
    
    const statusLabels = {
      'SECOND_INTERVIEW_SCHEDULED': { label: '2차 일정 확정', color: 'text-purple-600 bg-purple-100' },
      'SECOND_INTERVIEW_IN_PROGRESS': { label: '2차 진행중', color: 'text-yellow-600 bg-yellow-100' },
      'SECOND_INTERVIEW_COMPLETED': { label: '2차 완료', color: 'text-green-600 bg-green-100' },
      'SECOND_INTERVIEW_PASSED': { label: '2차 합격', color: 'text-green-700 bg-green-200' },
      'SECOND_INTERVIEW_FAILED': { label: '2차 불합격', color: 'text-red-600 bg-red-100' },
      'CANCELLED': { label: '취소', color: 'text-gray-500 bg-gray-100' }
    };
    
    let finalLabel = statusLabels[status]?.label || '알 수 없음';
    let finalColor = statusLabels[status]?.color || 'text-gray-500 bg-gray-100';
    
    if (status === 'SECOND_INTERVIEW_PENDING') {
      finalLabel = '미진행';
      finalColor = 'text-gray-500 bg-gray-100';
    } else if (status === 'SECOND_INTERVIEW_FAILED') {
      finalLabel = '불합격';
      finalColor = 'text-red-600 bg-red-100';
    } else if (status === 'SECOND_INTERVIEW_PASSED') {
      finalLabel = '합격';
      finalColor = 'text-green-700 bg-green-200';
    }
    
    return { label: finalLabel, color: finalColor };
  };

  // 필터링된 지원자 목록
  const filteredApplicants = applicants.filter(applicant => {
    const matchesSearch = applicant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         applicant.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'pending' && (!applicant.interview_status || applicant.interview_status === 'SECOND_INTERVIEW_PENDING')) ||
                         (filterStatus === 'in_progress' && applicant.interview_status?.includes('IN_PROGRESS')) ||
                         (filterStatus === 'completed' && applicant.interview_status?.includes('COMPLETED')) ||
                         (filterStatus === 'passed' && applicant.interview_status?.includes('PASSED')) ||
                         (filterStatus === 'failed' && applicant.interview_status?.includes('FAILED'));
    
    return matchesSearch && matchesStatus;
  });

  // 지원자 선택 핸들러
  const handleApplicantSelect = (applicant) => {
    navigate(`/interview-progress/${jobPostId}/second/${applicant.applicant_id || applicant.id}`);
    onClose();
  };

  // 지원자 정보 확인 핸들러
  const handleApplicantInfoClick = (e, applicant) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    setSelectedApplicantForInfo(applicant);
    setShowApplicantInfo(true);
  };

  // 통계 계산
  const totalApplicants = applicants.length;
  const pendingApplicants = applicants.filter(a => !a.interview_status || a.interview_status === 'SECOND_INTERVIEW_PENDING').length;
  const inProgressApplicants = applicants.filter(a => a.interview_status?.includes('IN_PROGRESS')).length;
  const completedApplicants = applicants.filter(a => a.interview_status?.includes('COMPLETED')).length;
  const passedApplicants = applicants.filter(a => a.interview_status?.includes('PASSED')).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-purple-50 dark:bg-purple-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                2차 임원진 면접
              </h2>
              <p className="text-purple-700 dark:text-purple-300 mt-1">
                {jobPost?.title || '채용공고'} - 면접 대상자 선택
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800 text-purple-600 dark:text-purple-400"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <FiUsers className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">총 대상자</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalApplicants}명</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <FiClock className="text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">대기</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{pendingApplicants}명</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <FiClock className="text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">진행중</span>
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{inProgressApplicants}명</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">완료</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{completedApplicants}명</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <FiStar className="text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">합격</span>
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{passedApplicants}명</p>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 검색 */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="지원자 이름 또는 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            
            {/* 상태 필터 */}
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="all">전체</option>
                <option value="pending">대기</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료</option>
                <option value="passed">합격</option>
                <option value="failed">불합격</option>
              </select>
            </div>
          </div>
        </div>

        {/* 지원자 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchApplicants}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                다시 시도
              </button>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="text-center py-8">
              <FiUsers className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filterStatus !== 'all' ? '검색 결과가 없습니다.' : '면접 대상자가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApplicants.map((applicant, index) => {
                const statusInfo = getInterviewStatusLabel(applicant.interview_status, applicant.final_status);
                
                return (
                  <div
                    key={applicant.applicant_id || applicant.id}
                    onClick={() => handleApplicantSelect(applicant)}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            {applicant.name}
                          </h3>
                          <button
                            onClick={(e) => handleApplicantInfoClick(e, applicant)}
                            className="p-1 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 transition-colors"
                            title="지원자 상세 정보 보기"
                          >
                            <FiEye size={16} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {applicant.email}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">지원일:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {applicant.applied_at ? 
                            new Date(applicant.applied_at).toLocaleDateString('ko-KR') : 
                            '날짜 정보 없음'
                          }
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">면접일:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {applicant.schedule_date ? 
                            new Date(applicant.schedule_date).toLocaleDateString('ko-KR') : 
                            '미정'
                          }
                        </span>
                      </div>
                      
                      {applicant.ai_interview_score && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">AI 면접 점수:</span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {applicant.ai_interview_score}점
                          </span>
                        </div>
                      )}
                      
                      {applicant.practical_score && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">실무진 점수:</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {applicant.practical_score}점
                          </span>
                        </div>
                      )}
                      
                      {applicant.executive_score && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">임원진 점수:</span>
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            {applicant.executive_score}점
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-600">
                      <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        면접 시작
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              총 {filteredApplicants.length}명의 지원자가 표시됩니다
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* 지원자 상세 정보 모달 */}
      <ApplicantInfoModal
        isOpen={showApplicantInfo}
        onClose={() => setShowApplicantInfo(false)}
        applicant={selectedApplicantForInfo}
        jobPostId={jobPostId}
      />
    </div>
  );
};

export default ExecutiveInterviewModal; 