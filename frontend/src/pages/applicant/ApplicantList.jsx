import React, { useState, useEffect, useRef } from 'react';
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
  classifyEducation // 추가: 학력 분류 함수 직접 사용
} from '../../utils/applicantStats';
import { calculateAge, mapResumeData } from '../../utils/resumeUtils';
import ProvinceMapChart from '../../components/ProvinceMapChart';
import CommonResumeList from '../../components/CommonResumeList';



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

  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState('chart'); // 'chart' | 'list'
  const [slideIndex, setSlideIndex] = useState(0); // 차트 슬라이드 인덱스
  const [prevSlideIndex, setPrevSlideIndex] = useState(1); // 기본 연령대
  const [resumeLoading, setResumeLoading] = useState(false); // 추가: 이력서 로딩 상태

  // 모달(list)에서 선택된 지원자 인덱스 상태 추가
  const [modalSelectedApplicantIndex, setModalSelectedApplicantIndex] = useState(0);

  // jobPostId가 없으면 기본값 사용
  const effectiveJobPostId = jobPostId;



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
  const lastRequestedId = useRef(null);

  const handleApplicantClick = async (applicant, index) => {
    setSelectedApplicantIndex(index);
    setResume(null);
    setResumeLoading(true);
    lastRequestedId.current = applicant.id;
    try {
      const res = await api.get(`/applications/${applicant.id}`);
      if (lastRequestedId.current !== applicant.id) return; // 이전 요청이면 무시
      const mappedResume = mapResumeData(res.data);
      setResume(mappedResume);
      setSelectedApplicant(applicant);
      setSplitMode(true);
    } finally {
      setResumeLoading(false);
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

  // const selectedApplicant = selectedApplicantIndex !== null ? applicants[selectedApplicantIndex] : null;



  // 연령대 막대 클릭 시
  const handleAgeBarClick = (ageLabel) => {
    const group = AGE_GROUPS.find(g => g.label === ageLabel);
    const min = group ? group.min : 0;
    const max = group ? group.max : 150;
    const filtered = applicants.filter(applicant => {
      const birth = applicant.birthDate || applicant.birthdate || applicant.birthday;
      const age = calculateAge(birth);
      return age >= min && age <= max;
    });
    setFilteredApplicants(filtered);
    setSelectedApplicant(filtered[0] || null);
    setModalView('list');
    setPrevSlideIndex(1);
  };

  // 리스트에서 지원자 클릭 시 (모달 내)
  const handleMiniApplicantClick = async (applicant, index) => {
    setResumeLoading(true); // 로딩 시작
    setModalSelectedApplicantIndex(index);
    setSelectedApplicant(null);
    try {
      const res = await api.get(`/applications/${applicant.id}`);
      const mappedResume = mapResumeData(res.data);
      setSelectedApplicant(mappedResume);
    } catch (err) {
      setSelectedApplicant(null);
    } finally {
      setResumeLoading(false); // 로딩 종료
    }
  };

  // 차트로 돌아가기
  const handleBackToChart = () => {
    setModalView('chart');
    setFilteredApplicants([]);
    setSelectedApplicant(null);
    setSlideIndex(prevSlideIndex);
  };

  // 모달 닫기 시 상태 초기화
  const handleModalClose = () => {
    setModalOpen(false);
    setModalView('chart');
    setFilteredApplicants([]);
    setSelectedApplicant(null);
    setSelectedApplicantIndex(null); // 모달 닫을 때 선택된 지원자 인덱스도 초기화
    setSlideIndex(0);
  };

  // 성별 파이차트 클릭 핸들러
  const handleGenderPieClick = (genderLabel) => {
    // getGenderStats(applicants)의 name: '남성'/'여성' → 실제 데이터의 gender: 'M'/'F'
    const genderValue = genderLabel === '남성' ? 'M' : genderLabel === '여성' ? 'F' : '';
    const filtered = applicants.filter(applicant => applicant.gender === genderValue);
    setFilteredApplicants(filtered);
    setSelectedApplicant(filtered[0] || null);
    setModalView('list');
    setPrevSlideIndex(2);
  };

  // 학력 파이차트 클릭 핸들러
  const handleEducationPieClick = (educationLabel) => {
    const filtered = applicants.filter(a => classifyEducation(a) === educationLabel);
    setFilteredApplicants(filtered);
    setSelectedApplicant(filtered[0] || null);
    setModalView('list');
    setPrevSlideIndex(3);
  };

  // 지역 지도 클릭 핸들러
  const handleProvinceClick = (provinceName) => {
    console.log('Province clicked:', provinceName);
    const filtered = applicants.filter(a => {
      const extractedProvince = extractProvince(a.address || "");
      return extractedProvince === provinceName;
    });
    setFilteredApplicants(filtered);
    setSelectedApplicant(filtered[0] || null);
    setModalView('list');
    setPrevSlideIndex(4);
  };

  // 자격증 수 차트 클릭 핸들러
  const handleCertificateBarClick = (barName) => {
    let filtered = [];
    if (barName === '0개') filtered = applicants.filter(a => !a.certificates || a.certificates.length === 0);
    else if (barName === '1개') filtered = applicants.filter(a => a.certificates && a.certificates.length === 1);
    else if (barName === '2개') filtered = applicants.filter(a => a.certificates && a.certificates.length === 2);
    else if (barName === '3개 이상') filtered = applicants.filter(a => a.certificates && a.certificates.length >= 3);
    setFilteredApplicants(filtered);
    setSelectedApplicant(filtered[0] || null);
    setModalView('list');
    setPrevSlideIndex(5);
  };

  // 지원 시기별 추이 차트 클릭 핸들러
  const handleTrendLineClick = (date) => {
    // 지원일이 date(YYYY-MM-DD)와 같은 지원자만 필터링
    const filtered = applicants.filter(a => {
      const applied = (a.appliedAt || a.applied_at || '').slice(0, 10);
      return applied === date;
    });
    setFilteredApplicants(filtered);
    setSelectedApplicant(filtered[0] || null);
    setModalView('list');
    setPrevSlideIndex(0);
  };

  // 모달창이 열릴 때 맨 위 지원자 id로 자동 선택
  useEffect(() => {
    if (modalOpen && filteredApplicants.length > 0) {
      const firstApplicant = filteredApplicants[0];
      (async () => {
        setResumeLoading(true);
        try {
          const res = await api.get(`/applications/${firstApplicant.id}`);
          const mappedResume = mapResumeData(res.data);
          setSelectedApplicant(mappedResume);
        } catch (err) {
          setSelectedApplicant(null);
        } finally {
          setResumeLoading(false);
        }
      })();
    }
  }, [modalOpen, filteredApplicants]);

  // 모달(list)로 진입할 때 첫 번째 지원자 자동 선택
  useEffect(() => {
    if (modalOpen && modalView === 'list' && filteredApplicants.length > 0) {
      setModalSelectedApplicantIndex(0);
    }
  }, [modalOpen, modalView, filteredApplicants]);

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
        <div className="bg-white dark:bg-gray-800 shadow px-8 py-4 flex items-center justify-center">
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
                  <ResumeCard resume={resume} loading={resumeLoading} onClick={handleApplicantClick}/>
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
        onClose={handleModalClose}
        aria-labelledby="stat-modal-title"
        aria-describedby="stat-modal-desc"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 1200,
            maxHeight: '90vh',
            bgcolor: 'background.paper',
            border: '2px solid #1976d2',
            boxShadow: 24,
            borderRadius: 3,
            p: 4,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {modalView === 'chart' && (
            <>
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
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart 
                    data={getApplicationTrendStats(applicants)} 
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    onClick={(e) => {
                      if (e && e.activeLabel) {
                        handleTrendLineClick(e.activeLabel);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={3} 
                      dot={{ r: 4, onClick: (e, payload) => handleTrendLineClick(payload.payload.date), style: { cursor: 'pointer' } }}
                      activeDot={{ r: 6, style: { cursor: 'pointer' }, onClick: (e, payload) => handleTrendLineClick(payload.payload.date) }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {slideIndex === 1 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={getAgeGroupStats(applicants)}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    onClick={(data) => {
                      if (data && data.activePayload && data.activePayload[0]) {
                        const clickedData = data.activePayload[0].payload;
                        handleAgeBarClick(clickedData.name);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill={CHART_COLORS.AGE_GROUP}
                      radius={[6, 6, 0, 0]}
                      style={{ cursor: 'pointer' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {slideIndex === 2 && (
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
                      style={{ cursor: 'pointer' }}
                      onClick={(data, index) => {
                        // recharts Pie의 onClick은 (data, index) 순서로 전달됨
                        console.log('Pie clicked:', data);
                        handleGenderPieClick(data.name);
                      }}
                    >
                      {getGenderStats(applicants).map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={CHART_COLORS.GENDER[idx % CHART_COLORS.GENDER.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {slideIndex === 3 && (
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
                      style={{ cursor: 'pointer' }}
                      onClick={(data, index) => {
                        console.log('Education Pie clicked:', data);
                        handleEducationPieClick(data.name);
                      }}
                    >
                      {getEducationStats(applicants).map((entry, idx) => (
                        <Cell key={`cell-edu-${idx}`} fill={CHART_COLORS.EDUCATION[idx % CHART_COLORS.EDUCATION.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {slideIndex === 4 && (
                <div style={{ width: '100%', height: 500 }}>
                  <ProvinceMapChart 
                    provinceStats={getProvinceStats(applicants)} 
                    onProvinceClick={handleProvinceClick}
                  />
                </div>
              )}
              {slideIndex === 5 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getCertificateCountStats(applicants)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS.CERTIFICATE} radius={[6, 6, 0, 0]} 
                      style={{cursor:'pointer'}} 
                      onClick={(data, index) => handleCertificateBarClick(data.name)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
          {modalView === 'list' && (
            <div className="flex h-[500px] min-h-[400px]">
              <div className="w-2/5 border-r overflow-y-auto">
                <ApplicantListLeft
                  applicants={filteredApplicants}
                  splitMode={true}
                  selectedApplicantIndex={modalSelectedApplicantIndex}
                  onSelectApplicant={handleMiniApplicantClick}
                  handleApplicantClick={handleMiniApplicantClick}
                  handleCloseDetailedView={() => {}}
                  bookmarkedList={filteredApplicants.map(a => a.isBookmarked === 'Y')}
                  toggleBookmark={() => {}}
                  calculateAge={calculateAge}
                  onFilteredApplicantsChange={() => {}}
                />
              </div>
              <div className="w-3/5 overflow-y-auto">
                {selectedApplicant ? (
                  <ResumeCard resume={selectedApplicant} loading={resumeLoading} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">지원자를 선택하세요</div>
                )}
              </div>
              <button className="absolute top-4 right-32 px-4 py-2 bg-blue-100 text-blue-700 rounded" onClick={handleBackToChart}>차트로 돌아가기</button>
            </div>
          )}
          <div className="flex justify-center mt-4">
            <Button onClick={handleModalClose} variant="contained">닫기</Button>
          </div>
        </Box>
      </Modal>
    </Layout>
  );
}
