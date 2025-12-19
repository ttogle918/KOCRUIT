import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaBrain, FaSync, FaSearch, FaDownload, FaFileAlt, FaUsers
} from 'react-icons/fa';
import { 
  FiBarChart2, FiUser
} from 'react-icons/fi';
import { 
  MdOutlineDashboard
} from 'react-icons/md';

import interviewApi from '../../../api/interviewApi';
import AiInterviewApi from '../../../api/aiInterviewApi';
import videoAnalysisApi from '../../../api/videoAnalysisApi';
import api from '../../../api/api';


// 컴포넌트 import
import ApplicantProcessDetail from '../../../components/interview/admin/ApplicantProcessDetail';
import InterviewOverviewTab from '../../../components/interview/admin/InterviewOverviewTab';
import InterviewApplicantsTab from '../../../components/interview/admin/InterviewApplicantsTab';
import InterviewStatisticsTab from '../../../components/interview/admin/InterviewStatisticsTab';
import ApplicantDetailDrawer from '../../../components/interview/admin/ApplicantDetailDrawer';
import BatchActionModal from '../../../components/interview/admin/BatchActionModal';

// Enums definition matching backend/app/models/v2/application/application.py
const OverallStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  PASSED: "PASSED",
  REJECTED: "REJECTED",
  CANCELED: "CANCELED"
};

const StageName = {
  DOCUMENT: "DOCUMENT",
  WRITTEN_TEST: "WRITTEN_TEST",
  AI_INTERVIEW: "AI_INTERVIEW",
  PRACTICAL_INTERVIEW: "PRACTICAL_INTERVIEW",
  EXECUTIVE_INTERVIEW: "EXECUTIVE_INTERVIEW",
  FINAL_RESULT: "FINAL_RESULT"
};

const StageStatus = {
  PENDING: "PENDING",
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  PASSED: "PASSED",
  FAILED: "FAILED",
  CANCELED: "CANCELED"
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
        // 전체 지원자를 가져와야 모든 단계의 통계와 목록을 관리할 수 있습니다.
        const response = await interviewApi.getAllApplicants(jobPostId);
        setApplicantsList(response || []);
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
    if (!applicantsList.length) return {
      total: 0,
      aiInterview: { total: 0, passed: 0, failed: 0, pending: 0 },
      practical: { total: 0, passed: 0, failed: 0, inProgress: 0 },
      executive: { total: 0, passed: 0, failed: 0, inProgress: 0 },
      final: { total: 0, passed: 0, failed: 0, inProgress: 0 }
    };

    const stats = {
      total: applicantsList.length,
      aiInterview: { total: 0, passed: 0, failed: 0, pending: 0 },
      practical: { total: 0, passed: 0, failed: 0, inProgress: 0 },
      executive: { total: 0, passed: 0, failed: 0, inProgress: 0 },
      final: { total: 0, passed: 0, failed: 0, inProgress: 0 }
    };

    // Stage 순서 정의 (인덱스 비교용)
    const stageOrder = [
      StageName.DOCUMENT,
      StageName.WRITTEN_TEST,
      StageName.AI_INTERVIEW,
      StageName.PRACTICAL_INTERVIEW,
      StageName.EXECUTIVE_INTERVIEW,
      StageName.FINAL_RESULT
    ];

    applicantsList.forEach(applicant => {
      // 대소문자 차이로 인한 비교 실패 방지를 위해 .toUpperCase() 처리
      const currentStage = (applicant.currentStage || "").toUpperCase();
      const stageStatus = (applicant.stageStatus || "").toUpperCase();
      const overallStatus = (applicant.overallStatus || "").toUpperCase();
      
      // index 찾을 때도 안전하게 대문자로 비교
      const currentStageIndex = stageOrder.findIndex(s => s.toUpperCase() === currentStage);


       // 1. AI 면접 통계 (AI_INTERVIEW 단계이거나 그 이후 단계)
       const aiInterviewIdx = stageOrder.indexOf(StageName.AI_INTERVIEW);
       if (currentStageIndex >= aiInterviewIdx) {
         stats.aiInterview.total++;
         if (currentStage === StageName.AI_INTERVIEW) {
             if (stageStatus === StageStatus.PASSED || stageStatus === StageStatus.COMPLETED) stats.aiInterview.passed++;
             else if (stageStatus === StageStatus.FAILED) stats.aiInterview.failed++;
             else stats.aiInterview.pending++;
         } 
         else if (currentStageIndex > aiInterviewIdx) {
             stats.aiInterview.passed++;
         }
       }
 
       // 2. 실무진 면접 통계
       const practicalInterviewIdx = stageOrder.indexOf(StageName.PRACTICAL_INTERVIEW);
       if (currentStageIndex >= practicalInterviewIdx) {
         stats.practical.total++;
         if (currentStage === StageName.PRACTICAL_INTERVIEW) {
             if (stageStatus === StageStatus.PASSED) stats.practical.passed++;
             else if (stageStatus === StageStatus.FAILED) stats.practical.failed++;
             else stats.practical.inProgress++;
         } else if (currentStageIndex > practicalInterviewIdx) {
             stats.practical.passed++;
         }
       }
 
       // 3. 임원진 면접 통계
       const executiveInterviewIdx = stageOrder.indexOf(StageName.EXECUTIVE_INTERVIEW);
       if (currentStageIndex >= executiveInterviewIdx) {
         stats.executive.total++;
         if (currentStage === StageName.EXECUTIVE_INTERVIEW) {
             if (stageStatus === StageStatus.PASSED) stats.executive.passed++;
             else if (stageStatus === StageStatus.FAILED) stats.executive.failed++;
             else stats.executive.inProgress++;
         } else if (currentStageIndex > executiveInterviewIdx) {
             stats.executive.passed++;
         }
       }
 
       // 4. 최종 결과 통계
       if (currentStage === StageName.FINAL_RESULT) {
           stats.final.total++;
           if (overallStatus === OverallStatus.PASSED) stats.final.passed++;
           else if (overallStatus === OverallStatus.REJECTED) stats.final.failed++;
           else stats.final.inProgress++;
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
        (applicant.jobPostingTitle || applicant.job_posting_title) === filterJobPosting
      );
    }

    // 상태 필터링
    if (filterStatus) {
      filtered = filtered.filter(applicant => {
        const currentStage = applicant.currentStage;
        const stageStatus = applicant.stageStatus;
        const stageOrder = [
            StageName.DOCUMENT,
            StageName.WRITTEN_TEST,
            StageName.AI_INTERVIEW,
            StageName.PRACTICAL_INTERVIEW,
            StageName.EXECUTIVE_INTERVIEW,
            StageName.FINAL_RESULT
        ];
        const currentStageIndex = stageOrder.indexOf(currentStage);
        // 0. 특정 단계 필터
        if (filterStatus === 'AI_INTERVIEW') {
            return currentStage === StageName.AI_INTERVIEW || currentStage === StageName.AI_INTERVIEW_PASSED
            || currentStage === StageName.AI_INTERVIEW_FAILED || currentStage === StageName.PRACTICAL_INTERVIEW
            || currentStage === StageName.PRACTICAL_INTERVIEW_FAILED || currentStage === StageName.PRACTICAL_INTERVIEW_PASSED
            || currentStage === StageName.EXECUTIVE_INTERVIEW || currentStage === StageName.EXECUTIVE_INTERVIEW_PASSED
            || currentStage === StageName.EXECUTIVE_INTERVIEW_FAILED
            || currentStage === StageName.FINAL_RESULT;

        }
        if (filterStatus === 'PRACTICAL_INTERVIEW') {
          return currentStage === StageName.PRACTICAL_INTERVIEW || currentStage === StageName.PRACTICAL_INTERVIEW_FAILED 
          || currentStage === StageName.PRACTICAL_INTERVIEW_PASSED
          || currentStage === StageName.EXECUTIVE_INTERVIEW || currentStage === StageName.EXECUTIVE_INTERVIEW_PASSED
          || currentStage === StageName.EXECUTIVE_INTERVIEW_FAILED
          || currentStage === StageName.FINAL_RESULT;
        }
        if (filterStatus === 'EXECUTIVE_INTERVIEW') {
            return currentStage === StageName.EXECUTIVE_INTERVIEW || currentStage === StageName.EXECUTIVE_INTERVIEW_PASSED
            || currentStage === StageName.EXECUTIVE_INTERVIEW_FAILED
            || currentStage === StageName.FINAL_RESULT;
        }
        if (filterStatus === 'FINAL_RESULT') {
            return currentStage === StageName.FINAL_RESULT;
        }

        // 1. AI 면접 통과 필터
        if (filterStatus === 'AI_INTERVIEW_PASSED') {
            // 현재 단계가 AI_INTERVIEW보다 뒤에 있거나, 현재 단계에서 PASSED인 경우
            if (currentStageIndex > stageOrder.indexOf(StageName.AI_INTERVIEW)) return true;
            return currentStage === StageName.AI_INTERVIEW && stageStatus === StageStatus.PASSED;
        }
        
        // 2. 실무진 면접 합격 필터
        if (filterStatus === 'PRACTICAL_INTERVIEW_PASSED') {
            // 현재 단계가 PRACTICAL_INTERVIEW보다 뒤에 있거나, 현재 단계에서 PASSED인 경우
            if (currentStageIndex > stageOrder.indexOf(StageName.PRACTICAL_INTERVIEW)) return true;
            return currentStage === StageName.PRACTICAL_INTERVIEW && stageStatus === StageStatus.PASSED;
        }
        
        // 3. 임원진 면접 합격 필터
        if (filterStatus === 'EXECUTIVE_INTERVIEW_PASSED') {
             if (currentStageIndex > stageOrder.indexOf(StageName.EXECUTIVE_INTERVIEW)) return true;
             return currentStage === StageName.EXECUTIVE_INTERVIEW && stageStatus === StageStatus.PASSED;
        }
        
        // 4. 불합격 필터 (각 단계별)
        if (filterStatus === 'AI_INTERVIEW_FAILED') {
            return currentStage === StageName.AI_INTERVIEW && stageStatus === StageStatus.FAILED;
        }
        if (filterStatus === 'PRACTICAL_INTERVIEW_FAILED') {
            return currentStage === StageName.PRACTICAL_INTERVIEW && stageStatus === StageStatus.FAILED;
        }
        if (filterStatus === 'EXECUTIVE_INTERVIEW_FAILED') {
            return currentStage === StageName.EXECUTIVE_INTERVIEW && stageStatus === StageStatus.FAILED;
        }
        
        // 기타 상태 매칭
        return stageStatus === filterStatus;
      });
    }

    // 점수 필터링
    if (filterScore) {
      const [min, max] = filterScore.split('-').map(Number);
      filtered = filtered.filter(applicant => {
        const score = applicant.aiInterviewScore || applicant.ai_interview_score;
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
          aValue = a.aiInterviewScore || a.ai_interview_score || 0;
          bValue = b.aiInterviewScore || b.ai_interview_score || 0;
          break;
        case 'date':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'status':
          aValue = a.interviewStatus || a.interview_status || '';
          bValue = b.interviewStatus || b.interview_status || '';
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
  const getStatusBadge = (stageStatus, currentStage) => {
    if (!stageStatus) return <span className="text-gray-400">N/A</span>;
    
    // stageStatus 값 자체를 사용 (StageStatus Enum 값)
    
    const badgeConfig = {
      [StageStatus.PASSED]: { color: 'bg-green-100 text-green-800', text: '합격' },
      [StageStatus.FAILED]: { color: 'bg-red-100 text-red-800', text: '불합격' },
      [StageStatus.COMPLETED]: { color: 'bg-blue-100 text-blue-800', text: '완료' },
      [StageStatus.IN_PROGRESS]: { color: 'bg-yellow-100 text-yellow-800', text: '진행중' },
      [StageStatus.SCHEDULED]: { color: 'bg-gray-100 text-gray-800', text: '예정' },
      [StageStatus.PENDING]: { color: 'bg-gray-100 text-gray-800', text: '대기' },
      [StageStatus.CANCELED]: { color: 'bg-gray-200 text-gray-600', text: '취소' },
    };

    const config = badgeConfig[stageStatus] || { color: 'bg-gray-100 text-gray-800', text: stageStatus };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getOverallStatusBadge = (overallStatus) => {
    if (!overallStatus) return <span className="text-gray-400">N/A</span>;
    
    const badgeConfig = {
        [OverallStatus.PASSED]: { color: 'bg-green-100 text-green-800', text: '최종 합격' },
        [OverallStatus.REJECTED]: { color: 'bg-red-100 text-red-800', text: '불합격' },
        [OverallStatus.IN_PROGRESS]: { color: 'bg-yellow-100 text-yellow-800', text: '전형 진행중' },
        [OverallStatus.CANCELED]: { color: 'bg-gray-200 text-gray-600', text: '포기/취소' }
    };

    const config = badgeConfig[overallStatus] || { color: 'bg-gray-100 text-gray-800', text: overallStatus };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.text}
        </span>
    );
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
      // AiInterviewApi를 사용하여 재분석 시작
      await AiInterviewApi.processWhisperAnalysis(applicant.application_id, {
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
        AiInterviewApi.processWhisperAnalysis(applicant.application_id, {
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
const headers = ['이름', '이메일', '직무공고', 'AI점수', '현재단계', '단계상태', '전체상태', '지원일'];
const rows = data.map(applicant => [
  applicant.name,
  applicant.email,
  applicant.jobPostingTitle || applicant.job_posting_title || 'N/A',
  applicant.aiInterviewScore || applicant.ai_interview_score || 'N/A',
  applicant.currentStage || applicant.current_stage,
  getStatusText(applicant.stageStatus || applicant.stage_status),
  getOverallStatusText(applicant.overallStatus || applicant.overall_status),
  new Date(applicant.createdAt || applicant.created_at).toLocaleDateString()
]);

return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
};

  // 상태 텍스트 변환
  const getStatusText = (stageStatus) => {
    if (!stageStatus) return 'N/A';
    
    const statusMap = {
      [StageStatus.PASSED]: '합격',
      [StageStatus.FAILED]: '불합격',
      [StageStatus.COMPLETED]: '완료',
      [StageStatus.IN_PROGRESS]: '진행중',
      [StageStatus.SCHEDULED]: '예정',
      [StageStatus.PENDING]: '대기',
      [StageStatus.CANCELED]: '취소'
    };

    return statusMap[stageStatus] || stageStatus;
  };

  const getOverallStatusText = (overallStatus) => {
    if (!overallStatus) return 'N/A';
    
    const statusMap = {
      [OverallStatus.PASSED]: '최종 합격',
      [OverallStatus.REJECTED]: '불합격',
      [OverallStatus.IN_PROGRESS]: '진행중',
      [OverallStatus.CANCELED]: '취소/포기'
    };
    
    return statusMap[overallStatus] || overallStatus;
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
        return applicant.current_stage === StageName.PRACTICAL_INTERVIEW;
      });
      
      if (practicalInterviewApplicants.length === 0) {
        alert('마감할 실무진 면접 대상자가 없습니다.');
        return;
      }
      
      const updatePromises = practicalInterviewApplicants.map(async (applicant) => {
        let newStageStatus = '';
        
        // 현재 상태에 따라 다음 상태 결정
        switch (applicant.stage_status) {
          case StageStatus.IN_PROGRESS:
            newStageStatus = StageStatus.COMPLETED; // 진행중 -> 완료
            break;
          case StageStatus.COMPLETED:
            newStageStatus = StageStatus.PASSED; // 완료 -> 합격 (임시 로직)
            break;
          default:
            return;
        }
        
        // API 호출: interviewApi의 updateInterviewStatus 사용
        return interviewApi.updateInterviewStatus(applicant.application_id, newStageStatus);
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
                {Array.from(new Set(applicantsList.map(a => a.jobPostingTitle || a.job_posting_title))).filter(Boolean).map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>

              {/* 상태 필터 */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">모든 지원자 목록</option>
                <option value="AI_INTERVIEW">AI 면접자</option>
                <option value="AI_INTERVIEW_PASSED">AI 면접 통과자</option>
                <option value="AI_INTERVIEW_FAILED">AI 면접 불합격자</option>
                <option value="PRACTICAL_INTERVIEW">실무진 면접자</option>
                <option value="PRACTICAL_INTERVIEW_PASSED">실무진 면접 합격자</option>
                <option value="PRACTICAL_INTERVIEW_FAILED">실무진 면접 불합격자</option>
                <option value="EXECUTIVE_INTERVIEW">임원진 면접자</option>
                <option value="EXECUTIVE_INTERVIEW_PASSED">임원진 면접 합격자</option>
                <option value="EXECUTIVE_INTERVIEW_FAILED">임원진 면접 불합격자</option>
                <option value="FINAL_RESULT">최종 합격자</option>
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
            <InterviewOverviewTab 
              statistics={statistics} 
              setActiveTab={setActiveTab} 
              setFilterStatus={setFilterStatus} 
              setShowBatchModal={setShowBatchModal}
              StageName={StageName}
            />
          )}

          {activeTab === 'applicants' && (
            <InterviewApplicantsTab 
              paginatedApplicants={paginatedApplicants} 
              handleRowClick={handleRowClick} 
              handleViewDetails={handleViewDetails} 
              handleEvaluate={handleEvaluate} 
              handleReAnalyze={handleReAnalyze}
              getStatusBadge={getStatusBadge}
              getOverallStatusBadge={getOverallStatusBadge}
              totalPages={totalPages}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={itemsPerPage}
              filteredCount={filteredAndSortedApplicants.length}
              StageName={StageName}
            />
          )}

          {activeTab === 'statistics' && (
            <InterviewStatisticsTab 
              statistics={statistics} 
              handleExport={handleExport} 
              isExporting={isExporting} 
            />
          )}
        </div>

        {/* 우측 드로어 */}
        <ApplicantDetailDrawer 
          isOpen={rightDrawerOpen} 
          onClose={() => setRightDrawerOpen(false)} 
          applicant={selectedRowApplicant} 
          handleViewDetails={handleViewDetails} 
          handleReAnalyze={handleReAnalyze} 
        />

        {/* 일괄 관리 모달 */}
        <BatchActionModal 
          isOpen={showBatchModal} 
          onClose={() => setShowBatchModal(false)} 
          step={batchModalStep} 
          setStep={setBatchModalStep} 
          statistics={statistics} 
          batchModalData={batchModalData} 
          setBatchModalData={setBatchModalData} 
          paginatedApplicants={paginatedApplicants} 
          handleConfirm={async () => {
            try {
              await handleClosePracticalInterview();
              setShowBatchModal(false);
              setBatchModalStep(1);
              showToast('실무진 면접이 성공적으로 마감되었습니다.');
            } catch (error) {
              showToast('마감 중 오류가 발생했습니다.', 'error');
            }
          }}
          StageName={StageName}
        />

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