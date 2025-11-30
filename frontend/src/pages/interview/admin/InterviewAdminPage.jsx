import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaUsers, FaBrain, FaUserTie, FaCrown, FaCheckCircle, 
  FaTimesCircle, FaClock, FaChartBar, FaArrowLeft,
  FaFileAlt, FaDownload, FaEye, FaSearch, FaSync, FaExclamationTriangle
} from 'react-icons/fa';
import { 
  FiTarget, FiUser, FiTrendingUp, FiBarChart2
} from 'react-icons/fi';
import { 
  MdOutlineBusinessCenter, MdOutlineAssessment,
  MdOutlineAnalytics, MdOutlineDashboard
} from 'react-icons/md';

import api from '../../../api/api';

// 지원자 카드 컴포넌트 (전체 프로세스 통합)
const ApplicantProcessCard = ({ applicant, onViewDetails }) => {
  const getStageInfo = (status) => {
    if (status === 'AI_INTERVIEW_COMPLETED' || status === 'AI_INTERVIEW_PASSED') {
      return { stage: 'AI 면접', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <FaBrain /> };
    } else if (status === 'PRACTICAL_INTERVIEW_SCHEDULED' || status === 'PRACTICAL_INTERVIEW_IN_PROGRESS' || 
               status === 'PRACTICAL_INTERVIEW_COMPLETED' || status === 'PRACTICAL_INTERVIEW_PASSED' || 
               status === 'PRACTICAL_INTERVIEW_FAILED') {
      return { stage: '실무진 면접', color: 'text-green-600', bgColor: 'bg-green-100', icon: <MdOutlineBusinessCenter /> };
    } else if (status === 'EXECUTIVE_INTERVIEW_SCHEDULED' || status === 'EXECUTIVE_INTERVIEW_IN_PROGRESS' || 
               status === 'EXECUTIVE_INTERVIEW_COMPLETED' || status === 'EXECUTIVE_INTERVIEW_PASSED' || 
               status === 'EXECUTIVE_INTERVIEW_FAILED') {
      return { stage: '임원진 면접', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: <FaCrown /> };
    } else if (status === 'FINAL_INTERVIEW_SCHEDULED' || status === 'FINAL_INTERVIEW_IN_PROGRESS' || 
               status === 'FINAL_INTERVIEW_COMPLETED' || status === 'FINAL_INTERVIEW_PASSED' || 
               status === 'FINAL_INTERVIEW_FAILED') {
      return { stage: '최종 면접', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <FiTarget /> };
    } else {
      return { stage: '서류 전형', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <FaFileAlt /> };
    }
  };

  const getStatusColor = (status) => {
    if (status.includes('PASSED')) return 'text-green-600';
    if (status.includes('FAILED')) return 'text-red-600';
    if (status.includes('COMPLETED')) return 'text-blue-600';
    if (status.includes('IN_PROGRESS')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const stageInfo = getStageInfo(applicant.interview_status);

  return (
    <div className="p-4 border rounded-lg transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FiUser className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{applicant.name}</h3>
            <p className="text-sm text-gray-600">{applicant.email}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stageInfo.bgColor} ${stageInfo.color}`}>
            {stageInfo.icon} <span className="ml-1">{stageInfo.stage}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">AI점수: {applicant.ai_interview_score || 'N/A'}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">지원일:</span>
          <span className="font-medium">{new Date(applicant.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">현재 상태:</span>
          <span className={`font-medium ${getStatusColor(applicant.interview_status)}`}>
            {applicant.interview_status || '서류 검토중'}
          </span>
        </div>
      </div>
      
      <button
        onClick={() => onViewDetails(applicant)}
        className="mt-3 w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        <FaEye className="inline w-4 h-4 mr-2" />
        전체 프로세스 보기
      </button>
    </div>
  );
};

// 지원자 상세 프로세스 보기 컴포넌트
const ApplicantProcessDetail = ({ applicant, onBack }) => {
  const [processData, setProcessData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProcessData = async () => {
      try {
        // 지원자 전체 프로세스 데이터 로드
        const response = await api.get(`/applications/${applicant.application_id}/process-detail`);
        setProcessData(response.data);
      } catch (error) {
        console.error('프로세스 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProcessData();
  }, [applicant.application_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{applicant.name} - 전체 프로세스 추적</h2>
              <p className="text-sm text-gray-600">{applicant.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 프로세스 단계별 현황 */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">단계별 진행 현황</h3>
        
        <div className="space-y-4">
          {/* 서류 전형 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FaFileAlt className="text-gray-600" />
              <span className="font-medium">서류 전형</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaCheckCircle className="text-green-600" />
              <span className="text-green-600 font-medium">통과</span>
            </div>
          </div>

          {/* AI 면접 */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FaBrain className="text-blue-600" />
              <span className="font-medium">AI 면접</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaCheckCircle className="text-green-600" />
              <span className="text-green-600 font-medium">통과</span>
              <span className="text-sm text-gray-500">(점수: {applicant.ai_interview_score || 'N/A'})</span>
            </div>
          </div>

          {/* 실무진 면접 */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <MdOutlineBusinessCenter className="text-green-600" />
              <span className="font-medium">실무진 면접</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaCheckCircle className="text-green-600" />
              <span className="text-green-600 font-medium">합격</span>
            </div>
          </div>

          {/* 임원진 면접 */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FaCrown className="text-purple-600" />
              <span className="font-medium">임원진 면접</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaClock className="text-yellow-600" />
              <span className="text-yellow-600 font-medium">진행중</span>
            </div>
          </div>

          {/* 최종 선발 */}
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FiTarget className="text-orange-600" />
              <span className="font-medium">최종 선발</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaClock className="text-gray-600" />
              <span className="text-gray-600 font-medium">대기중</span>
            </div>
          </div>
        </div>

        {/* 각 단계별 상세 정보 */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">단계별 상세 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <FaBrain className="text-blue-600 text-2xl mx-auto mb-2" />
              <span className="font-medium">AI 면접 결과</span>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <MdOutlineBusinessCenter className="text-green-600 text-2xl mx-auto mb-2" />
              <span className="font-medium">실무진 면접 결과</span>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <FaCrown className="text-purple-600 text-2xl mx-auto mb-2" />
              <span className="font-medium">임원진 면접 결과</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 메인 면접 관리 시스템 컴포넌트
const InterviewAdminPage = () => {
  const { jobPostId } = useParams();
  const navigate = useNavigate();
  
  // 상태 관리
  const [applicantsList, setApplicantsList] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'applicants', 'statistics'
  const [isCompletingStage, setIsCompletingStage] = useState(false);
  const [isClosingPracticalInterview, setIsClosingPracticalInterview] = useState(false);

  // 필터링 및 상태 관리 변수들
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJobPosting, setFilterJobPosting] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterScore, setFilterScore] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchModalStep, setBatchModalStep] = useState(1);
  const [batchModalData, setBatchModalData] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [selectedRowApplicant, setSelectedRowApplicant] = useState(null);

  // 지원자 목록 로드
  useEffect(() => {
    const fetchApplicantsList = async () => {
      if (!jobPostId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.get(`/applications/job/${jobPostId}/applicants`);
        setApplicantsList(response.data || []);
      } catch (error) {
        console.error('지원자 목록 로드 오류:', error);
        setError('지원자 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplicantsList();
  }, [jobPostId]);

  // 통계 계산
  const statistics = useMemo(() => {
    if (!applicantsList.length) return {};

    const stats = {
      total: applicantsList.length,
      aiInterview: {
        total: 0,
        passed: 0,
        failed: 0,
        pending: 0
      },
      practical: {
        total: 0,
        passed: 0,
        failed: 0,
        inProgress: 0
      },
      executive: {
        total: 0,
        passed: 0,
        failed: 0,
        inProgress: 0
      },
      final: {
        total: 0,
        passed: 0,
        failed: 0,
        inProgress: 0
      }
    };

    applicantsList.forEach(applicant => {
      const status = applicant.interview_status;
      
      // AI 면접 통계
      if (status === 'AI_INTERVIEW_COMPLETED' || status === 'AI_INTERVIEW_PASSED' || status === 'AI_INTERVIEW_FAILED') {
        stats.aiInterview.total++;
        if (status === 'AI_INTERVIEW_PASSED') stats.aiInterview.passed++;
        else if (status === 'AI_INTERVIEW_FAILED') stats.aiInterview.failed++;
        else stats.aiInterview.pending++;
      }
      
      // 실무진 면접 통계
      if (status && status.startsWith('PRACTICAL_INTERVIEW_')) {
        stats.practical.total++;
        if (status === 'PRACTICAL_INTERVIEW_PASSED') stats.practical.passed++;
        else if (status === 'PRACTICAL_INTERVIEW_FAILED') stats.practical.failed++;
        else if (status === 'PRACTICAL_INTERVIEW_IN_PROGRESS') stats.practical.inProgress++;
      }
      
      // 임원진 면접 통계
      if (status && status.startsWith('EXECUTIVE_INTERVIEW_')) {
        stats.executive.total++;
        if (status === 'EXECUTIVE_INTERVIEW_PASSED') stats.executive.passed++;
        else if (status === 'EXECUTIVE_INTERVIEW_FAILED') stats.executive.failed++;
        else if (status === 'EXECUTIVE_INTERVIEW_IN_PROGRESS') stats.executive.inProgress++;
      }
      
      // 최종 면접 통계
      if (status && status.startsWith('FINAL_INTERVIEW_')) {
        stats.final.total++;
        if (status === 'FINAL_INTERVIEW_PASSED') stats.final.passed++;
        else if (status === 'FINAL_INTERVIEW_FAILED') stats.final.failed++;
        else if (status === 'FINAL_INTERVIEW_IN_PROGRESS') stats.final.inProgress++;
      }
    });

    return stats;
  }, [applicantsList]);

  // 필터링 및 정렬된 지원자 목록
  const filteredAndSortedApplicants = useMemo(() => {
    let filtered = [...applicantsList];

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(applicant =>
        applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 직무 공고 필터링
    if (filterJobPosting) {
      filtered = filtered.filter(applicant =>
        applicant.job_posting_title === filterJobPosting
      );
    }

    // 상태 필터링
    if (filterStatus) {
      filtered = filtered.filter(applicant =>
        applicant.interview_status === filterStatus
      );
    }

    // 점수 필터링
    if (filterScore) {
      const [min, max] = filterScore.split('-').map(Number);
      filtered = filtered.filter(applicant => {
        const score = applicant.ai_interview_score;
        if (!score) return false;
        return score >= min && score <= max;
      });
    }

    // 기간 필터링
    if (filterPeriod) {
      const now = new Date();
      const periodMap = {
        'today': 1,
        'week': 7,
        'month': 30,
        'quarter': 90
      };
      const days = periodMap[filterPeriod];
      filtered = filtered.filter(applicant => {
        const createdDate = new Date(applicant.created_at);
        const diffTime = Math.abs(now - createdDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days;
      });
    }

    // 정렬
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'score':
          aValue = a.ai_interview_score || 0;
          bValue = b.ai_interview_score || 0;
          break;
        case 'date':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'status':
          aValue = a.interview_status || '';
          bValue = b.interview_status || '';
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [applicantsList, searchTerm, filterJobPosting, filterStatus, filterScore, filterPeriod, sortBy, sortOrder]);

  // 페이지네이션된 지원자 목록
  const paginatedApplicants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedApplicants.slice(startIndex, endIndex);
  }, [filteredAndSortedApplicants, currentPage, itemsPerPage]);

  // 총 페이지 수
  const totalPages = Math.ceil(filteredAndSortedApplicants.length / itemsPerPage);

  // 상태 배지 함수
  const getStatusBadge = (status, stage) => {
    if (!status) return <span className="text-gray-400">N/A</span>;
    
    let stageStatus = '';
    if (stage === 'PRACTICAL_INTERVIEW' && status.startsWith('PRACTICAL_INTERVIEW_')) {
      stageStatus = status.replace('PRACTICAL_INTERVIEW_', '');
    } else if (stage === 'EXECUTIVE_INTERVIEW' && status.startsWith('EXECUTIVE_INTERVIEW_')) {
      stageStatus = status.replace('EXECUTIVE_INTERVIEW_', '');
    } else {
      return <span className="text-gray-400">N/A</span>;
    }

    const badgeConfig = {
      'PASSED': { color: 'bg-green-100 text-green-800', text: '합격' },
      'FAILED': { color: 'bg-red-100 text-red-800', text: '불합격' },
      'COMPLETED': { color: 'bg-blue-100 text-blue-800', text: '완료' },
      'IN_PROGRESS': { color: 'bg-yellow-100 text-yellow-800', text: '진행중' },
      'SCHEDULED': { color: 'bg-gray-100 text-gray-800', text: '예정' }
    };

    const config = badgeConfig[stageStatus] || { color: 'bg-gray-100 text-gray-800', text: stageStatus };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getOverallStatusBadge = (status) => {
    if (!status) return <span className="text-gray-400">N/A</span>;
    
    if (status.includes('PASSED')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">합격</span>;
    } else if (status.includes('FAILED')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">불합격</span>;
    } else if (status.includes('COMPLETED')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">완료</span>;
    } else if (status.includes('IN_PROGRESS')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">진행중</span>;
    } else if (status.includes('SCHEDULED')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">예정</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">대기중</span>;
    }
  };

  // 지원자 상세 보기
  const handleViewDetails = (applicant) => {
    setSelectedApplicant(applicant);
  };

  // 뒤로가기
  const handleBackToList = () => {
    setSelectedApplicant(null);
  };

  // 행 클릭 핸들러
  const handleRowClick = (applicant) => {
    setSelectedRowApplicant(applicant);
    setRightDrawerOpen(true);
  };

  // 평가 핸들러
  const handleEvaluate = (applicant) => {
    // 평가 페이지로 이동하는 로직
    navigate(`/applicant/evaluate/${applicant.application_id}`);
  };

  // 재분석 핸들러
  const handleReAnalyze = async (applicant) => {
    try {
      setIsReAnalyzing(true);
      // 재분석 API 호출
      await api.post(`/whisper-analysis/process-qa/${applicant.application_id}`, {
        run_emotion_context: true,
        delete_video_after: true
      });
      
      showToast('재분석이 시작되었습니다.', 'success');
      // 목록 새로고침
      window.location.reload();
    } catch (error) {
      console.error('재분석 오류:', error);
      showToast('재분석 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsReAnalyzing(false);
    }
  };

  // 일괄 재분석 핸들러
  const handleBatchReAnalysis = async () => {
    try {
      setIsReAnalyzing(true);
      const promises = paginatedApplicants.map(applicant =>
        api.post(`/whisper-analysis/process-qa/${applicant.application_id}`, {
          run_emotion_context: true,
          delete_video_after: true
        })
      );
      
      await Promise.all(promises);
      showToast('일괄 재분석이 시작되었습니다.', 'success');
      window.location.reload();
    } catch (error) {
      console.error('일괄 재분석 오류:', error);
      showToast('일괄 재분석 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsReAnalyzing(false);
    }
  };

  // 내보내기 핸들러
  const handleExport = async (type) => {
    try {
      setIsExporting(true);
      if (type === 'csv') {
        // CSV 내보내기 로직
        const csvContent = generateCSV(filteredAndSortedApplicants);
        downloadFile(csvContent, `applicants_${jobPostId}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      } else if (type === 'pdf') {
        // PDF 내보내기 로직
        await generatePDF(filteredAndSortedApplicants, jobPostId);
      }
      showToast(`${type.toUpperCase()} 내보내기가 완료되었습니다.`, 'success');
    } catch (error) {
      console.error('내보내기 오류:', error);
      showToast('내보내기 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // CSV 생성
  const generateCSV = (data) => {
    const headers = ['이름', '이메일', '직무공고', 'AI점수', '실무진면접', '임원진면접', '상태', '지원일'];
    const rows = data.map(applicant => [
      applicant.name,
      applicant.email,
      applicant.job_posting_title || 'N/A',
      applicant.ai_interview_score || 'N/A',
      getStatusText(applicant.interview_status, 'PRACTICAL_INTERVIEW'),
      getStatusText(applicant.interview_status, 'EXECUTIVE_INTERVIEW'),
      getOverallStatusText(applicant.interview_status),
      new Date(applicant.created_at).toLocaleDateString()
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  // 상태 텍스트 변환
  const getStatusText = (status, stage) => {
    if (!status) return 'N/A';
    
    let stageStatus = '';
    if (stage === 'PRACTICAL_INTERVIEW' && status.startsWith('PRACTICAL_INTERVIEW_')) {
      stageStatus = status.replace('PRACTICAL_INTERVIEW_', '');
    } else if (stage === 'EXECUTIVE_INTERVIEW' && status.startsWith('EXECUTIVE_INTERVIEW_')) {
      stageStatus = status.replace('EXECUTIVE_INTERVIEW_', '');
    } else {
      return 'N/A';
    }

    const statusMap = {
      'PASSED': '합격',
      'FAILED': '불합격',
      'COMPLETED': '완료',
      'IN_PROGRESS': '진행중',
      'SCHEDULED': '예정'
    };

    return statusMap[stageStatus] || stageStatus;
  };

  const getOverallStatusText = (status) => {
    if (!status) return 'N/A';
    
    if (status.includes('PASSED')) return '합격';
    if (status.includes('FAILED')) return '불합격';
    if (status.includes('COMPLETED')) return '완료';
    if (status.includes('IN_PROGRESS')) return '진행중';
    if (status.includes('SCHEDULED')) return '예정';
    return '대기중';
  };

  // 파일 다운로드
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // PDF 생성 (간단한 구현)
  const generatePDF = async (data, jobPostId) => {
    // 실제로는 jsPDF 등의 라이브러리를 사용하여 PDF 생성
    // 여기서는 간단한 다운로드로 구현
    const content = `지원자 목록 - ${jobPostId}\n\n${data.map(a => `${a.name} (${a.email})`).join('\n')}`;
    downloadFile(content, `applicants_${jobPostId}_${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
  };

  

  // 실무진 면접 마감
  const handleClosePracticalInterview = useCallback(async () => {
    setIsClosingPracticalInterview(true);
    
    try {
      const practicalInterviewApplicants = applicantsList.filter(applicant => {
        const status = applicant.interview_status;
        return status === 'PRACTICAL_INTERVIEW_IN_PROGRESS' || 
               status === 'PRACTICAL_INTERVIEW_COMPLETED' || 
               status === 'PRACTICAL_INTERVIEW_PASSED' || 
               status === 'PRACTICAL_INTERVIEW_FAILED';
      });
      
      if (practicalInterviewApplicants.length === 0) {
        alert('마감할 실무진 면접이 없습니다.');
        return;
      }
      
      const updatePromises = practicalInterviewApplicants.map(async (applicant) => {
        let newStatus = '';
        
        switch (applicant.interview_status) {
          case 'PRACTICAL_INTERVIEW_IN_PROGRESS':
            newStatus = 'PRACTICAL_INTERVIEW_COMPLETED';
            break;
          case 'PRACTICAL_INTERVIEW_COMPLETED':
            newStatus = 'PRACTICAL_INTERVIEW_PASSED';
            break;
          default:
            return;
        }
        
        return api.put(`/schedules/${applicant.application_id}/interview-status?interview_status=${newStatus}`);
      });
      
      await Promise.all(updatePromises);
      alert('실무진 면접이 마감되었습니다.');
      window.location.reload();
      
    } catch (error) {
      console.error('실무진 면접 마감 오류:', error);
      alert('실무진 면접 마감 중 오류가 발생했습니다.');
    } finally {
      setIsClosingPracticalInterview(false);
    }
  }, [applicantsList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

  if (selectedApplicant) {
    return (
      <ApplicantProcessDetail 
        applicant={selectedApplicant} 
        onBack={handleBackToList} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">전체 면접 관리 시스템</h1>
              <p className="text-gray-600 mt-1">채용 공고 ID: {jobPostId}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">총 지원자</p>
                <p className="text-2xl font-bold text-blue-600">{applicantsList.length}명</p>
              </div>
              <button
                onClick={() => navigate(`/ai-interview-system/${jobPostId}`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                title="AI 면접 시스템으로 이동"
              >
                <FaBrain className="w-4 h-4" />
                AI 면접 시스템
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MdOutlineDashboard className="inline w-4 h-4 mr-2" />
                전체 현황
              </button>
              <button
                onClick={() => setActiveTab('applicants')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'applicants'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaUsers className="inline w-4 h-4 mr-2" />
                지원자 관리
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'statistics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiBarChart2 className="inline w-4 h-4 mr-2" />
                통계 및 리포트
              </button>
            </nav>
          </div>
        </div>

        {/* 상단 툴바 */}
        <div className="bg-white rounded-lg shadow-lg mb-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* 검색 및 필터 */}
            <div className="flex flex-wrap items-center gap-4 flex-1">
              {/* 검색 */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="이름 또는 이메일로 검색.."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              {/* 직무 공고 필터 */}
              <select
                value={filterJobPosting}
                onChange={(e) => setFilterJobPosting(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option key="" value="">모든 직무</option>
                {Array.from(new Set(applicantsList.map(a => a.job_posting_title))).map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>

              {/* 상태 필터 */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">모든 상태</option>
                <option value="AI_INTERVIEW_PASSED">AI 면접 통과</option>
                <option value="AI_INTERVIEW_FAILED">AI 면접 불합격</option>
                <option value="PRACTICAL_INTERVIEW_PASSED">실무진 면접 합격</option>
                <option value="PRACTICAL_INTERVIEW_FAILED">실무진 면접 불합격</option>
                <option value="EXECUTIVE_INTERVIEW_PASSED">임원진 면접 합격</option>
                <option value="EXECUTIVE_INTERVIEW_FAILED">임원진 면접 불합격</option>
              </select>

              {/* 점수 필터 */}
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">모든 점수</option>
                <option value="0-50">0-50점</option>
                <option value="51-70">51-70점</option>
                <option value="71-85">71-85점</option>
                <option value="86-100">86-100점</option>
              </select>

              {/* 기간 필터 */}
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">모든 기간</option>
                <option value="today">오늘</option>
                <option value="week">이번 주</option>
                <option value="month">이번 달</option>
                <option value="quarter">이번 분기</option>
              </select>
            </div>

            {/* 정렬 및 옵션 */}
            <div className="flex items-center gap-4">
              {/* 정렬 */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="name">이름순</option>
                  <option value="score">점수순</option>
                  <option value="date">날짜순</option>
                  <option value="status">상태순</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* 재분석 */}
              <button
                onClick={() => handleBatchReAnalysis()}
                disabled={isReAnalyzing}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <FaSync className="w-4 h-4" />
                {isReAnalyzing ? '재분석중...' : '일괄 재분석'}
              </button>

              {/* 내보내기 */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <FaDownload className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <FaFileAlt className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 전체 채용 현황 (대시보드) */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">전체 채용 현황</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <FaUsers className="text-blue-600 text-2xl mr-3" />
                      <div>
                        <p className="text-sm text-blue-600">전체 지원</p>
                        <p className="text-2xl font-bold text-blue-700">{statistics.total}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <FaBrain className="text-purple-600 text-2xl mr-3" />
                      <div>
                        <p className="text-sm text-purple-600">AI 면접</p>
                        <p className="text-2xl font-bold text-purple-700">{statistics.aiInterview.total}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <MdOutlineBusinessCenter className="text-green-600 text-2xl mr-3" />
                      <div>
                        <p className="text-sm text-green-600">실무진 면접</p>
                        <p className="text-2xl font-bold text-green-700">{statistics.practical.total}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <FaCrown className="text-orange-600 text-2xl mr-3" />
                      <div>
                        <p className="text-sm text-orange-600">임원진 면접</p>
                        <p className="text-2xl font-bold text-orange-700">{statistics.executive.total}명</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 단계별 상세 현황 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">AI 면접 통계</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">통과:</span>
                        <span className="font-medium text-green-600">{statistics.aiInterview.passed}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">불합격:</span>
                        <span className="font-medium text-red-600">{statistics.aiInterview.failed}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">대기중:</span>
                        <span className="font-medium text-yellow-600">{statistics.aiInterview.pending}명</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">실무진 면접 통계</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">합격:</span>
                        <span className="font-medium text-green-600">{statistics.practical.passed}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">불합격:</span>
                        <span className="font-medium text-red-600">{statistics.practical.failed}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">진행중:</span>
                        <span className="font-medium text-yellow-600">{statistics.practical.inProgress}명</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 단계별 면접 진행 관리 */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">단계별 면접 진행 관리</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">AI 면접 단계</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      현재 {statistics.aiInterview.passed}명 통과, {statistics.aiInterview.failed}명 불합격
                    </p>
                    <button 
                      onClick={() => {
                        setActiveTab('applicants');
                        setFilterStatus('AI_INTERVIEW_PASSED');
                      }}
                      className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      AI 면접 보기
                    </button>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">실무진 면접 단계</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      현재 {statistics.practical.passed}명 합격, {statistics.practical.inProgress}명 진행중
                    </p>
                    <button 
                      onClick={() => {
                        setActiveTab('applicants');
                        setFilterStatus('PRACTICAL_INTERVIEW_PASSED');
                      }}
                      className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      실무진 면접 보기
                    </button>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">임원진 면접 단계</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      현재 {statistics.executive.passed}명 합격, {statistics.executive.inProgress}명 진행중
                    </p>
                    <button 
                      onClick={() => {
                        setActiveTab('applicants');
                        setFilterStatus('EXECUTIVE_INTERVIEW_PASSED');
                      }}
                      className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      임원진 면접 보기
                    </button>
                  </div>
                </div>
              </div>

              {/* 단계별 일괄 관리 */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">단계별 일괄 관리</h2>
                
                {/* 실무진 면접 마감 */}
                {statistics.practical.total > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">실무진 면접 마감</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          실무진 면접 단계를 한번에 마감하고 다음 단계로 진행합니다. ({statistics.practical.total}명)
                        </p>
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ 진행중인 면접은 완료로, 완료된 면접은 합격으로 처리됩니다.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowBatchModal(true)}
                        className="px-6 py-3 text-white rounded-lg font-medium transition-colors bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      >
                        실무진 면접 마감
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'applicants' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">지원자 전체 프로세스 추적</h2>
                <p className="text-sm text-gray-600">전체 채용 프로세스에서 지원자의 진행 현황을 확인할 수 있습니다.</p>
              </div>

              {applicantsList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-500 text-lg mb-2">지원자가 없습니다</p>
                  <p className="text-gray-400 text-sm">채용 공고에 지원한 지원자가 없습니다</p>
                </div>
              ) : (
                <div className="relative">
                  {/* 지원자 테이블 */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              지원자 정보
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              직무 공고
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              AI 점수
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              실무진 면접
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              임원진 면접
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              상태
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              작업
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedApplicants.map((applicant) => (
                            <tr 
                              key={applicant.application_id}
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleRowClick(applicant)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <FiUser className="text-blue-600" />
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{applicant.name}</div>
                                    <div className="text-sm text-gray-500">{applicant.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{applicant.job_posting_title || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {applicant.ai_interview_score ? (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      applicant.ai_interview_score >= 80 ? 'bg-green-100 text-green-800' :
                                      applicant.ai_interview_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {applicant.ai_interview_score}점
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {getStatusBadge(applicant.interview_status, 'PRACTICAL_INTERVIEW')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {getStatusBadge(applicant.interview_status, 'EXECUTIVE_INTERVIEW')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {getOverallStatusBadge(applicant.interview_status)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDetails(applicant);
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    보기
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEvaluate(applicant);
                                    }}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    평가
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReAnalyze(applicant);
                                    }}
                                    className="text-yellow-600 hover:text-yellow-900"
                                  >
                                    재분석
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          이전
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          다음
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
                            <span className="font-medium">
                              {Math.min(currentPage * itemsPerPage, filteredAndSortedApplicants.length)}
                            </span>{' '}
                            / <span className="font-medium">{filteredAndSortedApplicants.length}</span> 결과
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`relative inline-flex items-center px-1 py-2 border text-sm font-medium ${
                                  page === currentPage
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">통계 및 리포트</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">채용 프로세스 이탈률</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">서류 → AI 면접:</span>
                      <span className="font-medium">{statistics.total > 0 ? ((statistics.total - statistics.aiInterview.total) / statistics.total * 100).toFixed(1) : 0}% 이탈</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">AI 면접 → 실무진:</span>
                      <span className="font-medium">{statistics.aiInterview.total > 0 ? ((statistics.aiInterview.total - statistics.practical.total) / statistics.aiInterview.total * 100).toFixed(1) : 0}% 이탈</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">실무진 → 임원진:</span>
                      <span className="font-medium">{statistics.practical.total > 0 ? ((statistics.practical.total - statistics.executive.total) / statistics.practical.total * 100).toFixed(1) : 0}% 이탈</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">리포트 생성</h3>
                  <div className="space-y-3">
                    <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                      <FaDownload className="inline w-4 h-4 mr-2" />
                      주간 채용 리포트
                    </button>
                    <button className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                      <FaDownload className="inline w-4 h-4 mr-2" />
                      단계별 분석 리포트
                    </button>
                    <button className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                      <FaDownload className="inline w-4 h-4 mr-2" />
                      최종 합격자 리포트
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 우측 드로어 */}
        {rightDrawerOpen && selectedRowApplicant && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-0 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white h-full overflow-y-auto">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">지원자 상세 정보</h3>
                  <button
                    onClick={() => setRightDrawerOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimesCircle className="w-6 h-6" />
                  </button>
                </div>

                {/* 지원자 기본 정보 */}
                <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <FiUser className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{selectedRowApplicant.name}</h4>
                      <p className="text-sm text-gray-600">{selectedRowApplicant.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">직무 공고:</span>
                      <span className="text-sm font-medium">{selectedRowApplicant.job_posting_title || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">AI 점수:</span>
                      <span className="text-sm font-medium">{selectedRowApplicant.ai_interview_score || 'N/A'}점</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">지원일:</span>
                      <span className="text-sm font-medium">{new Date(selectedRowApplicant.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* 강점 및 약점 */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">주요 강점</h4>
                  <div className="space-y-2">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-800">✅ AI 면접에서 높은 점수 획득</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-800">✅ 실무진 면접 통과</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-800">✅ 적극적인 지원 태도</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">개선점</h4>
                  <div className="space-y-2">
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-yellow-800">⚠️ 임원진 면접 지연</p>
                    </div>
                  </div>
                </div>

                {/* 최근 점수 변화 */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">최근 점수 변화</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">AI 면접:</span>
                      <span className="font-medium text-blue-600">{selectedRowApplicant.ai_interview_score || 'N/A'}점</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">실무진 면접:</span>
                      <span className="font-medium text-green-600">합격</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">임원진 면접:</span>
                      <span className="font-medium text-gray-600">대기중</span>
                    </div>
                  </div>
                </div>

                {/* 리스크 플래그 */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">리스크 플래그</h4>
                  <div className="space-y-2">
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm text-red-800">⚠️ 임원진 면접 지연</p>
                    </div>
                  </div>
                </div>

                {/* 이전 평가 결과 */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">이전 평가 결과</h4>
                  <div className="border rounded-lg">
                    <div className="border-b">
                      <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                        서류 전형
                      </button>
                    </div>
                    <div className="border-b">
                      <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                        직무 적성
                      </button>
                    </div>
                    <div>
                      <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                        AI 면접
                      </button>
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setRightDrawerOpen(false);
                      handleViewDetails(selectedRowApplicant);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    전체 프로세스 보기
                  </button>
                  <button
                    onClick={() => {
                      setRightDrawerOpen(false);
                      handleReAnalyze(selectedRowApplicant);
                    }}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    재분석
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 일괄 관리 모달 */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {batchModalStep === 1 ? (
                  <>
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                      <FaExclamationTriangle className="text-orange-600 text-xl" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mt-4">실무진 면접 마감 확인</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      실무진 면접 단계를 마감하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </p>
                    <div className="mt-4 bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm text-orange-800">
                        <strong>영향 범위:</strong> {statistics.practical.total}명의 지원자
                      </p>
                      <p className="text-sm text-orange-800 mt-1">
                        <strong>처리 내용:</strong> 진행중 → 완료, 완료 → 합격
                      </p>
                    </div>
                    <div className="mt-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          onChange={(e) => setBatchModalData({ ...batchModalData, confirmed: e.target.checked })}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          위 작업을 확인했습니다
                        </span>
                      </label>
                    </div>
                    <div className="mt-6 flex space-x-3">
                      <button
                        onClick={() => setShowBatchModal(false)}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => setBatchModalStep(2)}
                        disabled={!batchModalData.confirmed}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        다음
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <FaExclamationTriangle className="text-red-600 text-xl" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mt-4">최종 확인</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      다음 지원자들이 영향을 받습니다:
                    </p>
                    <div className="mt-4 max-h-32 overflow-y-auto">
                      {paginatedApplicants
                        .filter(a => a.interview_status && a.interview_status.startsWith('PRACTICAL_INTERVIEW_'))
                        .slice(0, 5)
                        .map(applicant => (
                          <div key={applicant.application_id} className="flex justify-between items-center py-1">
                            <span className="text-sm text-gray-700">{applicant.name}</span>
                            <span className="text-xs text-gray-500">{applicant.interview_status}</span>
                          </div>
                        ))}
                      {paginatedApplicants.filter(a => a.interview_status && a.interview_status.startsWith('PRACTICAL_INTERVIEW_')).length > 5 && (
                        <p className="text-xs text-gray-500 text-center">... 외 {paginatedApplicants.filter(a => a.interview_status && a.interview_status.startsWith('PRACTICAL_INTERVIEW_')).length - 5}명</p>
                      )}
                    </div>
                    <div className="mt-6 flex space-x-3">
                      <button
                        onClick={() => setBatchModalStep(1)}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        뒤로
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await handleClosePracticalInterview();
                            setShowBatchModal(false);
                            setBatchModalStep(1);
                            showToast('실무진 면접이 성공적으로 마감되었습니다.', 'success');
                          } catch (error) {
                            showToast('마감 중 오류가 발생했습니다.', 'error');
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        마감 실행
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 토스트 알림 */}
        {showToast && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            toastType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewAdminPage;