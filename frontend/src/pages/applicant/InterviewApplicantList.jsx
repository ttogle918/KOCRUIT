import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ApplicantCard from '../../components/ApplicantCard';
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
}) {
  const grouped = groupApplicantsByTime(applicants);
  const times = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col w-full h-full gap-2">
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
                <ApplicantCard
                  key={applicant.id}
                  ref={isSelected ? selectedCardRef : null}
                  applicant={applicant}
                  index={globalIndex + 1}
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
                />
              );
            })}
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}

export default InterviewApplicantList; 