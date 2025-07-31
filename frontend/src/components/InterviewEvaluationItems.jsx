import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip,
  Box,
  Grid,
  Paper,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { ExpandMore, Assessment, QuestionAnswer, Star } from '@mui/icons-material';
import { getInterviewEvaluationItems } from '../api/api';

const InterviewEvaluationItems = ({ 
  resumeId, 
  applicationId = null, 
  interviewStage, 
  onScoreChange = null 
}) => {
  const [evaluationData, setEvaluationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (resumeId && interviewStage) {
      loadEvaluationItems();
    }
  }, [resumeId, applicationId, interviewStage]);

  const loadEvaluationItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInterviewEvaluationItems(resumeId, applicationId, interviewStage);
      setEvaluationData(data);
      
      // 초기 점수 설정 - 기존 점수가 있으면 사용, 없으면 0으로 초기화
      const initialScores = {};
      data.evaluation_items.forEach(item => {
        // AI 면접 평가 결과에서 기존 점수가 있으면 사용
        initialScores[item.item_name] = item.current_score || 0;
      });
      setScores(initialScores);
      
      console.log('✅ 평가 항목 로드 완료:', {
        interviewStage,
        itemCount: data.evaluation_items.length,
        totalWeight: data.total_weight,
        maxTotalScore: data.max_total_score,
        source: data.source
      });
    } catch (err) {
      console.error('❌ 평가 항목 로드 실패:', err);
      setError(err.message || '평가 항목을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (itemName, score) => {
    const newScores = { ...scores, [itemName]: score };
    setScores(newScores);
    
    if (onScoreChange) {
      onScoreChange(newScores);
    }
  };

  const calculateTotalScore = () => {
    if (!evaluationData) return 0;
    
    let totalScore = 0;
    evaluationData.evaluation_items.forEach(item => {
      const score = scores[item.item_name] || 0;
      totalScore += score * item.weight;
    });
    
    return Math.round(totalScore * 100) / 100;
  };

  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return '우수';
    if (percentage >= 60) return '양호';
    if (percentage >= 40) return '보통';
    if (percentage >= 20) return '미흡';
    return '부족';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          평가 항목을 불러오는 중...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!evaluationData) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        평가 항목을 불러올 수 없습니다.
      </Alert>
    );
  }

  return (
    <Box>
      {/* 헤더 */}
      <Card sx={{ mb: 3, backgroundColor: '#f5f5f5' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Assessment sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h2">
              {interviewStage === 'practical' ? '실무진 면접' : '임원진 면접'} 평가 항목
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                총 가중치: <strong>{evaluationData.total_weight}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                최대 점수: <strong>{evaluationData.max_total_score}점</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                현재 총점: <strong>{calculateTotalScore()}점</strong>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 평가 항목들 */}
      {evaluationData.evaluation_items.map((item, index) => (
        <Accordion key={index} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" width="100%">
              <Box flexGrow={1}>
                <Typography variant="h6" component="h3">
                  {item.item_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={2}>
                <Chip 
                  label={`가중치: ${item.weight}`} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label={`최대: ${item.max_score}점`} 
                  size="small" 
                  color="secondary" 
                  variant="outlined" 
                />
              </Box>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Box>
              {/* 점수 선택 */}
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>
                  점수 선택 (현재: {scores[item.item_name] || 0}점)
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {Array.from({ length: item.max_score }, (_, i) => i + 1).map(score => (
                    <Chip
                      key={score}
                      label={`${score}점`}
                      onClick={() => handleScoreChange(item.item_name, score)}
                      color={scores[item.item_name] === score ? 'primary' : 'default'}
                      variant={scores[item.item_name] === score ? 'filled' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
                
                {scores[item.item_name] > 0 && (
                  <Box mt={2}>
                    <Chip
                      label={getScoreLabel(scores[item.item_name], item.max_score)}
                      color={getScoreColor(scores[item.item_name], item.max_score)}
                      icon={<Star />}
                    />
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* 채점 기준 */}
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>
                  채점 기준
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {Object.entries(item.scoring_criteria).map(([range, criteria]) => (
                    <Box key={range} mb={1}>
                      <Typography variant="body2" component="span" fontWeight="bold">
                        {range}:
                      </Typography>
                      <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                        {criteria}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>

              {/* 평가 질문 */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  평가 질문
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {item.evaluation_questions.map((question, qIndex) => (
                    <Box key={qIndex} mb={1}>
                      <Box display="flex" alignItems="flex-start">
                        <QuestionAnswer sx={{ mr: 1, mt: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                        <Typography variant="body2">
                          {question}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Paper>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* 총점 요약 */}
      <Card sx={{ mt: 3, backgroundColor: '#e3f2fd' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            평가 총점 요약
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body1">
                현재 총점: <strong>{calculateTotalScore()}점</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body1">
                최대 가능 점수: <strong>{evaluationData.max_total_score}점</strong>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InterviewEvaluationItems; 