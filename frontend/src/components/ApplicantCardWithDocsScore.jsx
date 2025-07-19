// src/components/ApplicantCardWithDocsScore.jsx
import React, { forwardRef } from 'react';
import ApplicantCard from './ApplicantCard';

const ApplicantCardWithDocsScore = forwardRef(({
  applicant,
  index,
  isSelected,
  splitMode,
  bookmarked,
  onClick,
  onBookmarkToggle,
  calculateAge,
  compact = false,
  showCompact = false,
}, ref) => {
  return (
    <div className="relative">
      {/* 서류 점수 표시 - 카드 위쪽에 배치 */}
      <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg border border-blue-400 z-10 ${compact ? 'text-[10px] px-2 py-0.5' : ''}`}>
        서류 {applicant.ai_score || 0}점
      </div>
      
      {/* 상단 여백을 위한 div */}
      <div className="pt-3">
        <ApplicantCard
          ref={ref}
          applicant={applicant}
          index={index}
          isSelected={isSelected}
          splitMode={splitMode}
          bookmarked={bookmarked}
          onClick={onClick}
          onBookmarkToggle={onBookmarkToggle}
          calculateAge={calculateAge}
          compact={compact}
          showCompact={showCompact}
        />
      </div>
    </div>
  );
});

export default ApplicantCardWithDocsScore; 