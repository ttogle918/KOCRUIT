import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../layout/Layout';
import { IoArrowBack } from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import ApplicantListLeft from './ApplicantListLeft';
import ResumePage from '../resume/ResumePage';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import Button from '@mui/material/Button';
import AIEvaluationModal from '../../components/AIEvaluationModal';
import { calculateAge, mapResumeData } from '../../utils/resumeUtils';

export default function ApplicantEvaluationList({
  onApplicantSelect, // 평가/면접 패널에서 선택 이벤트를 받을 수 있도록
  jobPostId: propJobPostId,
  ...props
}) {
  const [bookmarkedList, setBookmarkedList] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [selectedApplicantIndex, setSelectedApplicantIndex] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const isAdminOrManager = user && (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER);
  const navigate = useNavigate();
  const { jobPostId: routeJobPostId } = useParams();
  const effectiveJobPostId = propJobPostId || routeJobPostId;

  // AI 평가 모달 상태
  const [aiEvaluationModalOpen, setAiEvaluationModalOpen] = useState(false);
  const [selectedApplicantForAI, setSelectedApplicantForAI] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const appRes = await api.get(`/applications/job/${effectiveJobPostId}/applicants`);
        const applicants = appRes.data;
        setApplicants(applicants);
        setBookmarkedList(applicants.map(app => app.isBookmarked === 'Y'));
      } catch (err) {
        setError('지원자 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };
    if (effectiveJobPostId) fetchData();
  }, [effectiveJobPostId]);

  // 지원자 클릭 시 평가 모달 표시
  const handleApplicantClick = async (applicant, index) => {
    setSelectedApplicantForAI(applicant);
    setAiEvaluationModalOpen(true);
    if (onApplicantSelect) onApplicantSelect(applicant, index);
  };

  // 평가 모달에서 실무진 면접 진행 시 상세/이력서 표시
  const handleProceedToInterview = async (applicant) => {
    setSelectedApplicantIndex(applicants.findIndex(a => a.id === applicant.id));
    setResume(null);
    setSplitMode(true);
    try {
      const res = await api.get(`/applications/${applicant.id}`);
      const mappedResume = mapResumeData(res.data);
      setResume(mappedResume);
      setSelectedApplicant(applicant);
    } catch (err) {
      setResume(null);
    }
  };

  const handleBack = () => {
    setSplitMode(false);
    setSelectedApplicantIndex(null);
    setSelectedApplicant(null);
    setResume(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="text-xl">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="text-xl text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col" style={{ marginLeft: 90 }}>
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
              handleCloseDetailedView={handleBack}
              bookmarkedList={bookmarkedList}
              toggleBookmark={() => {}}
              calculateAge={calculateAge}
              onFilteredApplicantsChange={() => {}}
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
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <ResumePage resume={resume} loading={false} error={null} jobpostId={effectiveJobPostId} applicationId={selectedApplicant?.application_id || selectedApplicant?.applicationId}/>
                </div>
                <div className="p-4 border-t bg-white dark:bg-gray-800">
                  {/* 평가/면접용 버튼 영역 (필요시 커스텀) */}
                  <div className="flex justify-between items-center gap-4">
                    <button className="flex-1 py-3 rounded-full border-2 border-blue-400 text-blue-500 font-bold text-lg bg-white hover:bg-blue-50 transition">합격</button>
                    <button className="flex-1 py-3 rounded-full border-2 border-gray-400 text-gray-700 font-bold text-lg bg-white hover:bg-gray-50 transition">건너뛰기</button>
                    <button className="flex-1 py-3 rounded-full border-2 border-red-400 text-red-500 font-bold text-lg bg-white hover:bg-red-50 transition">불합격</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-2xl text-gray-400">지원자를 선택하세요</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* AI 평가 모달 */}
      <AIEvaluationModal
        open={aiEvaluationModalOpen}
        onClose={() => setAiEvaluationModalOpen(false)}
        applicant={selectedApplicantForAI}
        onProceedToInterview={handleProceedToInterview}
        jobPostId={effectiveJobPostId}
      />
    </Layout>
  );
} 