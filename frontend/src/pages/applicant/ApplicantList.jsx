import React, { useState, useEffect } from 'react';
import Layout from '../../layout/Layout';
import { FaRegStar, FaStar } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';
import { FcComboChart } from 'react-icons/fc';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import SettingsMenu, { getDefaultSettingsButton } from '../../components/SettingsMenu';
import ApplicantListLeft from './ApplicantListLeft';
import ResumeCard from '../../components/ResumeCard';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/api';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNew from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';
import { 
  calculateAge, 
  getEducationStats, 
  getGenderStats, 
  getAgeGroupStats, 
  getNewApplicantsToday, 
  getUnviewedApplicants,
  CHART_COLORS,
  getProvinceStats,
  getCertificateCountStats,
  getApplicationTrendStats // 추가
} from '../../utils/applicantStats';
import ProvinceMapChart from '../../components/ProvinceMapChart';

export default function ApplicantList() {
  const [bookmarkedList, setBookmarkedList] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [selectedApplicantIndex, setSelectedApplicantIndex] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [resume, setResume] = useState(null);
  const [waitingApplicants, setWaitingApplicants] = useState([]);
  const [passedCount, setPassedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [headcount, setHeadcount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const isAdminOrManager = user && (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER);
  const navigate = useNavigate();
  const { jobPostId } = useParams();
  const [jobPost, setJobPost] = useState(null);
  const [jobPostLoading, setJobPostLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  
  // jobPostId가 없으면 기본값 사용
  const effectiveJobPostId = jobPostId;

  const toggleExpand = (applicantId) => {
    setExpanded(expanded === applicantId ? null : applicantId);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [appRes, postRes, appDetailRes] = await Promise.all([
        api.get(`/applications/job/${effectiveJobPostId}/applicants`),
        api.get(`/company/jobposts/${effectiveJobPostId}`)
        ]);
        const applicants = appRes.data;
        setApplicants(applicants);
        setWaitingApplicants(applicants.filter(app => app.status === 'WAITING'));
        setPassedCount(applicants.filter(app => app.status === 'PASSED').length);
        setRejectedCount(applicants.filter(app => app.status === 'REJECTED').length);
        setBookmarkedList(applicants.map(app => app.isBookmarked === 'Y'));
        setHeadcount(postRes.data?.headcount ?? 0);
      } catch (err) {
        console.error('지원자/공고 데이터 불러오기 실패:', err);
        setError('지원자 또는 공고 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (effectiveJobPostId) fetchData();
  }, [effectiveJobPostId]);


  // applicants 데이터 샘플 콘솔 출력
  useEffect(() => {
    if (applicants.length > 0) {
      console.log("==== applicants 전체 목록 ====");
      applicants.forEach((a, idx) => {
        console.log(`#${idx+1}: id=${a.id}, name=${a.name}, degree=${a.degree}, education=${a.education}, status=${a.status}`);
      });
      console.log("==== applicants 원본 ====");
      console.log(applicants);
    }
  }, [applicants]);

  useEffect(() => {
    if (applicants.length > 0) {
      console.log("applicants gender 샘플:", applicants.map(a => a.gender));
      console.log("getGenderStats:", getGenderStats(applicants));
    }
  }, [applicants]);

  const handleDelete = async () => {
    if (window.confirm('이 지원자를 삭제하시겠습니까?')) {
      try {
        await api.delete(`/applications/${selectedApplicant.id}`);
        alert('지원자가 삭제되었습니다.');
        navigate(-1);
      } catch (err) {
        console.error('Error deleting applicant:', err);
        alert('지원자 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleEdit = () => {
    navigate(`/editpost/${effectiveJobPostId}`);
  };

  const settingsButton = getDefaultSettingsButton({
    onEdit: handleEdit,
    onDelete: handleDelete,
    isVisible: isAdminOrManager
  });

  const toggleBookmark = async (index) => {
    try {
      const applicant = applicants[index];
      const newBookmarkStatus = bookmarkedList[index] ? 'N' : 'Y';

      await api.patch(`/applications/${applicant.id}/bookmark`, {
        isBookmarked: newBookmarkStatus
      });

      const updated = [...bookmarkedList];
      updated[index] = !updated[index];
      setBookmarkedList(updated);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      alert('즐겨찾기 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleSkip = () => {
    if (selectedApplicantIndex === null || filteredApplicants.length === 0) return;
    
    const currentFilteredIndex = filteredApplicants.findIndex(
      app => app.id === applicants[selectedApplicantIndex].id
    );
    
    const nextFilteredIndex = (currentFilteredIndex + 1) % filteredApplicants.length;
    const nextApplicant = filteredApplicants[nextFilteredIndex];
    
    const nextGlobalIndex = applicants.findIndex(app => app.id === nextApplicant.id);
    
    handleApplicantClick(nextApplicant, nextGlobalIndex);
  };

  // 지원자 클릭 시 실행되는 함수 （ 이력서 상세 보기－ 열림 ）
  const handleApplicantClick = async (applicant, index) => {
    setSelectedApplicantIndex(index);
    setResume(null);
    try {
      console.log("지원서 상세 요청 - applicationId:", applicant.id);
      const res = await api.get(`/applications/${applicant.id}`);
      console.log("지원서 상세 응답:", res.data);
      setResume(res.data); // 혹은 setResume(res.data) 구조에 따라

      console.log("res.data", res.data);

      setSelectedApplicant(applicant);
      setSplitMode(true);
    } catch (err) {
      console.error("지원서 상세 불러오기 실패:", err.response?.data || err.message);
      console.error("에러 상태:", err.response?.status);
      console.error("전체 에러:", err);
    }
  };

  // 지원서가 열렸을 때, 상세 페이지 닫는 함수
  const handleCloseDetailedView = () => {
    console.log("상세 페이지 닫기 호출됨");
    setSplitMode(false);             // splitMode를 false
    setSelectedApplicant(null);      // 선택된 지원자 정보 초기화
    setResume(null);                 // 이력서 정보 초기화
    setSelectedApplicantIndex(null); // 선택된 인덱스 초기화 (선택 표시 해제)
  };


  const handleBack = () => {
    setSplitMode(false);
    setSelectedApplicantIndex(null);
  };

  // AI 일괄 재평가 핸들러
  const handleBatchReEvaluate = async () => {
    if (!effectiveJobPostId) return;
    if (!window.confirm('정말로 모든 지원자에 대해 AI 평가를 다시 실행하시겠습니까?\n\n이 작업은 시간이 오래 걸릴 수 있습니다 (최대 5분).')) return;
    try {
      setLoading(true);
      console.log('AI 일괄 재평가 시작...');
      await api.post(`/applications/job/${effectiveJobPostId}/batch-ai-re-evaluate`);
      console.log('AI 일괄 재평가 완료');
      alert('AI 일괄 재평가가 완료되었습니다!');
      // 재평가 후 지원자 목록 새로고침
      const appRes = await api.get(`/applications/job/${effectiveJobPostId}/applicants`);
      setApplicants(appRes.data);
    } catch (err) {
      console.error('AI 일괄 재평가 오류:', err);
      if (err.code === 'ECONNABORTED') {
        alert('AI 일괄 재평가가 시간 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        alert('AI 일괄 재평가 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // const selectedApplicant = selectedApplicantIndex !== null ? applicants[selectedApplicantIndex] : null;

  if (loading) {
    return (
      <Layout settingsButton={settingsButton}>
        <ViewPostSidebar jobPost={jobPost} />
        <div className="h-screen flex items-center justify-center">
          <div className="text-xl">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout settingsButton={settingsButton}>
        <ViewPostSidebar jobPost={jobPost} />
        <div className="h-screen flex items-center justify-center">
          <div className="text-xl text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout settingsButton={settingsButton}>
      <ViewPostSidebar jobPost={jobPost} />
      <div className="h-screen flex flex-col" style={{ marginLeft: 90 }}>
        {/* 상단 바 */}
        <div className="bg-white dark:bg-gray-800 shadow px-8 py-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            보안SW 개발자 신입/경력사원 모집 (<span className="text-blue-700 dark:text-blue-400">C, C++</span>) - 소프트웨어 개발자
          </div>
        </div>

        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          <div 
            className={`transition-[width] duration-500 ease-in-out ${splitMode ? 'w-[40%]' : 'w-[60%]'}`}
            style={{ minWidth: splitMode ? 320 : undefined }}
          >
            <ApplicantListLeft
              applicants={applicants}
              splitMode={splitMode}
              selectedApplicantIndex={selectedApplicantIndex}
              onSelectApplicant={handleApplicantClick}
              handleApplicantClick={handleApplicantClick}
              handleCloseDetailedView={handleCloseDetailedView}
              bookmarkedList={bookmarkedList}
              toggleBookmark={toggleBookmark}
              calculateAge={calculateAge}
              onFilteredApplicantsChange={setFilteredApplicants}
              onBatchReEvaluate={handleBatchReEvaluate}
              loading={loading}
            />
          </div>

          <div
            className={`flex-1 bg-white dark:bg-gray-800 rounded-3xl shadow transition-all duration-500 ease-in-out`}
            style={{ minWidth: 400 }}
          >
            {splitMode && selectedApplicant ? (
              <div className="h-full flex flex-col">
                <div className="h-16 bg-white dark:bg-gray-800 border-b flex items-center px-4">
                  <button 
                    onClick={handleBack}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <IoArrowBack className="text-2xl text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                {/*여기를 이력서로*/}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <ResumeCard resume={resume} onClick={handleApplicantClick}/>
                </div>

                <div className="p-4 border-t bg-white dark:bg-gray-800">
                  {/* 합격/불합격/건너뛰기 버튼 */}
                  <div className="flex justify-between items-center gap-4">
                    <button className="flex-1 py-3 rounded-full border-2 border-blue-400 text-blue-500 font-bold text-lg bg-white hover:bg-blue-50 transition">합격</button>
                    <button className="flex-1 py-3 rounded-full border-2 border-gray-400 text-gray-700 font-bold text-lg bg-white hover:bg-gray-50 transition" onClick={handleSkip}>건너뛰기</button>
                    <button className="flex-1 py-3 rounded-full border-2 border-red-400 text-red-500 font-bold text-lg bg-white hover:bg-red-50 transition">불합격</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <div className="flex flex-col items-center justify-center p-8">
                    <div className="text-center space-y-8">
                      <div className="text-4xl font-bold text-blue-600">오늘의 신규 지원자</div>
                      <div className="text-6xl font-bold text-gray-800 dark:text-white">
                        {getNewApplicantsToday(waitingApplicants)}
                      </div>
                      <div className="text-2xl font-semibold text-gray-600 dark:text-gray-300">대기중인 지원자</div>
                      <div className="text-5xl font-bold text-gray-800 dark:text-white">{waitingApplicants.length}</div>
                      <div className="text-2xl font-semibold text-gray-600 dark:text-gray-300">미열람 지원자</div>
                      <div className="text-5xl font-bold text-gray-800 dark:text-white">{getUnviewedApplicants(waitingApplicants)}</div>
                      <div className="flex justify-center w-full">
                        <Button
                          variant="outlined"
                          startIcon={<FcComboChart style={{ fontSize: 28 }} />}
                          onClick={() => setModalOpen(true)}
                          sx={{ mt: 3, px: 4, py: 1.5, fontWeight: 'bold', fontSize: '1rem', borderRadius: 2, borderColor: '#42a5f5', color: '#424242', background: '#fff', '&:hover': { background: '#e3f2fd', borderColor: '#42a5f5' } }}
                        >
                          통계 시각화
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t bg-white dark:bg-gray-800">
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => navigate(`/passedapplicants/${effectiveJobPostId}`)}
                      className="w-40 border border-blue-600 text-blue-600 bg-transparent hover:bg-blue-600 hover:text-white px-3 py-3 rounded-lg font-bold text-base shadow transition"
                    >
                      서류 합격자 명단 ({passedCount}/{headcount})
                    </button>
                    <button
                      onClick={() => navigate(`/rejectedapplicants/${effectiveJobPostId}`)}
                      className="w-40 border border-red-600 text-red-600 bg-transparent hover:bg-red-600 hover:text-white px-1 py-3 rounded-lg font-bold text-base shadow transition"
                    >
                      서류 불합격자 명단 {rejectedCount}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aria-labelledby="stat-modal-title"
        aria-describedby="stat-modal-desc"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 900,
            bgcolor: 'background.paper',
            border: '2px solid #1976d2',
            boxShadow: 24,
            borderRadius: 3,
            p: 4,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <IconButton onClick={() => setSlideIndex(slideIndex - 1)} disabled={slideIndex === 0}>
              <ArrowBackIosNew />
            </IconButton>
            <h2 id="stat-modal-title" className="text-xl font-bold">
              {slideIndex === 0 ? '지원 시기별 지원자 추이'
                : slideIndex === 1 ? '연령대별 지원자 수'
                : slideIndex === 2 ? '성별 지원자 비율'
                : slideIndex === 3 ? '학력별 지원자 비율'
                : slideIndex === 4 ? '지역별 지원자 분포'
                : '자격증 보유수별 지원자 수'}
            </h2>
            <IconButton onClick={() => setSlideIndex(slideIndex + 1)} disabled={slideIndex === 5}>
              <ArrowForwardIos />
            </IconButton>
          </div>
          {slideIndex === 0 && (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getApplicationTrendStats(applicants)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'left', marginTop: 8, marginLeft: 8, color: '#222', fontWeight: 500 }}>
                전체 지원자 수: {applicants.length}명
              </div>
            </>
          )}
          {slideIndex === 1 && (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getAgeGroupStats(applicants)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS.AGE_GROUP} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'left', marginTop: 8, marginLeft: 8, color: '#222', fontWeight: 500 }}>
                전체 지원자 수: {applicants.length}명
              </div>
            </>
          )}
          {slideIndex === 2 && (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getGenderStats(applicants)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {getGenderStats(applicants).map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={CHART_COLORS.GENDER[idx % CHART_COLORS.GENDER.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'left', marginTop: 8, marginLeft: 8, color: '#222', fontWeight: 500 }}>
                전체 지원자 수: {applicants.length}명
              </div>
            </>
          )}
          {slideIndex === 3 && (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getEducationStats(applicants)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {getEducationStats(applicants).map((entry, idx) => (
                      <Cell key={`cell-edu-${idx}`} fill={CHART_COLORS.EDUCATION[idx % CHART_COLORS.EDUCATION.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'left', marginTop: 8, marginLeft: 8, color: '#222', fontWeight: 500 }}>
                전체 지원자 수: {applicants.length}명
              </div>
            </>
          )}
          {slideIndex === 4 && (
            <div style={{ width: '100%', height: 500 }}>
              <ProvinceMapChart provinceStats={getProvinceStats(applicants)} />
            </div>
          )}
          {slideIndex === 5 && (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getCertificateCountStats(applicants)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS.CERTIFICATE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'left', marginTop: 8, marginLeft: 8, color: '#222', fontWeight: 500 }}>
                전체 지원자 수: {applicants.length}명
              </div>
            </>
          )}
          <div className="flex justify-center mt-4">
            <Button onClick={() => setModalOpen(false)} variant="contained">닫기</Button>
          </div>
        </Box>
      </Modal>
    </Layout>
  );
}
