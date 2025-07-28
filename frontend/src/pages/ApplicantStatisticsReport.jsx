import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import Layout from '../layout/Layout';
import ViewPostSidebar from '../components/ViewPostSidebar';
import { MdRefresh, MdCached, MdDownload } from 'react-icons/md';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';
import { 
  getEducationStats, 
  getGenderStats, 
  getAgeGroupStats, 
  getNewApplicantsToday, 
  getUnviewedApplicants,
  CHART_COLORS,
  getProvinceStats,
  getCertificateCountStats,
  getApplicationTrendStats,
  AGE_GROUPS,
  extractProvince,
  classifyEducation
} from '../utils/applicantStats';
import ProvinceMapChart from '../components/ProvinceMapChart';
import StatisticsAnalysis from '../components/StatisticsAnalysis';

function ApplicantStatisticsReport() {
  const [data, setData] = useState(null);
  const [loadingText, setLoadingText] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const jobPostId = searchParams.get("job_post_id");

  useEffect(() => {
    if (jobPostId) {
      axiosInstance.get(`/v1/applications/job/${jobPostId}/applicants`)
        .then((res) => {
          const applicants = res.data;
          const jobPostRes = axiosInstance.get(`/v1/company/jobposts/${jobPostId}`);
          return Promise.all([applicants, jobPostRes]);
        })
        .then(([applicants, jobPostRes]) => {
          setData({
            applicants: applicants,
            jobPost: jobPostRes.data
          });
        })
        .catch((error) => {
          console.error('지원자 통계 데이터 조회 실패:', error);
        });
    }
  }, [jobPostId]);

  // 로딩 텍스트 애니메이션
  useEffect(() => {
    if (!data) {
      setLoadingText('');
      let i = 0;
      const interval = setInterval(() => {
        const fullText = "지원자 통계 보고서 생성 중입니다...";
        setLoadingText(fullText.slice(0, i + 1));
        i++;
        if (i > fullText.length) i = 0;
      }, 120);
      return () => clearInterval(interval);
    }
  }, [data]);

  const handleRefreshCache = async () => {
    if (window.confirm('지원자 통계 보고서를 새로고침하시겠습니까?')) {
      setIsRefreshing(true);
      try {
        const [applicantsRes, jobPostRes] = await Promise.all([
          axiosInstance.get(`/v1/applications/job/${jobPostId}/applicants`),
          axiosInstance.get(`/v1/company/jobposts/${jobPostId}`)
        ]);
        setData({
          applicants: applicantsRes.data,
          jobPost: jobPostRes.data
        });
        console.log('✅ 지원자 통계 보고서 새로고침 완료');
      } catch (error) {
        console.error('지원자 통계 보고서 새로고침 실패:', error);
        alert('새로고침에 실패했습니다.');
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  if (!data) return (
    <Layout>
      <ViewPostSidebar jobPost={jobPostId ? { id: jobPostId } : null} />
      <div style={{
        minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#f9fafb', borderRadius: 18, boxShadow: '0 4px 24px #e0e7ef', margin: '40px auto', maxWidth: 900
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', marginBottom: 32, textAlign: 'center', letterSpacing: '1px', minHeight: 40 }}>
          {loadingText}
        </div>
        <div style={{ fontSize: 18, color: '#64748b', textAlign: 'center' }}>잠시만 기다려 주세요.</div>
      </div>
    </Layout>
  );

  const { jobPost, applicants } = data;

  // 통계 데이터 계산
  const educationStats = getEducationStats(applicants);
  const genderStats = getGenderStats(applicants);
  const ageGroupStats = getAgeGroupStats(applicants);
  const provinceStats = getProvinceStats(applicants);
  const certificateStats = getCertificateCountStats(applicants);
  const trendStats = getApplicationTrendStats(applicants);
  const newApplicantsToday = getNewApplicantsToday(applicants);
  const unviewedApplicants = getUnviewedApplicants(applicants);

  // 지원 상태별 통계
  const waitingCount = applicants.filter(a => a.document_status === 'WAITING').length;
  const passedCount = applicants.filter(a => a.document_status === 'PASSED').length;
  const rejectedCount = applicants.filter(a => a.document_status === 'REJECTED').length;

  // PDF 다운로드 함수
  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const element = document.getElementById('statistics-report');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f9fafb'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `지원자통계보고서_${jobPost?.title || '채용공고'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF 생성 실패:', error);
      alert('PDF 생성에 실패했습니다.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <Layout>
      <ViewPostSidebar jobPost={jobPost} />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div id="statistics-report" style={{ maxWidth: 1600, margin: "40px auto", background: "#f9fafb", padding: 40, borderRadius: 18, boxShadow: "0 4px 24px #e0e7ef", border: '1px solid #e5e7eb' }}>
        <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h2 style={{ fontWeight: 800, fontSize: 30, color: '#2563eb', letterSpacing: '-1px' }}>
              {jobPost.title} <span style={{ color: '#64748b', fontWeight: 600, fontSize: 20 }}>- 지원자 통계 보고서</span>
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
                title="새로고침"
              >
                <MdCached size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                {isRefreshing ? '새로고침 중...' : '새로고침'}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                  background: pdfLoading ? '#9ca3af' : '#2563eb', color: 'white',
                  border: 'none', borderRadius: 8, cursor: pdfLoading ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 500, transition: 'background-color 0.2s'
                }}
                title="PDF 다운로드"
              >
                <MdDownload size={16} style={{ animation: pdfLoading ? 'spin 1s linear infinite' : 'none' }} />
                {pdfLoading ? 'PDF 생성 중...' : 'PDF 다운로드'}
              </button>
            </div>
          </div>
          <div style={{ color: '#64748b', fontSize: 16, marginBottom: 4 }}>
            모집 기간: <b>{jobPost.start_date}</b> ~ <b>{jobPost.end_date}</b>
          </div>
          <div style={{ color: '#64748b', fontSize: 16 }}>
            모집 부서: <b>{typeof jobPost.department === 'object' && jobPost.department !== null ? (jobPost.department.name || JSON.stringify(jobPost.department)) : (jobPost.department || '')}</b>
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
            직무: <b>{typeof jobPost.position === 'object' && jobPost.position !== null ? (jobPost.position.name || JSON.stringify(jobPost.position)) : (jobPost.position || '')}</b>
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
            채용 인원: <b>{jobPost.recruit_count}명</b>
          </div>
        </div>

        {/* 주요 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>총 지원자</div>
            <div style={{ fontWeight: 700, fontSize: 32, color: '#2563eb' }}>{applicants.length}명</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>서류 합격자</div>
            <div style={{ fontWeight: 700, fontSize: 32, color: '#10b981' }}>{passedCount}명</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>서류 불합격자</div>
            <div style={{ fontWeight: 700, fontSize: 32, color: '#ef4444' }}>{rejectedCount}명</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>오늘 신규 지원자</div>
            <div style={{ fontWeight: 700, fontSize: 32, color: '#f59e0b' }}>{newApplicantsToday}명</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>미열람 지원자</div>
            <div style={{ fontWeight: 700, fontSize: 32, color: '#8b5cf6' }}>{unviewedApplicants}명</div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
          {/* 지원 시기별 추이 */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', marginBottom: 20 }}>지원 시기별 추이</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 성별 분포 */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', marginBottom: 20 }}>성별 분포</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderStats}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}명`}
                >
                  {genderStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.GENDER[index % CHART_COLORS.GENDER.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 연령대별 분포 */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', marginBottom: 20 }}>연령대별 분포</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageGroupStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 학력별 분포 */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', marginBottom: 20 }}>학력별 분포</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={educationStats}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}명`}
                >
                  {educationStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.EDUCATION[index % CHART_COLORS.EDUCATION.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 자격증 보유수별 분포 */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', marginBottom: 20 }}>자격증 보유수별 분포</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={certificateStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* 지역별 분포 섹션 (별도 섹션으로 분리) */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginBottom: 24 }}>지역별 분포</h3>
          <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ProvinceMapChart provinceStats={provinceStats} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 16, color: '#64748b', fontSize: 16 }}>
            총 지원자 수: {applicants.length}명
          </div>
        </div>

        {/* 상세 통계 테이블 */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginBottom: 24 }}>상세 통계</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 32 }}>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 20 }}>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>지원 상태별 현황</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 16 }}>대기중</span>
                  <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: 18 }}>{waitingCount}명</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 16 }}>합격</span>
                  <span style={{ fontWeight: 700, color: '#10b981', fontSize: 18 }}>{passedCount}명</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 16 }}>불합격</span>
                  <span style={{ fontWeight: 700, color: '#ef4444', fontSize: 18 }}>{rejectedCount}명</span>
                </div>
              </div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 20, textAlign: 'center' }}>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>합격률</h4>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#10b981', marginBottom: 8 }}>
                {applicants.length > 0 ? ((passedCount / applicants.length) * 100).toFixed(1) : 0}%
              </div>
              <div style={{ color: '#6b7280', fontSize: 16, fontWeight: 500 }}>
                {passedCount}명 / {applicants.length}명
              </div>
            </div>
            <div style={{ background: '#faf5ff', borderRadius: 8, padding: 20, textAlign: 'center' }}>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>평균 자격증 보유수</h4>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#8b5cf6', marginBottom: 8 }}>
                {applicants.length > 0 ? (applicants.reduce((sum, app) => sum + (Array.isArray(app.certificates) ? app.certificates.length : 0), 0) / applicants.length).toFixed(1) : 0}개
              </div>
              <div style={{ color: '#6b7280', fontSize: 16, fontWeight: 500 }}>
                총 {applicants.reduce((sum, app) => sum + (Array.isArray(app.certificates) ? app.certificates.length : 0), 0)}개 보유
              </div>
            </div>
          </div>
        </div>

        {/* AI 분석 섹션 */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginBottom: 24 }}>AI 분석 결과</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            {/* 지원 시기별 추이 AI 분석 */}
            <div>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>지원 시기별 추이 분석</h4>
              <StatisticsAnalysis
                jobPostId={jobPostId}
                chartType="trend"
                chartData={trendStats}
                isVisible={true}
              />
            </div>
            
            {/* 성별 분포 AI 분석 */}
            <div>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>성별 분포 분석</h4>
              <StatisticsAnalysis
                jobPostId={jobPostId}
                chartType="gender"
                chartData={genderStats}
                isVisible={true}
              />
            </div>
            
            {/* 연령대별 분포 AI 분석 */}
            <div>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>연령대별 분포 분석</h4>
              <StatisticsAnalysis
                jobPostId={jobPostId}
                chartType="age"
                chartData={ageGroupStats}
                isVisible={true}
              />
            </div>
            
            {/* 학력별 분포 AI 분석 */}
            <div>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>학력별 분포 분석</h4>
              <StatisticsAnalysis
                jobPostId={jobPostId}
                chartType="education"
                chartData={educationStats}
                isVisible={true}
              />
            </div>
            
            {/* 지역별 분포 AI 분석 */}
            <div>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>지역별 분포 분석</h4>
              <StatisticsAnalysis
                jobPostId={jobPostId}
                chartType="province"
                chartData={provinceStats}
                isVisible={true}
              />
            </div>
            
            {/* 자격증 보유 현황 AI 분석 */}
            <div>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>자격증 보유 현황 분석</h4>
              <StatisticsAnalysis
                jobPostId={jobPostId}
                chartType="certificate"
                chartData={certificateStats}
                isVisible={true}
              />
            </div>
          </div>
        </div>

        {/* 생성 일시 */}
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 14, marginTop: 32 }}>
          보고서 생성 일시: {new Date().toLocaleString('ko-KR')}
        </div>
      </div>
    </Layout>
  );
}

export default ApplicantStatisticsReport; 