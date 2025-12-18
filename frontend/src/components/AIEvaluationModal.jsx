import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  CircularProgress,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import { 
  CheckCircle, 
  Cancel, 
  Star, 
  StarBorder,
  TrendingUp,
  TrendingDown,
  Psychology
} from '@mui/icons-material';
import api from '../api/interviewApi';

const AIEvaluationModal = ({ 
  open, 
  onClose, 
  applicant, 
  onProceedToInterview,
  jobPostId 
}) => {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && applicant) {
      fetchAIEvaluation();
    }
  }, [open, applicant]);

  const fetchAIEvaluation = async () => {
    if (!applicant || !jobPostId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // AI 평가 결과 조회
      const response = await api.get(`/applications/${applicant.id}/ai-evaluation`);
      setEvaluation(response.data);
    } catch (err) {
      console.error('AI 평가 결과 조회 실패:', err);
      setError('AI 평가 결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToInterview = () => {
    onProceedToInterview(applicant);
    onClose();
  };

  const renderScore = (score) => {
    const stars = [];
    for (let i = 1; i <= 10; i++) {
      stars.push(
        <Star 
          key={i} 
          sx={{ 
            color: i <= score ? '#fbbf24' : '#e5e7eb',
            fontSize: '1.2rem'
          }} 
        />
      );
    }
    return <Box display="flex" gap={0.5}>{stars}</Box>;
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981'; // green
    if (score >= 6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getScoreText = (score) => {
    if (score >= 8) return '우수';
    if (score >= 6) return '보통';
    return '미흡';
  };

  if (!applicant) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        borderBottom: '1px solid #e5e7eb'
      }}>
        <Psychology sx={{ color: '#3b82f6' }} />
        <Typography variant="h6">
          AI 평가 결과 - {applicant.name}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : evaluation ? (
          <Box>
            {/* 전체 점수 */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp sx={{ color: '#3b82f6' }} />
                전체 평가 점수
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    color: getScoreColor(evaluation.total_score),
                    fontWeight: 'bold'
                  }}
                >
                  {evaluation.total_score}/10
                </Typography>
                <Chip 
                  label={getScoreText(evaluation.total_score)}
                  color={evaluation.total_score >= 8 ? 'success' : evaluation.total_score >= 6 ? 'warning' : 'error'}
                  sx={{ fontSize: '1rem', height: '32px' }}
                />
              </Box>
              {renderScore(evaluation.total_score)}
            </Box>

            {/* 세부 평가 항목 */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              세부 평가 항목
            </Typography>
            <Box sx={{ mb: 3 }}>
              {evaluation.evaluation_items?.map((item, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e5e7eb', borderRadius: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {item.criterion}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography 
                        variant="h6" 
                        sx={{ color: getScoreColor(item.score) }}
                      >
                        {item.score}/10
                      </Typography>
                      <Chip 
                        label={getScoreText(item.score)}
                        color={item.score >= 8 ? 'success' : item.score >= 6 ? 'warning' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {item.description}
                  </Typography>
                  {renderScore(item.score)}
                </Box>
              ))}
            </Box>

            {/* 합격/불합격 판정 */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                {evaluation.is_passed ? (
                  <CheckCircle sx={{ color: '#10b981' }} />
                ) : (
                  <Cancel sx={{ color: '#ef4444' }} />
                )}
                AI 판정 결과
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Chip 
                  label={evaluation.is_passed ? '합격' : '불합격'}
                  color={evaluation.is_passed ? 'success' : 'error'}
                  icon={evaluation.is_passed ? <CheckCircle /> : <Cancel />}
                  sx={{ fontSize: '1.1rem', height: '36px' }}
                />
                <Typography variant="body1" color="text.secondary">
                  {evaluation.is_passed ? 'AI가 합격을 권장합니다.' : 'AI가 불합격을 권장합니다.'}
                </Typography>
              </Box>
            </Box>

            {/* 합격/불합격 사유 */}
            {evaluation.pass_reason && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  합격 사유
                </Typography>
                <Typography variant="body1" sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                  {evaluation.pass_reason}
                </Typography>
              </Box>
            )}

            {evaluation.fail_reason && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  불합격 사유
                </Typography>
                <Typography variant="body1" sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 1 }}>
                  {evaluation.fail_reason}
                </Typography>
              </Box>
            )}

            {/* 평가 일시 */}
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              평가 일시: {new Date(evaluation.created_at).toLocaleString('ko-KR')}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary" textAlign="center">
            AI 평가 결과가 없습니다.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={onClose} variant="outlined">
          닫기
        </Button>
        {evaluation && (
          <Button 
            onClick={handleProceedToInterview}
            variant="contained"
            color="primary"
            startIcon={<Psychology />}
          >
            실무진 면접 진행
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AIEvaluationModal; 