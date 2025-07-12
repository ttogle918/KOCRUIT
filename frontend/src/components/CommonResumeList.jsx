import React, { useState, useEffect } from 'react';
import ApplicantCard from './ApplicantCard';
import ResumeCard from './ResumeCard';
import api from '../api/api';
import { getEducationStats, getGenderStats } from '../utils/applicantStats';
import { calculateAge, mapResumeData } from '../utils/resumeUtils';
import { getButtonStyle } from '../utils/styleUtils';
import { parseFilterConditions } from '../utils/filterUtils';
// react-window import 제거





const CommonResumeList = ({ 
  jobPostId, 
  filterConditions = null, 
  onFilteredResults = null,
  showResumeDetail = true,
  compact = false,
  onApplicantSelect = null,
  onResumeLoad = null
}) => {
  const [applicants, setApplicants] = useState([]);
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [selectedApplicantIndex, setSelectedApplicantIndex] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 필터 탭 상태 추가

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

    fetchApplicants();
  }, [jobPostId]);

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
    setFilteredApplicants(filtered);
    if (onFilteredResults) {
      onFilteredResults({
        totalCount: applicants.length,
        filteredCount: filtered.length,
        results: filtered
      });
    }
  }, [filterConditions, applicants, onFilteredResults, activeTab]);

  // 지원자 통계 계산 (예시)
  const educationStats = getEducationStats(filteredApplicants);
  const genderStats = getGenderStats(filteredApplicants);

  // 지원자 클릭 핸들러
  const handleApplicantClick = async (applicant, index) => {
    setSelectedApplicantIndex(index);
    setResume(null);
    setResumeLoading(true);
    
    try {
      const response = await api.get(`/applications/${applicant.id}`);
      const mappedResume = mapResumeData(response.data);
      setResume(mappedResume);
      setSelectedApplicant(applicant);
      
      // 부모 컴포넌트에 알림
      if (onApplicantSelect) {
        onApplicantSelect(applicant, index);
      }
      if (onResumeLoad) {
        onResumeLoad(mappedResume);
      }
    } catch (err) {
      console.error('이력서 상세 로드 실패:', err);
      setResume(null);
    } finally {
      setResumeLoading(false);
    }
  };

  // 상세 보기 닫기
  const handleCloseDetail = () => {
    setSelectedApplicant(null);
    setResume(null);
    setSelectedApplicantIndex(null);
    // 만약 showResumeDetail이 상태라면 아래도 추가
    // setShowResumeDetail(false);
    // 강제 리렌더링
    setFilteredApplicants(prev => [...prev]);
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
    <div className="flex h-full">
      {/* 지원자 리스트 */}
      <div className={`${showResumeDetail && selectedApplicant ? 'w-1/2' : 'w-full'} pr-4`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            지원자 목록 ({filteredApplicants.length}명)
          </h3>
          {/* 필터 버튼을 오른쪽 상단에 배치 */}
          <div className="flex gap-2 flex-row-reverse">
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
        
        <div className="space-y-2 h-full overflow-y-auto">
          {filteredApplicants.length > 0 ? (
            filteredApplicants.map((applicant, index) => (
              <ApplicantCard
                key={applicant.id}
                applicant={applicant}
                index={index + 1}
                isSelected={selectedApplicantIndex === null ? false : selectedApplicantIndex === index}
                splitMode={showResumeDetail}
                bookmarked={applicant.isBookmarked === 'Y'}
                onClick={() => handleApplicantClick(applicant, index)}
                onBookmarkToggle={() => {
                  // 북마크 상태 토글 (로컬 상태)
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
      {showResumeDetail && selectedApplicant && (
        <div className="w-1/2 pl-4 border-l border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <button
              onClick={handleCloseDetail}
              className="text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-2"
              aria-label="뒤로가기"
            >
              ←
            </button>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              이력서 상세
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <ResumeCard 
              resume={resume} 
              loading={resumeLoading}
              bookmarked={resume?.isBookmarked === 'Y'}
              onBookmarkToggle={() => {
                setFilteredApplicants(prev => prev.map((a, i) =>
                  i === selectedApplicantIndex ? { ...a, isBookmarked: a.isBookmarked === 'Y' ? 'N' : 'Y' } : a
                ));
                setApplicants(prev => prev.map((a, i) =>
                  i === selectedApplicantIndex ? { ...a, isBookmarked: a.isBookmarked === 'Y' ? 'N' : 'Y' } : a
                ));
                setSelectedApplicant(prev => prev ? { ...prev, isBookmarked: prev.isBookmarked === 'Y' ? 'N' : 'Y' } : prev);
                setResume(prev => prev ? { ...prev, isBookmarked: prev.isBookmarked === 'Y' ? 'N' : 'Y' } : prev);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CommonResumeList; 