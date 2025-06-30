// src/components/ApplicantCard.jsx
import React from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';


// const calculateAge = (birthDate) => {
//     if (!birthDate) return 'N/A';
//     const today = new Date();
//     const birth = new Date(birthDate);
//     let age = today.getFullYear() - birth.getFullYear();
//     const monthDiff = today.getMonth() - birth.getMonth();
    
//     if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
//       age--;
//     }
    
//     return age;
//   };


const ApplicantCard = ({
  applicant,
  index,
  isSelected,
  splitMode,
  bookmarked,
  onClick,
  onBookmarkToggle,
  calculateAge,
}) => {
  return (
    <div
      className={`transition-all duration-300 ease-in-out ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 m-1' : ''}`}
      style={{ borderRadius: '1.5rem' }}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 ease-in-out"
        // onClick={onClick}
onClick={() => {
  console.log('카드 클릭!', applicant); // 추가
  onClick && onClick();
}}

        style={{ boxSizing: 'border-box' }}
      >
        {/* 번호 */}
        <div className="absolute top-2 left-2 text-xs font-bold text-blue-600">{index}</div>

        {/* 즐겨찾기 별 버튼 */}
        <button
          className="absolute top-2 right-2 text-xl"
          onClick={e => {
            e.stopPropagation();
            onBookmarkToggle();
          }}
        >
          {bookmarked ? (
            <FaStar className="text-yellow-400" />
          ) : (
            <FaRegStar className="text-gray-400 hover:text-yellow-400" />
          )}
        </button>

        {/* 프로필 이미지 */}
        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
          <i className="fa-solid fa-user text-white text-xl" />
        </div>

        {/* 중앙 텍스트 정보 */}
        <div className="flex flex-col flex-grow">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
            {new Date(applicant.appliedAt).toLocaleDateString()}
          </div>
          <div className="text-lg font-semibold text-gray-800 dark:text-white">
            {applicant.name} ({calculateAge(applicant.birthDate)}세)
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {applicant.applicationSource || 'DIRECT'}
          </div>
        </div>

        {/* 점수 원 */}
        <div className="w-16 h-16 border-2 border-blue-300 rounded-full flex items-center justify-center text-sm font-bold text-gray-800 dark:text-white">
          {applicant.score || 0}점
        </div>
      </div>
    </div>
  );
};

export default ApplicantCard;
