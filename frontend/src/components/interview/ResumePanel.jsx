import React from 'react';
import { Card, CardContent, Typography, Chip, Stack, Skeleton } from '@mui/material';
import { mapResumeData } from '../../utils/resumeUtils';

const ResumePanel = ({ resume, loading }) => {
  if (loading) {
    return (
      <Card className="h-full">
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="90%" height={20} />
        </CardContent>
      </Card>
    );
  }

  if (!resume) {
    return (
      <Card className="h-full">
        <CardContent>
          <Typography variant="h6" color="textSecondary" align="center">
            이력서 정보가 없습니다
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const mappedResume = mapResumeData(resume);

  return (
    <Card className="h-full">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          이력서 정보
        </Typography>
        
        <Stack spacing={2}>
          <div>
            <Typography variant="subtitle2" color="textSecondary">
              지원자명
            </Typography>
            <Typography variant="body1">
              {mappedResume.name || '정보 없음'}
            </Typography>
          </div>

          <div>
            <Typography variant="subtitle2" color="textSecondary">
              연락처
            </Typography>
            <Typography variant="body1">
              {mappedResume.phone || '정보 없음'}
            </Typography>
          </div>

          <div>
            <Typography variant="subtitle2" color="textSecondary">
              이메일
            </Typography>
            <Typography variant="body1">
              {mappedResume.email || '정보 없음'}
            </Typography>
          </div>

          <div>
            <Typography variant="subtitle2" color="textSecondary">
              학력
            </Typography>
            <Typography variant="body1">
              {mappedResume.education || '정보 없음'}
            </Typography>
          </div>

          <div>
            <Typography variant="subtitle2" color="textSecondary">
              경력
            </Typography>
            <Typography variant="body1">
              {mappedResume.experience || '정보 없음'}
            </Typography>
          </div>

          {mappedResume.skills && mappedResume.skills.length > 0 && (
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                주요 기술
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {mappedResume.skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    size="small"
                    variant="outlined"
                    className="mb-1"
                  />
                ))}
              </Stack>
            </div>
          )}

          {mappedResume.certificates && mappedResume.certificates.length > 0 && (
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                자격증
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {mappedResume.certificates.map((cert, index) => (
                  <Chip
                    key={index}
                    label={cert}
                    size="small"
                    variant="outlined"
                    className="mb-1"
                  />
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ResumePanel;
