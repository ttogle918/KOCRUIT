import React, { useState, useEffect } from 'react';
import ApplicantCard from './ApplicantCard';
import ResumeCard from './ResumeCard';
import api from '../api/api';
import { getEducationStats, getGenderStats } from '../utils/applicantStats';
import { calculateAge, mapResumeData } from '../utils/resumeUtils';
import { getButtonStyle } from '../utils/styleUtils';
import { parseFilterConditions } from '../utils/filterUtils';


const CommonResumeList = ({ 
  jobPostId, 
  filterConditions = null, 
  onFilteredResults = null,
  showResumeDetail = true,
  compact = false,
  onApplicantSelect = null,
  onResumeLoad = null,
  customApplicants = null
}) => {
  const [applicants, setApplicants] = useState([]);
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [resume, setResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ type: 'score', isDesc: true });

  // 지원자 데이터 로드
  useEffect(() => {
    const fetchApplicants = async () => {
      if (!jobPostId) return;
      
      setLoading(true);
      try {
        const response = await api.get(`/applications/job/${jobPostId}/applicants`);
        setApplicants(response.data);
        setFilteredApplicants(response.data);
      } catch (err) {
        console.error('지원자 데이터 로드 실패:', err);
        setError('지원자 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    // customApplicants가 있으면 그것을 사용, 없으면 API에서 로드
    if (customApplicants) {
      setApplicants(customApplicants);
      setFilteredApplicants(customApplicants);
      setLoading(false);
    } else {
      fetchApplicants();
    }
  }, [jobPostId, customApplicants]);

  // 필터링 조건 처리
  useEffect(() => {
    let filtered = [...applicants];
    // 자연어 조건 필터
    if (filterConditions && applicants.length > 0) {
      const conditions = parseFilterConditions(filterConditions);
      if (conditions.ageRange) {
        filtered = filtered.filter(applicant => {
          const age = calculateAge(applicant.birthDate);
          return age >= conditions.ageRange[0] && age <= conditions.ageRange[1];
        });
      }
      if (conditions.education) {
        filtered = filtered.filter(applicant => {
          const education = applicant.education || applicant.degree || '';
          return education.toLowerCase().includes(conditions.education.toLowerCase());
        });
      }
      if (conditions.skills.length > 0) {
        filtered = filtered.filter(applicant => {
          const skills = applicant.skills || [];
          const skillText = Array.isArray(skills) ? skills.join(' ').toLowerCase() : skills.toLowerCase();
          return conditions.skills.some(skill => skillText.includes(skill));
        });
      }
      if (conditions.location) {
        filtered = filtered.filter(applicant => {
          const address = applicant.address || '';
          return address.includes(conditions.location);
        });
      }
      if (conditions.gender) {
        filtered = filtered.filter(applicant => {
          return applicant.gender === conditions.gender;
        });
      }
    }
    // 탭 필터 적용
    if (activeTab === 'SUITABLE') {
      filtered = filtered.filter(app => app.score > 60);
    } else if (activeTab === 'UNSUITABLE') {
      filtered = filtered.filter(app => app.score > 20 && app.score <= 60);
    } else if (activeTab === 'EXCLUDED') {
      filtered = filtered.filter(app => app.score <= 20);
    }
    
    // 정렬 적용
    filtered.sort((a, b) => {
      if (sortConfig.type === 'score') {
        // AI 점수 기준으로 정렬 (ai_score가 없으면 score 사용)
        const scoreA = a.ai_score ?? a.score ?? 0;
        const scoreB = b.ai_score ?? b.score ?? 0;
        return sortConfig.isDesc ? scoreB - scoreA : scoreA - scoreB;
      } else {
        const dateA = new Date(a.appliedAt);
        const dateB = new Date(b.appliedAt);
        return sortConfig.isDesc ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      }
    });
    
    setFilteredApplicants(filtered);
    if (onFilteredResults) {
      onFilteredResults({
        totalCount: applicants.length,
        filteredCount: filtered.length,
        results: filtered
      });
    }
  }, [filterConditions, applicants, onFilteredResults, activeTab, sortConfig]);

  // filteredApplicants가 바뀔 때마다 첫 번째 지원자 자동 선택 및 이력서 로딩
  useEffect(() => {
    if (filteredApplicants.length > 0) {
      setSelectedApplicant(filteredApplicants[0]);
      setResume(null);
      setResumeLoading(true);
      api.get(`/applications/${filteredApplicants[0].id}`)
        .then(res => setResume(mapResumeData(res.data)))
        .catch(() => setResume(null))
        .finally(() => setResumeLoading(false));
    } else {
      setSelectedApplicant(null);
      setResume(null);
    }
  }, [filteredApplicants]);

  // 지원자 통계 계산 (예시)
  const educationStats = getEducationStats(filteredApplicants);
  const genderStats = getGenderStats(filteredApplicants);

  // 지원자 클릭 핸들러 - 부모 콜백만 호출
  const handleApplicantClick = async (applicant, index) => {
    setSelectedApplicant(applicant);
    setResumeLoading(true);
    try {
      const response = await api.get(`/applications/${applicant.id}`);
      const mappedResume = mapResumeData(response.data);
      setResume(mappedResume);
      if (onApplicantSelect) {
        onApplicantSelect(applicant, index);
      }
      if (onResumeLoad) {
        onResumeLoad(mappedResume);
      }
    } catch (err) {
      setResume(null);
    } finally {
      setResumeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-blue-600">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-row gap-4 items-stretch" style={{ minHeight: 500 }}>
      <div className="flex flex-col min-w-[320px] max-w-[500px] h-[600px]">
        {/* 지원자 리스트 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            지원자 목록 ({filteredApplicants.length}명)
          </h3>
          {/* 필터 및 정렬 버튼을 오른쪽 상단에 배치 */}
          <div className="flex gap-2 flex-row-reverse">
            <button 
              onClick={() => setSortConfig(prev => ({ type: 'score', isDesc: !prev.isDesc }))}
              className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                sortConfig.type === 'score'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              } border`}
                          >
                {sortConfig.type === 'score' ? (sortConfig.isDesc ? 'AI점수↓' : 'AI점수↑') : 'AI점수'}
              </button>
            <button onClick={() => setActiveTab('ALL')} className={getButtonStyle('ALL', activeTab)}>전체</button>
            <button onClick={() => setActiveTab('SUITABLE')} className={getButtonStyle('SUITABLE', activeTab)}>합격</button>
            <button onClick={() => setActiveTab('UNSUITABLE')} className={getButtonStyle('UNSUITABLE', activeTab)}>불합격</button>
            <button onClick={() => setActiveTab('EXCLUDED')} className={getButtonStyle('EXCLUDED', activeTab)}>제외</button>
          </div>
        </div>
        {filterConditions && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            필터: {filterConditions}
          </p>
        )}
        <div className="space-y-2 flex-1 overflow-y-auto" style={{height: '100%'}}>
          {filteredApplicants.length > 0 ? (
            filteredApplicants.map((applicant, index) => (
              <ApplicantCard
                key={applicant.id}
                applicant={applicant}
                index={index + 1}
                isSelected={selectedApplicant && selectedApplicant.id === applicant.id}
                splitMode={showResumeDetail}
                bookmarked={applicant.isBookmarked === 'Y'}
                onClick={() => handleApplicantClick(applicant, index)}
                onBookmarkToggle={() => {
                  setFilteredApplicants(prev => prev.map((a, i) =>
                    i === index ? { ...a, isBookmarked: a.isBookmarked === 'Y' ? 'N' : 'Y' } : a
                  ));
                  setApplicants(prev => prev.map((a, i) =>
                    applicants.indexOf(applicant) === i ? { ...a, isBookmarked: a.isBookmarked === 'Y' ? 'N' : 'Y' } : a
                  ));
                }}
                calculateAge={calculateAge}
                compact={compact}
              />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              조건에 맞는 지원자가 없습니다.
            </div>
          )}
        </div>
      </div>
      {/* 이력서 상세 */}
      <div className="flex flex-col flex-1 min-w-[200px] h-[600px] overflow-y-auto">
        <ResumeCard 
          resume={resume} 
          loading={resumeLoading} 
          jobpostId={jobPostId} 
          applicationId={selectedApplicant?.id}
        />
      </div>
    </div>
  );
};

export default CommonResumeList; 