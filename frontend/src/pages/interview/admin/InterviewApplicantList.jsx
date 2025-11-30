import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ApplicantCardWithDocsScore from '../../../../components/ApplicantCardWithDocsScore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

dayjs.extend(utc);
dayjs.extend(timezone);

function groupApplicantsByTime(applicants) {
  const groups = {};
  applicants.forEach(applicant => {
    const time = applicant.schedule_date
      ? dayjs.utc(applicant.schedule_date).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm')
      : '?úÍ∞Ñ ÎØ∏Ï†ï';
    if (!groups[time]) groups[time] = [];
    groups[time].push(applicant);
  });
  return groups;
}

function InterviewApplicantList({
  applicants = [],
  selectedApplicantId,
  selectedApplicantIndex,
  onSelectApplicant,
  handleApplicantClick,
  handleCloseDetailedView,
  toggleBookmark,
  bookmarkedList = [],
  selectedCardRef,
  compact = false,
  splitMode = false,
  calculateAge,
  showAll = false,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const grouped = groupApplicantsByTime(applicants);
  const times = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col w-full h-full">
      {/* ?¥Í∏∞/?´Í∏∞ Î≤ÑÌäº */}
      <div className="flex justify-center mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {isExpanded ? (
            <>
              <FiChevronUp size={14} />
              <span>?ëÍ∏∞</span>
            </>
          ) : (
            <>
              <FiChevronDown size={14} />
              <span>?ºÏπòÍ∏?/span>
            </>
          )}
        </button>
      </div>
      
      {/* ÏßÄ?êÏûê Î™©Î°ù */}
      <div 
        className={`flex flex-col gap-2 transition-all duration-300 ${!isExpanded && !showAll ? 'max-h-32 overflow-hidden' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {times.map(time => (
        <Accordion key={time} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{time}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {grouped[time].map((applicant, localIndex) => {
              const id = applicant.applicant_id || applicant.id;
              const isSelected = selectedApplicantId === id;
              const globalIndex = applicants.findIndex(a => (a.applicant_id || a.id) === id);
              
              return (
                <ApplicantCardWithDocsScore
                  key={applicant.id}
                  ref={isSelected ? selectedCardRef : null}
                  applicant={applicant}
                  index={localIndex + 1} // ?úÍ∞ÑÎ≥??∏Îç±?±ÏúºÎ°?Î≥ÄÍ≤?
                  isSelected={isSelected}
                  splitMode={splitMode}
                  bookmarked={bookmarkedList[globalIndex]}
                  onClick={() => {
                    if (splitMode && isSelected) {
                      handleCloseDetailedView();
                    } else if (splitMode && !isSelected) {
                      onSelectApplicant(applicant, globalIndex);
                    } else {
                      handleApplicantClick(applicant, globalIndex);
                    }
                  }}
                  onBookmarkToggle={() => toggleBookmark(globalIndex)}
                  calculateAge={calculateAge}
                  compact={compact}
                  showCompact={!isHovered} // ?∏Î≤Ñ ?ÅÌÉú???∞Î•∏ Ïª¥Ìå©??Î™®Îìú
                />
              );
            })}
          </AccordionDetails>
        </Accordion>
      ))}
      </div>
    </div>
  );
}

export default InterviewApplicantList; 
