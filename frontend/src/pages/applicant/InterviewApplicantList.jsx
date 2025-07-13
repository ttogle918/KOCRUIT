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
  onSelectApplicant,
  handleApplicantClick,
  handleCloseDetailedView,
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
            {grouped[time].map((applicant) => {
              const id = applicant.applicant_id || applicant.id;
              const isSelected = selectedApplicantId === id;
              return (
                <ApplicantCard
                  key={id}
                  applicant={applicant}
                  isSelected={isSelected}
                  splitMode={splitMode}
                  bookmarked={false}
                  onClick={() => {
                    console.log('클릭된 applicant:', applicant);
                    if (splitMode && isSelected) {
                      handleCloseDetailedView && handleCloseDetailedView();
                    } else {
                      onSelectApplicant && onSelectApplicant(applicant);
                    }
                  }}
                  onBookmarkToggle={() => {}}
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