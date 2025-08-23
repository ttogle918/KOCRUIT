import React from 'react';
import { Card, CardContent, Typography, Chip } from '@mui/material';

const ApplicantListFull = ({ applicants, selectedApplicant, onSelectApplicant }) => {
  return (
    <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 md:p-6 h-full">
      <CardContent className="p-0 h-full">
        <Typography variant="h5" component="h3" className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-900 dark:text-gray-100">
          지원자 목록
        </Typography>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 h-full overflow-y-auto">
          {applicants.map((applicant) => (
            <div key={applicant.applicant_id || applicant.id}>
              <Card
                onClick={() => onSelectApplicant(applicant)}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedApplicant?.id === (applicant.applicant_id || applicant.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-2xl scale-105'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 shadow-md'
                }`}
              >
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <Typography variant="h4" component="span" className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                      {applicant.name.charAt(0)}
                    </Typography>
                  </div>
                  <Typography variant="h6" component="div" className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm sm:text-base">
                    {applicant.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" className="text-xs sm:text-sm mb-2">
                    {applicant.schedule_date || '시간 미정'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" className="text-xs">
                    ID: {applicant.applicant_id || applicant.id}
                  </Typography>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApplicantListFull;
