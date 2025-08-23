import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Schedule as PendingIcon,
  PlayArrow as ProgressIcon
} from '@mui/icons-material';

const InterviewStatistics = ({ statistics, loading = false }) => {
  if (loading || !statistics) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            면접 통계
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  const { total_applications, ai_interview, practical_interview, executive_interview } = statistics;

  const getStatusColor = (type) => {
    switch (type) {
      case 'passed': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'passed': return <CheckIcon />;
      case 'failed': return <CancelIcon />;
      case 'pending': return <PendingIcon />;
      case 'in_progress': return <ProgressIcon />;
      default: return null;
    }
  };

  const renderInterviewStageStats = (stageData, stageName, stageLabel) => {
    const { passed, failed, pending, in_progress, total } = stageData;
    
    return (
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              {stageLabel}
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                전체: {total}명
              </Typography>
            </Box>

            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Chip
                    icon={getStatusIcon('passed')}
                    label={`${passed}명`}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    합격
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Chip
                    icon={getStatusIcon('failed')}
                    label={`${failed}명`}
                    color="error"
                    variant="outlined"
                    size="small"
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    불합격
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Chip
                    icon={getStatusIcon('pending')}
                    label={`${pending}명`}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    대기
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Chip
                    icon={getStatusIcon('in_progress')}
                    label={`${in_progress}명`}
                    color="info"
                    variant="outlined"
                    size="small"
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    진행중
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* 진행률 표시 */}
            {total > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  진행률: {Math.round(((passed + failed + in_progress) / total) * 100)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={((passed + failed + in_progress) / total) * 100}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          면접 통계
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          전체 지원자: {total_applications}명
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {renderInterviewStageStats(ai_interview, 'ai', 'AI 면접')}
          {renderInterviewStageStats(practical_interview, 'practical', '실무진 면접')}
          {renderInterviewStageStats(executive_interview, 'executive', '임원진 면접')}
        </Grid>

        {/* 요약 통계 */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            📊 요약
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                AI 면접 합격률
              </Typography>
              <Typography variant="h6" color="success.main">
                {ai_interview.total > 0 ? Math.round((ai_interview.passed / ai_interview.total) * 100) : 0}%
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                실무진 면접 합격률
              </Typography>
              <Typography variant="h6" color="success.main">
                {practical_interview.total > 0 ? Math.round((practical_interview.passed / practical_interview.total) * 100) : 0}%
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                임원진 면접 합격률
              </Typography>
              <Typography variant="h6" color="success.main">
                {executive_interview.total > 0 ? Math.round((executive_interview.passed / executive_interview.total) * 100) : 0}%
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InterviewStatistics;
