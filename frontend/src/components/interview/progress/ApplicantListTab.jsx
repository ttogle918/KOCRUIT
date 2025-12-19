import React from 'react';
import { Typography, Chip } from '@mui/material';
import ApplicantCardWithInterviewStatus from '../ApplicantCardWithInterviewStatus';

const ApplicantListTab = ({ 
  filteredApplicants, 
  selectedApplicant, 
  handleSelectApplicant, 
  interviewStage,
  filterStatus,
  setFilterStatus 
}) => {
  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 md:p-6 flex-1 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <Typography variant="h5" component="h3" className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
          지원자 목록
        </Typography>
        {filterStatus && (
          <Chip 
            label={`${filterStatus === 'PASSED' ? '합격자' : '불합격자'}만 보기`} 
            onDelete={() => setFilterStatus(null)}
            color={filterStatus === 'PASSED' ? 'primary' : 'error'}
            size="small"
          />
        )}
      </div>
      <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {filteredApplicants.length > 0 ? (
          filteredApplicants.map((applicant, index) => (
            <ApplicantCardWithInterviewStatus
              key={applicant.applicant_id || applicant.id}
              applicant={applicant}
              index={index + 1}
              isSelected={selectedApplicant?.id === (applicant.applicant_id || applicant.id)}
              onClick={() => handleSelectApplicant(applicant)}
              calculateAge={calculateAge}
              compact={true}
              interviewStage={interviewStage}
              showInterviewStatus={true}
            />
          ))
        ) : (
          <div className="text-center py-10 text-gray-500">
            해당 조건의 지원자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicantListTab;

