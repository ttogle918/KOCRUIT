// src/components/ApplicantCard.jsx
import React, { forwardRef } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';

const ApplicantCard = forwardRef(({
  applicant,
  index,
  isSelected,
  splitMode,
  bookmarked,
  onClick,
  onBookmarkToggle,
  calculateAge,
  compact = false,
}, ref) => {
  return (
    <div ref={ref} className={`${compact ? 'p-1' : ''}`}> {/* 바깥 div는 padding/마진만 */}
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-3xl flex items-center gap-2 cursor-pointer transition-all duration-300 ease-in-out ${compact ? 'p-2' : 'p-4'} 
          ${isSelected ? 'border-2 border-blue-500 ring-1 ring-blue-300 bg-blue-50 dark:bg-blue-900 shadow-lg scale-[1.01]' : 'border border-gray-200'}
        `}
        style={isSelected ? { boxShadow: '0 0 0 2px #3b82f6, 0 2px 12px 0 rgba(59,130,246,0.10)' } : {}}
        onClick={() => { onClick && onClick(); }}
      >
        {/* 번호 */}
        <div className={`absolute top-1 left-2 text-xs font-bold text-blue-600 ${compact ? 'text-[10px]' : ''}`}>{index}</div>

        {/* 즐겨찾기 별 버튼 */}
        <button
          className={`absolute top-1 right-2 transition-all duration-200 ease-in-out ${compact ? 'text-base' : 'text-xl'}`}
          onClick={e => {
            e.stopPropagation();
            onBookmarkToggle();
          }}
        >
          {bookmarked ? (
            <FaStar className="text-yellow-500 drop-shadow-sm hover:text-yellow-600 transition-colors duration-200" />
          ) : (
            <FaRegStar className="text-gray-400 hover:text-yellow-400 transition-colors duration-200" />
          )}
        </button>

        {/* 프로필 이미지 */}
        <div className={`flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-gray-300`}>
          <i className="fa-solid fa-user text-white text-xl" />
        </div>

        {/* 중앙 텍스트 정보 */}
        <div className="flex flex-col flex-grow">
          <div className={`text-xs text-gray-500 dark:text-gray-400 text-right ${compact ? 'text-[10px]' : ''}`}>
            {new Date(applicant.appliedAt).toLocaleDateString()}
          </div>
          <div className={`font-semibold text-gray-800 dark:text-white ${compact ? 'text-xs' : 'text-lg'}`}>
            {applicant.name} ({calculateAge(applicant.birthDate)}세)
          </div>
          <div className={`text-gray-500 dark:text-gray-400 ${compact ? 'text-[11px]' : 'text-sm'}`}>
            {applicant.applicationSource || 'DIRECT'}
          </div>
        </div>

        {/* 점수 원 */}
        <div className={`flex flex-col items-center justify-center ${compact ? 'w-12 h-12' : 'w-20 h-20'}`}>
          <div className={`font-bold text-gray-800 dark:text-white border-2 border-blue-300 rounded-full flex items-center justify-center ${compact ? 'w-10 h-10 text-xs' : 'w-16 h-16 text-sm'}`}>
            {applicant.ai_score || 0}점
          </div>
          {applicant.ai_score && (
            <div className={`text-xs text-blue-600 dark:text-blue-400 mt-1 ${compact ? 'text-[10px]' : ''}`}>
              AI: {applicant.ai_score}점
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ApplicantCard;
