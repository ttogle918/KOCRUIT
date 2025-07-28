import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import { useSearchParams } from "react-router-dom";
import ApplicantTestDetailModal from "../components/ApplicantTestDetailModal";
import { getReportCache, setReportCache, clearReportCache } from "../utils/reportCache";
import Layout from "../layout/Layout";
import ViewPostSidebar from "../components/ViewPostSidebar";
import { MdRefresh, MdCached, MdExpandMore, MdExpandLess, MdAnalytics, MdAssessment, MdTrendingUp, MdBarChart } from 'react-icons/md';

function JobAptitudeReport() {
  const [data, setData] = useState(null);
  const [failedApplicants, setFailedApplicants] = useState([]);
  const [loadingText, setLoadingText] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllPassed, setShowAllPassed] = useState(false);
  const [showAllFailed, setShowAllFailed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const loadingInterval = useRef(null);
  const fullText = "직무적성평가 보고서 생성 중입니다...";
  const [searchParams] = useSearchParams();
  const jobPostId = searchParams.get("job_post_id");

  // 점수분포 히스토그램 데이터 생성 함수
  const generateScoreHistogram = () => {
    // 합격자와 불합격자 데이터 모두 수집
    const passedScores = data?.stats?.passed_applicants?.map(app => app.written_score).filter(score => score !== null && score !== undefined) || [];
    const failedScores = failedApplicants?.map(app => app.written_test_score).filter(score => score !== null && score !== undefined) || [];
    
    // 전체 점수 데이터
    const allScores = [...passedScores, ...failedScores];
    
    if (allScores.length === 0) return [];
    
    // 0.5 단위로 10개 범위 생성 (0.0-5.0점)
    const scoreRanges = [];
    for (let i = 0; i < 10; i++) {
      const min = i * 0.5;
      const max = (i + 1) * 0.5;
      const label = `${min.toFixed(1)}-${max.toFixed(1)}점`;
      
      // 색상 그라데이션 (낮은 점수: 빨간색, 높은 점수: 녹색)
      const ratio = i / 9; // 0~1 사이 값
      const color = ratio < 0.5 
        ? `hsl(${120 - ratio * 120}, 70%, ${50 + ratio * 20}%)` // 빨간색에서 노란색
        : `hsl(${(1 - ratio) * 120}, 70%, ${50 + (1 - ratio) * 20}%)`; // 노란색에서 녹색
      
      scoreRanges.push({
        min: min,
        max: max,
        label: label,
        color: color
      });
    }
    
    return scoreRanges.map(range => {
      const passedCount = passedScores.filter(score => score >= range.min && score < range.max).length;
      const failedCount = failedScores.filter(score => score >= range.min && score < range.max).length;
      const totalCount = passedCount + failedCount;
      
      return {
        range: range.label,
        passedCount: passedCount,
        failedCount: failedCount,
        totalCount: totalCount,
        percentage: Math.round((totalCount / allScores.length) * 100),
        color: range.color,
        min: range.min,
        max: range.max
      };
    }); // 모든 범위를 표시 (빈 범위도 포함)
  };

  // 히스토그램 컴포넌트
  const ScoreHistogram = ({ data }) => {
    if (!data || data.length === 0) return null;
    
    const maxCount = Math.max(...data.map(d => d.totalCount));
    
    return (
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        padding: 32, 
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>
          📊 점수분포 히스토그램
        </h2>
        <div style={{ 
          display: 'flex', 
          alignItems: 'end', 
          gap: '8px', 
          height: '200px', 
          paddingBottom: '40px',
          minHeight: '200px'
        }}>
          {data.map((item, index) => (
            <div key={index} style={{ 
              flex: 1,
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              position: 'relative'
            }}>
              {/* 합격자 막대 (위쪽) */}
              {item.passedCount > 0 && (
                <div style={{ 
                  width: '100%', 
                  background: `linear-gradient(to top, #16a34a, #22c55e)`,
                  height: `${maxCount > 0 ? (item.passedCount / maxCount) * 160 : 4}px`,
                  minHeight: '2px',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.3s ease-in-out',
                  position: 'relative',
                  cursor: 'pointer',
                  marginBottom: '1px'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scaleY(1.05)';
                  e.target.style.boxShadow = '0 2px 8px rgba(22, 163, 74, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scaleY(1)';
                  e.target.style.boxShadow = 'none';
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#16a34a',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 10
                  }}>
                    합격 {item.passedCount}명
                  </div>
                </div>
              )}
              
              {/* 불합격자 막대 (아래쪽) */}
              {item.failedCount > 0 && (
                <div style={{ 
                  width: '100%', 
                  background: `linear-gradient(to top, #ef4444, #f97316)`,
                  height: `${maxCount > 0 ? (item.failedCount / maxCount) * 160 : 4}px`,
                  minHeight: '2px',
                  borderRadius: item.passedCount > 0 ? '0 0 4px 4px' : '4px 4px 0 0',
                  transition: 'all 0.3s ease-in-out',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scaleY(1.05)';
                  e.target.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scaleY(1)';
                  e.target.style.boxShadow = 'none';
                }}>
                  <div style={{
                    position: 'absolute',
                    top: item.passedCount > 0 ? '-25px' : '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ef4444',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 10
                  }}>
                    불합격 {item.failedCount}명
                  </div>
                </div>
              )}
              
              {/* 빈 막대 (데이터가 없는 경우) */}
              {item.totalCount === 0 && (
                <div style={{ 
                  width: '100%', 
                  background: 'linear-gradient(to top, #f3f4f6, #e5e7eb)',
                  height: '4px',
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.3
                }} />
              )}
              
              {/* x축 라벨 - 모든 막대에 표시 */}
              <div style={{ 
                marginTop: '8px', 
                fontSize: '11px', 
                color: '#6b7280', 
                textAlign: 'center',
                fontWeight: '500',
                lineHeight: '1.2'
              }}>
                {item.min.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
        
        {/* 범례 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '24px', 
          marginBottom: '16px',
          padding: '12px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              background: 'linear-gradient(to top, #16a34a, #22c55e)',
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>합격자</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              background: 'linear-gradient(to top, #ef4444, #f97316)',
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>불합격자</span>
          </div>
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '16px', 
          padding: '16px', 
          background: '#f0fdf4', 
          borderRadius: '8px',
          border: '1px solid #dcfce7'
        }}>
          <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
            총 {data.reduce((sum, item) => sum + item.totalCount, 0)}명의 응시자 중 점수분포 (0.5점 단위)
          </span>
          <div style={{ 
            fontSize: '12px', 
            color: '#059669', 
            marginTop: '4px',
            opacity: 0.8
          }}>
            합격자: {data.reduce((sum, item) => sum + item.passedCount, 0)}명, 불합격자: {data.reduce((sum, item) => sum + item.failedCount, 0)}명
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (jobPostId) {
      // 직무적성평가 보고서 데이터 조회
      axiosInstance.get(`/v1/report/job-aptitude?job_post_id=${jobPostId}`)
        .then((res) => setData(res.data))
        .catch((error) => {
          console.error('직무적성평가 보고서 데이터 조회 실패:', error);
        });
      
      // 필기불합격자 데이터 조회 - 올바른 엔드포인트로 수정
      axiosInstance.get(`/v1/written-test/failed/${jobPostId}`)
        .then((res) => setFailedApplicants(res.data))
        .catch((error) => {
          console.error('필기불합격자 데이터 조회 실패:', error);
        });
    }
  }, [jobPostId]);


  // 로딩 텍스트 애니메이션
  useEffect(() => {
    if (!data) {
      setLoadingText('');
      let i = 0;
      if (loadingInterval.current) clearInterval(loadingInterval.current);
      loadingInterval.current = setInterval(() => {
        setLoadingText(fullText.slice(0, i + 1));
        i++;
        if (i > fullText.length) i = 0;
      }, 120);
      return () => clearInterval(loadingInterval.current);
    }
  }, [data]);

  const handleDownload = () => {
    const token = localStorage.getItem('token');
    const url = `/api/v1/report/job-aptitude/pdf?job_post_id=${jobPostId}`;
    
    // 새 창에서 PDF 다운로드
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>PDF 다운로드 중...</title>
          <style>
            body { background: #f9fafb; margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
            .msg { font-size: 26px; font-weight: 800; color: #16a34a; margin-bottom: 8px; text-align: center; letter-spacing: 1px; min-height: 40px; }
            .sub { font-size: 16px; color: #64748b; text-align: center; }
          </style>
          </head>
          <body>
            <div class="container">
              <div class="msg" id="loadingMsg"></div>
              <div class="sub">잠시만 기다려 주세요.</div>
            </div>
            <script>
               const fullText = '직무적성평가 보고서 PDF 생성 중입니다...';
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
                a.download = '직무적성평가_보고서.pdf';
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

  const handleRefreshCache = async () => {
    if (window.confirm('직무적성평가 보고서 캐시를 새로고침하시겠습니까?')) {
      setIsRefreshing(true);
      clearReportCache('written', jobPostId);
      
      try {
        console.log('🌐 직무적성평가 보고서 API 재호출');
        const response = await axiosInstance.get(`/report/job-aptitude?job_post_id=${jobPostId}`);
        setData(response.data);

        // 필기불합격자 데이터 조회
        const failedResponse = await axiosInstance.get(`/written-test/failed/${jobPostId}`);
        setFailedApplicants(failedResponse.data);

        // 캐시에 저장 (두 데이터를 함께 저장)
        setReportCache('written', jobPostId, {
          data: response.data,
          failedApplicants: failedResponse.data
        });
        console.log('✅ 직무적성평가 보고서 캐시 새로고침 완료');
      } catch (error) {
        console.error('직무적성평가 보고서 캐시 새로고침 실패:', error);
        alert('캐시 새로고침에 실패했습니다.');
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // 지원자 클릭 핸들러
  const handleApplicantClick = (applicantId) => {
    setSelectedApplicantId(applicantId);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedApplicantId(null);
  };

  useEffect(() => {
    if (jobPostId) {
      // 먼저 캐시에서 데이터 확인
      const cachedData = getReportCache('written', jobPostId);
      if (cachedData) {
        console.log('📦 직무적성평가 보고서 캐시 데이터 사용');
        setData(cachedData.data);
        setFailedApplicants(cachedData.failedApplicants || []);
        return;
      }

      // 캐시에 없으면 API 호출
      console.log('🌐 직무적성평가 보고서 API 호출');

      // 직무적성평가 보고서 데이터 조회
      axiosInstance.get(`/report/job-aptitude?job_post_id=${jobPostId}`)
        .then((res) => {
          setData(res.data);

          // 필기불합격자 데이터 조회
          axiosInstance.get(`/written-test/failed/${jobPostId}`)
            .then((failedRes) => {
              setFailedApplicants(failedRes.data);
              // 캐시에 저장 (두 데이터를 함께 저장)
              setReportCache('written', jobPostId, {
                data: res.data,
                failedApplicants: failedRes.data
              });
            })
            .catch((error) => {
              console.error('필기불합격자 데이터 조회 실패:', error);
              // 메인 데이터만 캐시에 저장
              setReportCache('written', jobPostId, {
                data: res.data,
                failedApplicants: []
              });
            });
        })
        .catch((error) => {
          console.error('직무적성평가 보고서 데이터 조회 실패:', error);
        });
    }
  }, [jobPostId]);

  if (!data) return (
    <Layout>
      <ViewPostSidebar jobPost={jobPostId ? { id: jobPostId } : null} />
      <div style={{
        minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#f9fafb', borderRadius: 18, boxShadow: '0 4px 24px #e0e7ef', margin: '40px auto', maxWidth: 900
      }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginBottom: 8, textAlign: 'center', letterSpacing: 1, minHeight: 40 }}>
          {loadingText}
        </div>
        <div style={{ fontSize: 16, color: '#64748b', textAlign: 'center' }}>
          잠시만 기다려 주세요.
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <ViewPostSidebar jobPost={data?.job_post ? { id: jobPostId, ...data.job_post } : (jobPostId ? { id: jobPostId } : null)} />
      <div style={{
        background: '#f9fafb', borderRadius: 18, boxShadow: '0 4px 24px #e0e7ef', margin: '40px auto', maxWidth: 900, padding: '40px'
      }}>
        <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h2 style={{ fontWeight: 800, fontSize: 30, color: '#2563eb', letterSpacing: '-1px' }}>
              {data?.job_post?.title} <span style={{ color: '#64748b', fontWeight: 600, fontSize: 20 }}>- 직무적성평가 보고서</span>
            </h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleRefreshCache}
                disabled={isRefreshing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                  background: isRefreshing ? '#9ca3af' : '#6b7280', color: 'white',
                  border: 'none', borderRadius: 8, cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 500, transition: 'background-color 0.2s'
                }}
                title="캐시 새로고침"
              >
                <MdCached size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                {isRefreshing ? '새로고침 중...' : '캐시 새로고침'}
              </button>
              <button
                onClick={handleDownload}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                  background: '#16a34a', color: 'white', border: 'none', borderRadius: 8,
                  cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'background-color 0.2s'
                }}
              >
                <MdRefresh size={16} />
                PDF 다운로드
              </button>
            </div>
          </div>
          <div style={{ color: '#64748b', fontSize: 16, marginBottom: 4 }}>
            모집 기간: <b>{data?.job_post?.start_date}</b> ~ <b>{data?.job_post?.end_date}</b>
          </div>
          <div style={{ color: '#64748b', fontSize: 16 }}>
            모집 부서: <b>{typeof data?.job_post?.department === 'object' && data?.job_post?.department !== null ? (data?.job_post?.department?.name || JSON.stringify(data?.job_post?.department)) : (data?.job_post?.department || '')}</b>
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
            직무: <b>{typeof data?.job_post?.position === 'object' && data?.job_post?.position !== null ? (data?.job_post?.position?.name || JSON.stringify(data?.job_post?.position)) : (data?.job_post?.position || '')}</b>
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
            채용 인원: <b>{data?.job_post?.recruit_count}명</b>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', margin: 0 }}>
            직무적성평가 보고서
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCurrentPage(1)}
              style={{
                padding: '8px 16px',
                background: currentPage === 1 ? '#2563eb' : '#f3f4f6',
                color: currentPage === 1 ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              1페이지
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              style={{
                padding: '8px 16px',
                background: currentPage === 2 ? '#2563eb' : '#f3f4f6',
                color: currentPage === 2 ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              2페이지
            </button>
          </div>
        </div>

        {/* 1페이지: 기본 정보 및 명단 */}
        {currentPage === 1 && (
          <>
            <div style={{ background: 'white', borderRadius: 12, padding: 32, marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
                📊 직무적성평가 개요
              </h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'nowrap' }}>
                <div style={{ flex: 1, background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>합격자 수 / 응시자 수</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                    {data?.stats?.passed_applicants_count || 0}명 / {data?.stats?.total_written_applicants || 0}명
                  </div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>전체 평균 점수</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                    {data?.stats?.total_average_score || 0}점
                  </div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>커트라인 점수</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                    {data?.stats?.cutoff_score || 0}점
                  </div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>합격률</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                    {data?.stats?.pass_rate || 0}%
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 1페이지: 기본 정보 및 명단 */}
        {currentPage === 1 && (
          <>
            <div style={{ background: 'white', borderRadius: 12, padding: 32, marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
                🎯 필기합격자 상세 분석
              </h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'nowrap' }}>
                {data?.stats?.written_analysis?.map((analysis, index) => (
                  <div key={index} style={{ flex: 1, background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>
                      {analysis.category}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                      {analysis.score}{analysis.category === '합격률' ? '%' : analysis.category === '표준편차' ? '' : '점'}
                    </div>
                  </div>
                )) || (
                  <div style={{ flex: 1, textAlign: 'center', color: '#64748b', padding: 20 }}>
                    필기평가 분석 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 32, marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
                📋 필기합격자 명단 <span style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>(클릭하여 상세 결과 확인)</span>
              </h2>
              <div style={{ overflowX: 'auto', transition: 'all 0.3s ease-in-out' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>순위</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>지원자명</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>필기점수</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>평가일</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.stats?.passed_applicants?.slice(0, showAllPassed ? undefined : 3) || []).map((applicant, index) => (
                      <tr 
                        key={index} 
                        style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.closest('tr').style.backgroundColor = '#f8fafc'}
                        onMouseOut={(e) => e.target.closest('tr').style.backgroundColor = 'transparent'}
                        onClick={() => handleApplicantClick(applicant.id)}
                      >
                        <td style={{ padding: '12px', color: '#1f2937' }}>{index + 1}</td>
                        <td style={{ padding: '12px', color: '#1f2937', fontWeight: 500 }}>{applicant.name}</td>
                        <td style={{ padding: '12px', color: '#16a34a', fontWeight: 600 }}>{applicant.written_score}점/5점</td>
                        <td style={{ padding: '12px', color: '#64748b' }}>{applicant.evaluation_date}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            background: '#dcfce7', 
                            color: '#16a34a', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px', 
                            fontWeight: 500 
                          }}>
                            필기합격
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!data?.stats?.passed_applicants || data.stats.passed_applicants.length === 0) && (
                      <tr>
                        <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                          필기합격자 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                {/* 토글 버튼 */}
                {data?.stats?.passed_applicants && data.stats.passed_applicants.length > 3 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    padding: '16px 0', 
                    borderTop: '1px solid #e2e8f0',
                    marginTop: '8px'
                  }}>
                    <button
                      onClick={() => setShowAllPassed(!showAllPassed)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#f8fafc',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#f1f5f9';
                        e.target.style.borderColor = '#9ca3af';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#f8fafc';
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      {showAllPassed ? (
                        <>
                          <MdExpandLess size={16} style={{ transition: 'transform 0.2s ease-in-out' }} />
                          접기
                        </>
                      ) : (
                        <>
                          <MdExpandMore size={16} style={{ transition: 'transform 0.2s ease-in-out' }} />
                          더보기 ({data.stats.passed_applicants.length - 3}명 더)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 32, marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
                📋 필기불합격자 명단 <span style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>(클릭하여 상세 결과 확인)</span>
              </h2>
              <div style={{ overflowX: 'auto', transition: 'all 0.3s ease-in-out' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>순위</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>지원자명</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>필기점수</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>평가일</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(failedApplicants?.slice(0, showAllFailed ? undefined : 3) || []).map((applicant, index) => (
                      <tr 
                        key={index} 
                        style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.closest('tr').style.backgroundColor = '#f8fafc'}
                        onMouseOut={(e) => e.target.closest('tr').style.backgroundColor = 'transparent'}
                        onClick={() => handleApplicantClick(applicant.id)}
                      >
                        <td style={{ padding: '12px', color: '#1f2937' }}>{index + 1}</td>
                        <td style={{ padding: '12px', color: '#1f2937', fontWeight: 500 }}>{applicant.user_name}</td>
                        <td style={{ padding: '12px', color: '#ef4444', fontWeight: 600 }}>
                          {applicant.written_test_score !== null ? `${applicant.written_test_score}점/5점` : '미응시'}
                        </td>
                        <td style={{ padding: '12px', color: '#64748b' }}>{applicant.evaluation_date || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            background: '#fef2f2', 
                            color: '#ef4444', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px', 
                            fontWeight: '500' 
                          }}>
                            필기불합격
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!failedApplicants || failedApplicants.length === 0) && (
                      <tr>
                        <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                          필기불합격자 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                {/* 토글 버튼 */}
                {failedApplicants && failedApplicants.length > 3 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    padding: '16px 0', 
                    borderTop: '1px solid #e2e8f0',
                    marginTop: '8px'
                  }}>
                    <button
                      onClick={() => setShowAllFailed(!showAllFailed)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#f8fafc',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#f1f5f9';
                        e.target.style.borderColor = '#9ca3af';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#f8fafc';
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      {showAllFailed ? (
                        <>
                          <MdExpandLess size={16} style={{ transition: 'transform 0.2s ease-in-out' }} />
                          접기
                        </>
                      ) : (
                        <>
                          <MdExpandMore size={16} style={{ transition: 'transform 0.2s ease-in-out' }} />
                          더보기 ({failedApplicants.length - 3}명 더)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 2페이지: 점수분포 히스토그램 및 상세평가결과 */}
        {currentPage === 2 && (
          <>
            {/* 점수분포 히스토그램 */}
            <ScoreHistogram data={generateScoreHistogram()} />

            {/* 상세 평가 결과 */}
            <div style={{ background: 'white', borderRadius: 12, padding: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
                📋 상세 평가 결과
              </h2>
              <div style={{ 
                fontSize: 14, 
                color: '#374151', 
                lineHeight: 1.8,
                whiteSpace: 'pre-line',
                background: '#f9fafb',
                padding: '24px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                {data?.detailed_analysis ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: data.detailed_analysis
                                        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1f2937; font-weight: 600;">$1</strong>')
                  .replace(/### (\d+\.\s*)(.*?)/g, '<div style="display: flex; align-items: center; gap: 8px; margin: 20px 0 12px 0;"><span style="color: #f59e0b; font-size: 20px;">💡</span><span style="font-weight: 900; color: #1f2937; font-size: 20px; line-height: 1.3;">$2</span></div>')
                      .replace(/\n/g, '<br>')
                  }} />
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#6b7280', 
                    fontStyle: 'italic',
                    padding: '40px 20px'
                  }}>
                    직무적성평가 상세 분석 결과가 여기에 표시됩니다.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* 지원자 필기시험 상세 결과 모달 */}
        <ApplicantTestDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          applicantId={selectedApplicantId}
          jobPostId={jobPostId}
        />
      </div>
    </Layout>
  );
}

export default JobAptitudeReport; 