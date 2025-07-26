import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../layout/Layout';
import ViewPostSidebar from '../components/ViewPostSidebar';
import ApplicantDetailModal from '../components/ApplicantDetailModal';
import { 
  MdDownload, MdPrint, MdMoreVert, MdDescription, MdQuestionAnswer, MdAssessment, 
  MdPerson, MdTrendingUp, MdTrendingDown, MdAnalytics, MdStar, MdStarBorder,
  MdFilterList, MdFileDownload, MdCompare, MdInsights, MdRefresh, MdSettings
} from 'react-icons/md';
import api from '../api/api';
import AiInterviewApi from '../api/aiInterviewApi';

function InterviewReport() {
  const [aiData, setAiData] = useState(null);
  const [practicalData, setPracticalData] = useState(null);
  const [executiveData, setExecutiveData] = useState(null);
  const [finalSelectedData, setFinalSelectedData] = useState(null);
  const [jobPostData, setJobPostData] = useState(null);
  const [loadingText, setLoadingText] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filterScore, setFilterScore] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const loadingInterval = useRef(null);
  const refreshInterval = useRef(null);
  const fullText = "면접 보고서 생성 중입니다...";
  const [searchParams] = useSearchParams();
  const jobPostId = searchParams.get("job_post_id");

  // AI 인사이트 데이터 가져오기
  const fetchAiInsights = async () => {
    try {
      const response = await api.get(`/interview-evaluation/job-post/${jobPostId}/ai-insights`);
      setAiInsights(response.data);
      console.log("🤖 AI 인사이트 데이터:", response.data);
    } catch (error) {
      console.error('AI 인사이트 조회 실패:', error);
      setAiInsights(null);
    }
  };

  // 비교 분석 데이터 가져오기
  const fetchCompareData = async () => {
    try {
      const response = await api.get(`/interview-evaluation/job-post/${jobPostId}/comparison-analysis`);
      setCompareData(response.data);
      console.log("📊 비교 분석 데이터:", response.data);
    } catch (error) {
      console.error('비교 데이터 조회 실패:', error);
      setCompareData(null);
    }
  };

  // PDF 다운로드 함수 추가
  const handleDownload = () => {
    const token = localStorage.getItem('token');
    const url = `/api/v1/report/interview/pdf?job_post_id=${jobPostId}`;
    
    // 새 창에서 PDF 다운로드
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>PDF 다운로드 중...</title>
          <style>
            body { background: #f9fafb; margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
            .msg { font-size: 26px; font-weight: 800; color: #2563eb; margin-bottom: 8px; text-align: center; letter-spacing: 1px; min-height: 40px; }
            .sub { font-size: 16px; color: #64748b; text-align: center; }
          </style>
          </head>
          <body>
            <div class="container">
              <div class="msg" id="loadingMsg"></div>
              <div class="sub">잠시만 기다려 주세요.</div>
            </div>
            <script>
               const fullText = '면접보고서 PDF 생성 중입니다...';
               let i = 0;
               function typeText() {
                 document.getElementById('loadingMsg').innerText = fullText.slice(0, i + 1);
                 i++;
                 if (i > fullText.length) i = 0;
                 setTimeout(typeText, 150);
               }
               typeText();
              fetch('${url}', {
                headers: {
                  'Authorization': 'Bearer ${token}'
                }
              })
              .then(response => response.blob())
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '면접전형_보고서.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                window.close();
              })
              .catch(error => {
                console.error('PDF 다운로드 실패:', error);
                document.body.innerHTML = '<div class="container"><div class="msg" style="color:#ef4444">PDF 다운로드 실패</div><div class="sub">다시 시도해주세요.</div></div>';
              });
            </script>
          </body>
        </html>
      `);
    }
  };

  // 실시간 데이터 업데이트
  useEffect(() => {
    if (autoRefresh) {
      refreshInterval.current = setInterval(() => {
        console.log("🔄 실시간 데이터 업데이트 중...");
        fetchData();
      }, 30000); // 30초마다 업데이트
    } else {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [autoRefresh, jobPostId]);

  const fetchData = () => {
    if (jobPostId) {
      // AI 면접 데이터 조회
      AiInterviewApi.getAiInterviewEvaluationsByJobPost(jobPostId)
        .then(setAiData)
        .catch((e) => {
          console.error("AI 면접 데이터 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          setAiData({ evaluations: [], total_evaluations: 0 });
        });

      // 실무진 면접 데이터 조회
      api.get(`/interview-evaluation/job-post/${jobPostId}/practical`)
        .then((res) => setPracticalData(res.data))
        .catch((e) => {
          console.error("실무진 면접 데이터 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          setPracticalData({ evaluations: [], total_evaluations: 0 });
        });

      // 임원진 면접 데이터 조회
      api.get(`/interview-evaluation/job-post/${jobPostId}/executive`)
        .then((res) => setExecutiveData(res.data))
        .catch((e) => {
          console.error("임원진 면접 데이터 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          setExecutiveData({ evaluations: [], total_evaluations: 0 });
        });

      // 최종 선발된 지원자들 조회 (final_status = 'SELECTED')
      api.get(`/interview-evaluation/job-post/${jobPostId}/final-selected`)
        .then((res) => {
          console.log("🔥 최종 선발자 데이터:", res.data);
          setFinalSelectedData(res.data);
        })
        .catch((e) => {
          console.error("최종 선발자 데이터 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          setFinalSelectedData({ evaluations: [], total_evaluations: 0 });
        });

      // 공고 정보 조회
      api.get(`/company/jobposts/${jobPostId}`)
        .then((res) => {
          console.log("🔥 공고 정보:", res.data);
          setJobPostData(res.data);
        })
        .catch((e) => {
          console.error("공고 정보 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          setJobPostData({ title: "공고 정보 없음" });
        });
    }
  };

  // CSV 내보내기
  const exportToCSV = () => {
    if (!finalSelectedData?.evaluations) return;
    
    const headers = ['순위', '지원자명', 'AI면접', '실무진면접', '임원진면접', '종합점수', '평가코멘트'];
    const csvContent = [
      headers.join(','),
      ...finalSelectedData.evaluations.map((applicant, index) => [
        index + 1,
        applicant.applicant_name,
        applicant.ai_interview_score || 0,
        applicant.practical_score || 0,
        applicant.executive_score || 0,
        applicant.final_score || 0,
        `"${(applicant.evaluation_comment || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `면접보고서_${jobPostData?.title || '공고'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel 내보내기 (간단한 HTML 테이블 형태)
  const exportToExcel = () => {
    if (!finalSelectedData?.evaluations) return;
    
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>순위</th>
          <th>지원자명</th>
          <th>AI면접</th>
          <th>실무진면접</th>
          <th>임원진면접</th>
          <th>종합점수</th>
          <th>평가코멘트</th>
        </tr>
      </thead>
      <tbody>
        ${finalSelectedData.evaluations.map((applicant, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${applicant.applicant_name}</td>
            <td>${applicant.ai_interview_score || 0}</td>
            <td>${applicant.practical_score || 0}</td>
            <td>${applicant.executive_score || 0}</td>
            <td>${applicant.final_score || 0}</td>
            <td>${applicant.evaluation_comment || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>면접보고서_${jobPostData?.title || '공고'}</title>
        </head>
        <body>
          <h1>면접 보고서 - ${jobPostData?.title || '공고'}</h1>
          <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
          ${table.outerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `면접보고서_${jobPostData?.title || '공고'}_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!aiData || !practicalData || !executiveData || !finalSelectedData || !jobPostData) {
      setLoadingText("");
      let i = 0;
      if (loadingInterval.current) clearInterval(loadingInterval.current);
      loadingInterval.current = setInterval(() => {
        setLoadingText(fullText.slice(0, i + 1));
        i++;
        if (i > fullText.length) i = 0;
      }, 120);
      return () => clearInterval(loadingInterval.current);
    }
  }, [aiData, practicalData, executiveData, finalSelectedData, jobPostData]);

  useEffect(() => {
    if (jobPostId) {
      // AI 면접 데이터 조회
      AiInterviewApi.getAiInterviewEvaluationsByJobPost(jobPostId)
        .then(setAiData)
        .catch((e) => {
          console.error("AI 면접 데이터 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          setAiData({ evaluations: [], total_evaluations: 0 });
        });

      // 실무진 면접 데이터 조회
      api.get(`/interview-evaluation/job-post/${jobPostId}/practical`)
        .then((res) => setPracticalData(res.data))
        .catch((e) => {
          console.error("실무진 면접 데이터 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          setPracticalData({ evaluations: [], total_evaluations: 0 });
        });

      // 임원진 면접 데이터 조회
      api.get(`/interview-evaluation/job-post/${jobPostId}/executive`)
        .then((res) => setExecutiveData(res.data))
        .catch((e) => {
          console.error("임원진 면접 데이터 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          setExecutiveData({ evaluations: [], total_evaluations: 0 });
        });

      // 최종 선발된 지원자들 조회 (final_status = 'SELECTED')
      api.get(`/interview-evaluation/job-post/${jobPostId}/final-selected`)
        .then((res) => {
          console.log("🔥 최종 선발자 데이터:", res.data);
          setFinalSelectedData(res.data);
        })
        .catch((e) => {
          console.error("최종 선발자 데이터 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          // 에러가 발생해도 빈 배열로 초기화하여 UI가 깨지지 않도록 함
          setFinalSelectedData({ evaluations: [], total_evaluations: 0 });
        });

      // 공고 정보 조회
      api.get(`/company/jobposts/${jobPostId}`)
        .then((res) => {
          console.log("🔥 공고 정보:", res.data);
          setJobPostData(res.data);
        })
        .catch((e) => {
          console.error("공고 정보 조회 실패:", e);
          console.error("에러 상세:", e.response?.data);
          setJobPostData({ title: "공고 정보 없음" });
        });
    }
  }, [jobPostId]);

  const handleApplicantClick = (applicant) => {
    setSelectedApplicant(applicant);
    setShowModal(true);
    setShowDropdown(null);
  };

  const handleDropdownClick = (e, applicantId) => {
    e.stopPropagation();
    setShowDropdown(showDropdown === applicantId ? null : applicantId);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedApplicant(null);
  };

  if (!aiData || !practicalData || !executiveData || !finalSelectedData || !jobPostData) {
    return (
      <Layout>
        <ViewPostSidebar jobPost={jobPostData} />
        <div className="min-h-[70vh] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-lg mx-auto max-w-4xl my-10">
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-8 text-center tracking-wide min-h-10">
            {loadingText}
          </div>
          <div className="text-lg text-gray-600 dark:text-gray-400 text-center">잠시만 기다려 주세요.</div>
        </div>
      </Layout>
    );
  }

  // 데이터 처리
  const aiPassed = (aiData.evaluations || []).filter(e => e.passed);
  const aiRejected = (aiData.evaluations || []).filter(e => !e.passed);
  const practicalPassed = (practicalData.evaluations || []).filter(e => e.total_score >= 70);
  const practicalRejected = (practicalData.evaluations || []).filter(e => e.total_score < 70);
  const executivePassed = (executiveData.evaluations || []).filter(e => e.total_score >= 75);
  const executiveRejected = (executiveData.evaluations || []).filter(e => e.total_score < 75);

  // 최종 합격자 (final_status = 'SELECTED'인 지원자들)
  const finalPassed = finalSelectedData.evaluations || [];
  
  // 디버깅을 위한 상세 로그
  console.log("📊 상세 데이터 분석:");
  console.log("- AI 면접 합격자:", aiPassed.length, "명");
  console.log("- AI 면접 불합격자:", aiRejected.length, "명");
  console.log("- 실무진 면접 합격자:", practicalPassed.length, "명");
  console.log("- 실무진 면접 불합격자:", practicalRejected.length, "명");
  console.log("- 임원진 면접 합격자:", executivePassed.length, "명");
  console.log("- 임원진 면접 불합격자:", executiveRejected.length, "명");
  console.log("- 최종 선발자:", finalPassed.length, "명");
  
  console.log("🔥 데이터 처리 결과:");
  console.log("- aiData:", aiData);
  console.log("- practicalData:", practicalData);
  console.log("- executiveData:", executiveData);
  console.log("- finalSelectedData:", finalSelectedData);
  console.log("- finalPassed:", finalPassed);

  // 통계 계산
  const totalApplicants = aiData.total_evaluations || 0;
  const aiPassRate = totalApplicants > 0 ? ((aiPassed.length / totalApplicants) * 100).toFixed(1) : 0;
  const practicalPassRate = practicalData.evaluations?.length > 0 ? ((practicalPassed.length / practicalData.evaluations.length) * 100).toFixed(1) : 0;
  const executivePassRate = executiveData.evaluations?.length > 0 ? ((executivePassed.length / executiveData.evaluations.length) * 100).toFixed(1) : 0;
  const finalPassRate = totalApplicants > 0 ? ((finalPassed.length / totalApplicants) * 100).toFixed(1) : 0;

  // 추가 통계 계산 (DocumentReport 스타일)
  const allScores = [
    ...(aiData.evaluations || []).map(e => e.total_score || 0),
    ...(practicalData.evaluations || []).map(e => e.total_score || 0),
    ...(executiveData.evaluations || []).map(e => e.total_score || 0)
  ].filter(score => score > 0);

  const avgScore = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : 0;
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;
  const minScore = allScores.length > 0 ? Math.min(...allScores) : 0;

  // 탈락 사유 분석 (가상 데이터)
  const rejectionReasons = [
    "기술 역량 부족",
    "의사소통 능력 미흡", 
    "팀워크 부족"
  ];

  return (
    <Layout>
      <ViewPostSidebar jobPost={jobPostData} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4" style={{ marginLeft: 90 }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  면접 보고서
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  {jobPostData.title} - {new Date().toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                >
                  <MdDownload size={20} />
                  PDF 다운로드
                </button>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    showFilters 
                      ? 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-800'
                      : 'bg-gray-600 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-800'
                  }`}
                >
                  <MdFilterList size={20} />
                  필터
                </button>
                <button 
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    autoRefresh 
                      ? 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-800'
                      : 'bg-gray-600 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-800'
                  }`}
                >
                  <MdRefresh size={20} />
                  {autoRefresh ? '실시간 ON' : '실시간 OFF'}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors">
                  <MdPrint size={20} />
                  인쇄
                </button>
              </div>
            </div>

            {/* 고급 기능 버튼들 */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex gap-2">
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-800 transition-colors text-sm"
                >
                  <MdFileDownload size={16} />
                  CSV 내보내기
                </button>
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-800 transition-colors text-sm"
                >
                  <MdFileDownload size={16} />
                  Excel 내보내기
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setCompareMode(!compareMode);
                    if (!compareMode && !compareData) {
                      fetchCompareData();
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    compareMode 
                      ? 'bg-orange-600 dark:bg-orange-700 text-white hover:bg-orange-700 dark:hover:bg-orange-800'
                      : 'bg-gray-500 dark:bg-gray-600 text-white hover:bg-gray-600 dark:hover:bg-gray-700'
                  }`}
                >
                  <MdCompare size={16} />
                  비교 분석
                </button>
                <button 
                  onClick={() => {
                    setShowAiInsights(!showAiInsights);
                    if (!showAiInsights && !aiInsights) {
                      fetchAiInsights();
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    showAiInsights 
                      ? 'bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-800'
                      : 'bg-gray-500 dark:bg-gray-600 text-white hover:bg-gray-600 dark:hover:bg-gray-700'
                  }`}
                >
                  <MdInsights size={16} />
                  AI 인사이트
                </button>
              </div>
            </div>

            {/* 필터링 옵션 */}
            {showFilters && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">필터링 옵션</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최소 점수
                    </label>
                    <input
                      type="number"
                      value={filterScore}
                      onChange={(e) => setFilterScore(e.target.value)}
                      placeholder="점수 입력"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      면접 단계
                    </label>
                    <select
                      value={filterStage}
                      onChange={(e) => setFilterStage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="all">전체</option>
                      <option value="ai">AI 면접</option>
                      <option value="practical">실무진 면접</option>
                      <option value="executive">임원진 면접</option>
                      <option value="final">최종 선발</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={() => {
                        setFilterScore('');
                        setFilterStage('all');
                      }}
                      className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
                    >
                      필터 초기화
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Executive Summary */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <MdPerson className="text-blue-600 dark:text-blue-400" size={20} />
                  <span className="font-semibold text-blue-900 dark:text-blue-100">총 지원자</span>
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalApplicants}명</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <MdTrendingUp className="text-green-600 dark:text-green-400" size={20} />
                  <span className="font-semibold text-green-900 dark:text-green-100">최종 합격자</span>
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">{finalPassed.length}명</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <MdTrendingDown className="text-orange-600 dark:text-orange-400" size={20} />
                  <span className="font-semibold text-orange-900 dark:text-orange-100">최종 합격률</span>
                </div>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{finalPassRate}%</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-purple-900 dark:text-purple-100">모집 인원</span>
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{jobPostData.headcount || 0}명</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-2 mb-2">
                  <MdAnalytics className="text-indigo-600 dark:text-indigo-400" size={20} />
                  <span className="font-semibold text-indigo-900 dark:text-indigo-100">평균 점수</span>
                </div>
                <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{avgScore}점</div>
              </div>
            </div>

            {/* 추가 통계 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <MdStar className="text-emerald-600 dark:text-emerald-400" size={20} />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-100">최고점</span>
                </div>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{maxScore}점</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <MdStarBorder className="text-red-600 dark:text-red-400" size={20} />
                  <span className="font-semibold text-red-900 dark:text-red-100">최저점</span>
                </div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">{minScore}점</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-yellow-900 dark:text-yellow-100">점수 범위</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{maxScore - minScore}점</div>
              </div>
            </div>
          </div>

          {/* Section 1: 전형 단계별 결과 요약 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">1. 전형 단계별 결과 요약</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI 면접</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">총 평가자</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{aiPassed.length + aiRejected.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">합격자</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{aiPassed.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">불합격자</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{aiRejected.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">합격률</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{aiPassRate}%</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">실무진 면접</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">총 평가자</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{practicalPassed.length + practicalRejected.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">합격자</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{practicalPassed.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">불합격자</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{practicalRejected.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">합격률</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{practicalPassRate}%</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">임원진 면접</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">총 평가자</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{executivePassed.length + executiveRejected.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">합격자</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{executivePassed.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">불합격자</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{executiveRejected.length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">합격률</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{executivePassRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 탈락 사유 분석 섹션 추가 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">탈락 사유 Top 3</h2>
            <div className="flex flex-wrap gap-4">
              {rejectionReasons.map((reason, index) => (
                <div 
                  key={index} 
                  className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg px-6 py-3 font-semibold text-lg border border-red-200 dark:border-red-800 shadow-sm"
                >
                  {reason}
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">📊 탈락 패턴 분석</h3>
              <p className="text-blue-800 dark:text-blue-200">
                면접 과정에서 가장 빈번하게 나타난 탈락 사유는 <strong>기술 역량 부족</strong>이었으며, 
                이는 향후 지원자 선발 시 기술 역량 평가를 더욱 강화할 필요가 있음을 시사합니다.
              </p>
            </div>
          </div>

          {/* Section 2: 최종 합격자 상세 분석 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">2. 최종 합격자 상세 분석</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">순위</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">지원자명</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">AI 면접</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">실무진 면접</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">임원진 면접</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">종합 점수</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">평가 코멘트</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">상세 정보</th>
                  </tr>
                </thead>
                <tbody>
                  {finalPassed.map((applicant, index) => {
                    const finalScore = applicant.final_score || 0;
                    
                    return (
                      <tr key={applicant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleApplicantClick(applicant)}>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-semibold text-gray-900 dark:text-white">{index + 1}</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium text-gray-900 dark:text-white">{applicant.applicant_name}</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">{applicant.ai_interview_score || 0}점</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">{applicant.practical_score || 0}점</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">{applicant.executive_score || 0}점</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">{finalScore}점</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-700 dark:text-gray-300 text-sm">
                          {applicant.evaluation_comment || "우수한 기술 역량과 의사소통 능력을 보여주었습니다."}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 relative">
                          <button
                            onClick={(e) => handleDropdownClick(e, applicant.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-900 dark:text-white"
                          >
                            <MdMoreVert size={20} />
                          </button>
                          {showDropdown === applicant.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-48">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApplicant(applicant);
                                  setShowModal(true);
                                  setShowDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                              >
                                <MdDescription size={16} />
                                이력서
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApplicant(applicant);
                                  setShowModal(true);
                                  setShowDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                              >
                                <MdQuestionAnswer size={16} />
                                면접 문답
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApplicant(applicant);
                                  setShowModal(true);
                                  setShowDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                              >
                                <MdAssessment size={16} />
                                면접평가서
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: 평가 항목별 점수 분석 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">3. 평가 항목별 점수 분석</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI 면접 평가 항목</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-900 dark:text-white">음성 분석</span>
                    <span className="font-semibold text-gray-900 dark:text-white">평균 4.2점</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-900 dark:text-white">영상 분석</span>
                    <span className="font-semibold text-gray-900 dark:text-white">평균 4.1점</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-900 dark:text-white">기술 역량</span>
                    <span className="font-semibold text-gray-900 dark:text-white">평균 4.3점</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">면접관 면접 평가 항목</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-900 dark:text-white">전문성</span>
                    <span className="font-semibold text-gray-900 dark:text-white">평균 4.4점</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-900 dark:text-white">의사소통 능력</span>
                    <span className="font-semibold text-gray-900 dark:text-white">평균 4.2점</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-900 dark:text-white">팀워크</span>
                    <span className="font-semibold text-gray-900 dark:text-white">평균 4.0점</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: 종합 추천 및 의견 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">4. 종합 추천 및 의견</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">최종 추천 상태</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="font-semibold text-green-800 dark:text-green-200">추천</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{finalPassed.length}명</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="font-semibold text-yellow-800 dark:text-yellow-200">고려</div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">0명</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="font-semibold text-red-800 dark:text-red-200">비추천</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalApplicants - finalPassed.length}명</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">후속 조치 제안</h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li>• 최종 합격자 {finalPassed.length}명에 대한 입사 확정 절차 진행</li>
                  <li>• 입사 전 사전 교육 프로그램 참여 권장</li>
                  <li>• 팀 배치 시 각자의 강점을 고려한 배치 검토</li>
                  <li>• 정기적인 성과 평가 및 피드백 시스템 구축</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 5: 보고자 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">5. 보고자 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">작성자</h3>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <div><span className="font-medium">이름:</span> 홍유정</div>
                  <div><span className="font-medium">직책:</span> 인사팀장</div>
                  <div><span className="font-medium">연락처:</span> hyj_hr@company.com</div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">작성 정보</h3>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <div><span className="font-medium">작성일:</span> {new Date().toLocaleDateString('ko-KR')}</div>
                  <div><span className="font-medium">검토자:</span> 인사팀장</div>
                  <div><span className="font-medium">승인자:</span> 대표이사</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: AI 인사이트 및 패턴 분석 */}
          {showAiInsights && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">6. AI 인사이트 및 패턴 분석</h2>
              
              {aiInsights ? (
                <div className="space-y-8">
                  {/* 점수 분석 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">AI 면접 분석</h4>
                      <div className="space-y-1 text-blue-800 dark:text-blue-200 text-sm">
                        <div>평균: <strong>{aiInsights.score_analysis.ai.mean.toFixed(1)}점</strong></div>
                        <div>표준편차: <strong>{aiInsights.score_analysis.ai.std.toFixed(1)}</strong></div>
                        <div>범위: <strong>{aiInsights.score_analysis.ai.min.toFixed(1)}~{aiInsights.score_analysis.ai.max.toFixed(1)}점</strong></div>
                        <div>총 평가: <strong>{aiInsights.score_analysis.ai.count}명</strong></div>
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">실무진 면접 분석</h4>
                      <div className="space-y-1 text-green-800 dark:text-green-200 text-sm">
                        <div>평균: <strong>{aiInsights.score_analysis.practical.mean.toFixed(1)}점</strong></div>
                        <div>표준편차: <strong>{aiInsights.score_analysis.practical.std.toFixed(1)}</strong></div>
                        <div>범위: <strong>{aiInsights.score_analysis.practical.min.toFixed(1)}~{aiInsights.score_analysis.practical.max.toFixed(1)}점</strong></div>
                        <div>총 평가: <strong>{aiInsights.score_analysis.practical.count}명</strong></div>
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">임원진 면접 분석</h4>
                      <div className="space-y-1 text-purple-800 dark:text-purple-200 text-sm">
                        <div>평균: <strong>{aiInsights.score_analysis.executive.mean.toFixed(1)}점</strong></div>
                        <div>표준편차: <strong>{aiInsights.score_analysis.executive.std.toFixed(1)}</strong></div>
                        <div>범위: <strong>{aiInsights.score_analysis.executive.min.toFixed(1)}~{aiInsights.score_analysis.executive.max.toFixed(1)}점</strong></div>
                        <div>총 평가: <strong>{aiInsights.score_analysis.executive.count}명</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* 상관관계 분석 */}
                  {Object.keys(aiInsights.correlation_analysis).length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">상관관계 분석</h4>
                      <div className="space-y-2 text-yellow-800 dark:text-yellow-200 text-sm">
                        {aiInsights.correlation_analysis.ai_practical && (
                          <div>
                            AI vs 실무진 면접 상관계수: <strong>{(aiInsights.correlation_analysis.ai_practical * 100).toFixed(1)}%</strong>
                            <span className="ml-2 text-yellow-600 dark:text-yellow-300">
                              {Math.abs(aiInsights.correlation_analysis.ai_practical) > 0.7 ? '→ 매우 높은 상관관계' :
                               Math.abs(aiInsights.correlation_analysis.ai_practical) > 0.4 ? '→ 보통 상관관계' :
                               '→ 낮은 상관관계'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 트렌드 분석 */}
                  {Object.keys(aiInsights.trend_analysis).length > 0 && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">트렌드 분석</h4>
                      <div className="space-y-2 text-indigo-800 dark:text-indigo-200 text-sm">
                        {aiInsights.trend_analysis.ai_trend && (
                          <div>AI 면접 트렌드: <strong>{aiInsights.trend_analysis.ai_trend}</strong></div>
                        )}
                        {aiInsights.trend_analysis.practical_trend && (
                          <div>실무진 면접 트렌드: <strong>{aiInsights.trend_analysis.practical_trend}</strong></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI 추천사항 */}
                  {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4">🤖 AI 추천사항</h4>
                      <div className="space-y-3">
                        {aiInsights.recommendations.map((rec, index) => (
                          <div key={index} className={`p-4 rounded-lg border ${
                            rec.priority === 'high' 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                          }`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                rec.priority === 'high' ? 'bg-red-500' : 'bg-orange-500'
                              }`}></div>
                              <div className="flex-1">
                                <h5 className={`font-semibold mb-1 ${
                                  rec.priority === 'high' 
                                    ? 'text-red-900 dark:text-red-100'
                                    : 'text-orange-900 dark:text-orange-100'
                                }`}>
                                  {rec.title}
                                </h5>
                                <p className={`text-sm mb-2 ${
                                  rec.priority === 'high' 
                                    ? 'text-red-800 dark:text-red-200'
                                    : 'text-orange-800 dark:text-orange-200'
                                }`}>
                                  {rec.description}
                                </p>
                                <p className={`text-sm font-medium ${
                                  rec.priority === 'high' 
                                    ? 'text-red-700 dark:text-red-300'
                                    : 'text-orange-700 dark:text-orange-300'
                                }`}>
                                  💡 {rec.action}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 예측 분석 */}
                  {aiInsights.predictions && Object.keys(aiInsights.predictions).length > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">예측 분석</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-emerald-800 dark:text-emerald-200 text-sm">
                        {aiInsights.predictions.model_accuracy !== undefined && (
                          <div>
                            <strong>모델 정확도:</strong> {(aiInsights.predictions.model_accuracy * 100).toFixed(1)}%
                          </div>
                        )}
                        {aiInsights.predictions.prediction_confidence && (
                          <div>
                            <strong>예측 신뢰도:</strong> {aiInsights.predictions.prediction_confidence}
                          </div>
                        )}
                        {aiInsights.predictions.performance_index && (
                          <div>
                            <strong>성과 지수:</strong> {aiInsights.predictions.performance_index}/10
                          </div>
                        )}
                        {aiInsights.predictions.team_adaptation_rate && (
                          <div>
                            <strong>팀 적응도:</strong> {aiInsights.predictions.team_adaptation_rate}%
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">AI 인사이트 분석 중...</p>
                </div>
              )}
            </div>
          )}

          {/* 비교 분석 결과 */}
          {compareMode && compareData && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 다른 채용공고와의 비교 분석</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{finalPassRate}%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">현재 공고 합격률</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {compareData.length > 0 ? ((compareData.reduce((sum, post) => sum + (post.final_selected_count || 0), 0) / compareData.length) / (compareData.reduce((sum, post) => sum + (post.applicant_count || 0), 0) / compareData.length) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">평균 합격률</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {compareData.length}개
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">비교 대상 공고</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Applicant Detail Modal */}
      <ApplicantDetailModal
        isOpen={showModal}
        onClose={handleModalClose}
        applicant={selectedApplicant}
        jobPostId={jobPostId}
      />
    </Layout>
  );
}

export default InterviewReport; 