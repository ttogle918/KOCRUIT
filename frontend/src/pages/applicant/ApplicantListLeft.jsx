import React, { useState, useEffect, useRef, useMemo } from 'react';
import ApplicantCard from '../../components/ApplicantCard';
import { getButtonStyle } from '../../utils/styleUtils';

function ApplicantListLeft({
  applicants = [],
  splitMode,
  selectedApplicantIndex,
  onSelectApplicant,
  handleApplicantClick,
  handleCloseDetailedView, 
  bookmarkedList = [],
  toggleBookmark,
  calculateAge,
  onFilteredApplicantsChange,
  compact = false,
  onBatchReEvaluate,
  loading = false,
}) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ type: 'score', isDesc: true });
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  // 선택된 카드 ref
  const selectedCardRef = useRef(null);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // filteredApplicants는 useMemo로 계산
  const filteredApplicants = useMemo(() => {
    let filtered = Array.isArray(applicants) ? [...applicants] : [];
    const allowedStatuses = ['WAITING', 'SUITABLE', 'UNSUITABLE', 'REJECTED', 'PASSED'];
    const allowedDocumentStatuses = ['PENDING', 'REVIEWING', 'PASSED', 'REJECTED'];
    
    // status와 document_status 모두 확인
    filtered = filtered.filter(app => {
      const status = (app.status || '').toUpperCase();
      const documentStatus = (app.document_status || '').toUpperCase();
      return allowedStatuses.includes(status) || allowedDocumentStatuses.includes(documentStatus);
    });
    
    if (activeTab === 'EXCLUDED') {
      filtered = filtered.filter(app => app.score <= 20);
    } else if (activeTab === 'UNSUITABLE') {
      filtered = filtered.filter(app => app.score > 20 && app.score <= 60);
    } else if (activeTab === 'SUITABLE') {
      filtered = filtered.filter(app => app.score > 60);
    }
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (showBookmarkedOnly) {
      filtered = filtered.filter((_, index) => bookmarkedList[index]);
    }
    filtered.sort((a, b) => {
      if (sortConfig.type === 'score') {
        return sortConfig.isDesc ? b.score - a.score : a.score - b.score;
      } else {
        const dateA = new Date(a.appliedAt);
        const dateB = new Date(b.appliedAt);
        return sortConfig.isDesc ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      }
    });
    return filtered;
  }, [
    applicants, activeTab, searchQuery, sortConfig,
    showBookmarkedOnly, bookmarkedList,
  ]);

  // 자동 스크롤: 선택된 카드가 바뀔 때 해당 카드로 스크롤
  useEffect(() => {
    if (selectedCardRef.current) {
      selectedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedApplicantIndex, filteredApplicants]);

  // 부모에게 변경 알림이 필요할 때만
  useEffect(() => {
    if (onFilteredApplicantsChange) {
      onFilteredApplicantsChange(filteredApplicants);
    }
  }, [filteredApplicants, onFilteredApplicantsChange]);

  return (
    <div className="flex flex-col w-full h-full p-2 overflow-y-auto">
      {/* 상단 필터/정렬 */}
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4 relative">
          {/* 검색창 */}
          <input
            type="text"
            placeholder="이름 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs h-7"
            style={{ minWidth: 100 }}
          />
          {/* AI 점수 초기화 및 재평가 버튼 */}
          {onBatchReEvaluate && (
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors text-xs font-semibold"
              onClick={onBatchReEvaluate}
              disabled={loading}
            >
              {loading ? '초기화 중...' : 'AI 점수 초기화'}
            </button>
          )}
          <div className="flex-1" />
          {/* 탭 필터 */}
          <div className="flex flex-row gap-0.5 ml-2">
            <button onClick={() => setActiveTab('ALL')} className={getButtonStyle('ALL', activeTab)}>전체</button>
            <button onClick={() => setActiveTab('SUITABLE')} className={getButtonStyle('SUITABLE', activeTab)}>합격</button>
            <button onClick={() => setActiveTab('UNSUITABLE')} className={getButtonStyle('UNSUITABLE', activeTab)}>불합격</button>
            <button onClick={() => setActiveTab('EXCLUDED')} className={getButtonStyle('EXCLUDED', activeTab)}>제외</button>
          </div>
          <div className="flex-1" />
          {/* Vertical Ellipsis & Dropdown */}
          <div className="relative ml-2" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((open) => !open)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
              aria-label="더보기"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-3 flex flex-col gap-2">
                <button
                  onClick={() => setSortConfig(prev => ({ type: 'score', isDesc: !prev.isDesc }))}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                    sortConfig.type === 'score'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  } border`}
                >
                  {sortConfig.type === 'score' ? (sortConfig.isDesc ? '점수↓' : '점수↑') : '점수'}
                </button>
                <button
                  onClick={() => setSortConfig(prev => ({ type: 'date', isDesc: !prev.isDesc }))}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                    sortConfig.type === 'date'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  } border`}
                >
                  {sortConfig.type === 'date' ? (sortConfig.isDesc ? '지원일↓' : '지원일↑') : '지원일'}
                </button>
                <button
                  onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-all border ${
                    showBookmarkedOnly 
                      ? 'bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-500 dark:border-yellow-600' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  북마크 {showBookmarkedOnly ? '✓' : ''}
                </button>
              </div>
            )}
          </div>
        </div>
        {/* 리스트 */}
        <div className="flex flex-col gap-2">
          {filteredApplicants.length > 0 ? (
            filteredApplicants.map((applicant, index) => {
              const globalIndex = applicants.findIndex((a) => a.id === applicant.id);
              // isSelected: splitMode가 true일 때만 selectedApplicantIndex로 파란 테두리, false면 선택 없음
              const isSelected = splitMode && selectedApplicantIndex === globalIndex;
              return (
                <ApplicantCard
                  key={applicant.id}
                  ref={isSelected ? selectedCardRef : null}
                  applicant={applicant}
                  index={index + 1}
                  isSelected={isSelected}
                  splitMode={splitMode}
                  bookmarked={bookmarkedList[globalIndex]}
                  onClick={() => {
                    console.log('🎯 ApplicantCard 클릭됨:', { 
                      applicant: applicant.name, 
                      globalIndex, 
                      splitMode, 
                      isSelected 
                    });
                    
                    // 단순화된 클릭 핸들러
                    if (splitMode) {
                      if (isSelected) {
                        console.log('📱 상세보기 닫기');
                        handleCloseDetailedView();
                      } else {
                        console.log('📱 다른 지원자 선택');
                        onSelectApplicant(applicant, globalIndex);
                      }
                    } else {
                      console.log('📱 이력서 상세보기 열기');
                      handleApplicantClick(applicant, globalIndex);
                    }
                  }}
                  onBookmarkToggle={() => toggleBookmark(globalIndex)}
                  calculateAge={calculateAge}
                  compact={compact}
                />
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-6 text-xs">지원자가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplicantListLeft;
