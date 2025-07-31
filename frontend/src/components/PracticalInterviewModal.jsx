import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiUsers, FiClock, FiCheckCircle, FiStar, FiSearch, FiEye } from 'react-icons/fi';
import api from '../api/api';
import ApplicantInfoModal from './ApplicantInfoModal';

const PracticalInterviewModal = ({ isOpen, onClose, jobPostId, jobPost }) => {
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

  const fetchApplicants = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 실무진 면접 대상자 조회 시작 - 공고 ID:', jobPostId);
      
      // 먼저 디버깅 정보 확인
      try {
        const debugRes = await api.get(`/applications/job/${jobPostId}/debug`);
        console.log('🔍 디버깅 정보:', debugRes.data);
        
        if (!debugRes.data.job_post_exists) {
          setError(`공고 ${jobPostId}번을 찾을 수 없습니다.`);
          setApplicants([]);
          return;
        }
        
        if (debugRes.data.target_applicants === 0) {
          setError('해당 공고의 면접 대상자가 없습니다. (AI 면접 합격자 또는 1차 면접 일정 확정자만 표시됩니다)');
          setApplicants([]);
          return;
        }
        
        console.log(`📊 면접 대상자 수: ${debugRes.data.target_applicants}명`);
        
      } catch (debugErr) {
        console.warn('디버깅 정보 조회 실패:', debugErr);
      }
      
      // 면접 대상자 조회 (AI_INTERVIEW_PASSED 또는 FIRST_INTERVIEW_SCHEDULED 상태인 지원자들)
      const interviewEndpoint = `/applications/job/${jobPostId}/applicants-with-interview`;
      const interviewRes = await api.get(interviewEndpoint);
      
      console.log('✅ 면접 대상자 조회 완료:', interviewRes.data?.length || 0, '명');
      setApplicants(interviewRes.data || []);
      
      // 면접 대상자가 없는 경우
      if (!interviewRes.data || interviewRes.data.length === 0) {
        setError('해당 공고의 면접 대상자가 없습니다. (AI 면접 합격자 또는 1차 면접 일정 확정자만 표시됩니다)');
        setApplicants([]);
        return;
      }
      
    } catch (err) {
      console.error('❌ 면접 대상자 조회 실패:', err);
      
      if (err.response?.status === 404) {
        setError('해당 공고를 찾을 수 없습니다. 공고 번호를 확인해주세요.');
      } else if (err.response?.status === 403) {
        setError('접근 권한이 없습니다.');
      } else if (err.response?.status === 500) {
        setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError('면접 대상자 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  // 면접 상태별 라벨 반환 함수
  const getInterviewStatusLabel = (status) => {
    if (!status) {
      return {
        label: '미진행',
        color: 'text-gray-500 bg-gray-100'
      };
    }
    
    // Second_Interview_ 접두사 처리 (실무진 면접 통과자)
    if (status.startsWith('Second_Interview_')) {
      const secondInterviewStatus = status.replace('Second_Interview_', '');
      const statusLabels = {
        'SCHEDULED': { label: '2차 일정 확정', color: 'text-purple-600 bg-purple-100' },
        'IN_PROGRESS': { label: '2차 진행중', color: 'text-yellow-600 bg-yellow-100' },
        'COMPLETED': { label: '2차 완료', color: 'text-green-600 bg-green-100' },
        'PASSED': { label: '2차 합격', color: 'text-green-700 bg-green-200' },
        'FAILED': { label: '2차 불합격', color: 'text-red-600 bg-red-100' }
      };
      return statusLabels[secondInterviewStatus] || { label: '2차 면접', color: 'text-blue-600 bg-blue-100' };
    }
    
    const statusLabels = {
      'FIRST_INTERVIEW_SCHEDULED': { label: '1차 일정 확정', color: 'text-blue-600 bg-blue-100' },
      'FIRST_INTERVIEW_IN_PROGRESS': { label: '1차 진행중', color: 'text-yellow-600 bg-yellow-100' },
      'FIRST_INTERVIEW_COMPLETED': { label: '1차 완료', color: 'text-green-600 bg-green-100' },
      'FIRST_INTERVIEW_PASSED': { label: '1차 합격', color: 'text-green-700 bg-green-200' },
      'FIRST_INTERVIEW_FAILED': { label: '1차 불합격', color: 'text-red-600 bg-red-100' },
      'CANCELLED': { label: '취소', color: 'text-gray-500 bg-gray-100' }
    };
    
    let finalLabel = statusLabels[status]?.label || '알 수 없음';
    let finalColor = statusLabels[status]?.color || 'text-gray-500 bg-gray-100';
    
    if (status === 'FIRST_INTERVIEW_PENDING') {
      finalLabel = '미진행';
      finalColor = 'text-gray-500 bg-gray-100';
    } else if (status === 'FIRST_INTERVIEW_FAILED') {
      finalLabel = '불합격';
      finalColor = 'text-red-600 bg-red-100';
    } else if (status === 'FIRST_INTERVIEW_PASSED') {
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
                         (filterStatus === 'pending' && (!applicant.interview_status || applicant.interview_status === 'Second_Interview_PENDING')) ||
                         (filterStatus === 'in_progress' && applicant.interview_status?.includes('IN_PROGRESS')) ||
                         (filterStatus === 'completed' && applicant.interview_status?.includes('COMPLETED')) ||
                         (filterStatus === 'passed' && applicant.interview_status?.includes('PASSED')) ||
                         (filterStatus === 'failed' && applicant.interview_status?.includes('FAILED'));
    
    return matchesSearch && matchesStatus;
  });

  // 지원자 선택 핸들러
  const handleApplicantSelect = (applicant) => {
    // 지원자 ID 결정 (여러 가능한 필드 확인)
    const applicantId = applicant.applicant_id || applicant.application_id || applicant.id;
    
    if (!applicantId) {
      console.error('지원자 ID를 찾을 수 없습니다:', applicant);
      alert('지원자 정보에 문제가 있습니다. 다시 시도해주세요.');
      return;
    }
    
    console.log('지원자 선택:', applicant.name, 'ID:', applicantId);
    
    // 면접 진행 페이지로 이동
    navigate(`/interview-progress/${jobPostId}/first/${applicantId}`);
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
  const pendingApplicants = applicants.filter(a => !a.interview_status || a.interview_status === 'Second_Interview_PENDING').length;
  const inProgressApplicants = applicants.filter(a => a.interview_status?.includes('IN_PROGRESS')).length;
  const completedApplicants = applicants.filter(a => a.interview_status?.includes('COMPLETED')).length;
  const passedApplicants = applicants.filter(a => a.interview_status?.includes('PASSED')).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                1차 실무진 면접
              </h2>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                {jobPost?.title || '채용공고'} - 면접 대상자 선택
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400"
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
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <FiClock className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">진행중</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{inProgressApplicants}명</p>
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            
            {/* 상태 필터 */}
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
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
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">지원자 목록을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-red-600 dark:text-red-400 text-lg mb-2">{error}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                잠시 후 다시 시도해주세요.
              </p>
              <button
                onClick={fetchApplicants}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="text-center py-8">
              <FiUsers className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                {searchTerm || filterStatus !== 'all' ? '검색 결과가 없습니다.' : '면접 대상자가 없습니다.'}
              </p>
              {searchTerm || filterStatus !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  필터 초기화
                </button>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  해당 공고에 지원자가 없거나 면접 대상자가 설정되지 않았습니다.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApplicants.map((applicant, index) => {
                const statusInfo = getInterviewStatusLabel(applicant.interview_status);
                
                return (
                  <div
                    key={applicant.applicant_id || applicant.id}
                    onClick={() => handleApplicantSelect(applicant)}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {applicant.name}
                          </h3>
                          <button
                            onClick={(e) => handleApplicantInfoClick(e, applicant)}
                            className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
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
                          {applicant.created_at ? 
                            new Date(applicant.created_at).toLocaleDateString('ko-KR') : 
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
                      
                      {applicant.first_interview_score && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">평가점수:</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {applicant.first_interview_score}점
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-600">
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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

export default PracticalInterviewModal; 