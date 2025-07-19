import React, { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FaStar, FaRegStar } from 'react-icons/fa';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

function groupApplicantsByTime(applicants) {
  const groups = {};
  applicants.forEach(applicant => {
    const time = applicant.schedule_date
      ? dayjs.utc(applicant.schedule_date).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm')
      : '시간 미정';
    if (!groups[time]) groups[time] = [];
    groups[time].push(applicant);
  });
  return groups;
}

const RecommendedApplicantCard = ({
  applicant,
  index,
  isSelected,
  bookmarked,
  onClick,
  onBookmarkToggle,
  calculateAge = () => ''
}) => {
  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-lg border cursor-pointer transition-all duration-300 ease-in-out p-3 mb-2
        ${isSelected 
          ? 'border-2 border-blue-500 ring-1 ring-blue-300 bg-blue-50 dark:bg-blue-900 shadow-lg scale-[1.02]' 
          : 'border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
        }
      `}
      onClick={onClick}
    >
      {/* 번호 */}
      <div className="absolute top-2 left-2 text-xs font-bold text-blue-600">
        {index}
      </div>

      {/* 서류 점수 */}
      <div className="absolute top-2 right-8 text-xs font-semibold text-blue-600 dark:text-blue-400">
        서류: {applicant.ai_score || 0}점
      </div>

      {/* 즐겨찾기 별 버튼 */}
      <button
        className="absolute top-2 right-2 transition-all duration-200 ease-in-out text-lg"
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
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-300 mt-4">
        <i className="fa-solid fa-user text-white text-lg" />
      </div>

      {/* 지원자 정보 */}
      <div className="flex flex-col flex-grow mt-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
          {new Date(applicant.appliedAt).toLocaleDateString()}
        </div>
        <div className="font-semibold text-gray-800 dark:text-white text-sm">
          {applicant.name} ({calculateAge(applicant.birthDate)}세)
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-xs">
          {applicant.applicationSource || 'DIRECT'}
        </div>
      </div>

      {/* 점수 원 */}
      <div className="flex flex-col items-center justify-center mt-2">
        <div className="font-bold text-gray-800 dark:text-white border-2 border-blue-300 rounded-full flex items-center justify-center w-12 h-12 text-sm">
          {applicant.ai_score || 0}점
        </div>
        {applicant.ai_score && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            AI: {applicant.ai_score}점
          </div>
        )}
      </div>
    </div>
  );
};

const RecommendedApplicantList = ({
  applicants = [],
  selectedApplicantId,
  onSelectApplicant,
  handleApplicantClick,
  toggleBookmark,
  bookmarkedList = [],
  calculateAge = () => ''
}) => {
  const grouped = groupApplicantsByTime(applicants);
  const times = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col w-full h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-300 dark:border-gray-600">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">면접 시간별 지원자</h3>
      </div>

      {/* 지원자 목록 */}
      <div className="flex-1 overflow-y-auto">
        {times.map(time => (
          <Accordion key={time} defaultExpanded>
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{
                backgroundColor: 'rgb(249 250 251)',
                '&:hover': {
                  backgroundColor: 'rgb(243 244 246)'
                }
              }}
            >
              <div className="flex items-center justify-between w-full pr-4">
                <Typography fontWeight="bold" className="text-gray-700 dark:text-gray-300">
                  {time}
                </Typography>
                <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {grouped[time].length}명
                </span>
              </div>
            </AccordionSummary>
            <AccordionDetails>
              <div className="space-y-2">
                {grouped[time].map((applicant, localIndex) => {
                  const id = applicant.applicant_id || applicant.id;
                  const isSelected = selectedApplicantId === id;
                  const globalIndex = applicants.findIndex(a => (a.applicant_id || a.id) === id);
                  
                  return (
                    <RecommendedApplicantCard
                      key={applicant.id}
                      applicant={applicant}
                      index={localIndex + 1}
                      isSelected={isSelected}
                      bookmarked={bookmarkedList[globalIndex]}
                      onClick={() => handleApplicantClick(applicant, globalIndex)}
                      onBookmarkToggle={() => toggleBookmark(globalIndex)}
                      calculateAge={calculateAge}
                    />
                  );
                })}
              </div>
            </AccordionDetails>
          </Accordion>
        ))}
      </div>
    </div>
  );
};

export default RecommendedApplicantList; 