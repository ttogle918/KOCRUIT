import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  Lightbulb,
  Recommend,
  ExpandMore,
  ExpandLess,
  Psychology
} from '@mui/icons-material';
import api from '../api/api';

const StatisticsAnalysis = ({ jobPostId, chartType, chartData, isVisible }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (isVisible && jobPostId && chartType && chartData && chartData.length > 0) {
      fetchAnalysis();
    }
  }, [isVisible, jobPostId, chartType, chartData]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/statistics/analyze', {
        job_post_id: jobPostId,
        chart_type: chartType,
        chart_data: chartData
      });
      
      setAnalysis(response.data);
    } catch (err) {
      console.error('통계 분석 요청 실패:', err);
      setError('AI 분석을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getChartTypeLabel = (type) => {
    const labels = {
      'trend': '지원 시기별 추이',
      'age': '연령대별 지원자',
      'gender': '성별 지원자',
      'education': '학력별 지원자',
      'province': '지역별 지원자',
      'certificate': '자격증 보유 현황'
    };
    return labels[type] || type;
  };

  if (!isVisible) return null;

  return (
    <Card 
      sx={{ 
        mt: 2, 
        backgroundColor: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: 2
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology sx={{ color: '#1976d2', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              AI 분석 결과 - {getChartTypeLabel(chartType)}
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={40} />
              <Typography sx={{ ml: 2, alignSelf: 'center' }}>
                AI 분석 중...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {analysis && !loading && (
            <Box>
              {/* 기본 분석 결과 */}
              <Box sx={{ mb: 3 }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    whiteSpace: 'pre-line',
                    lineHeight: 1.6,
                    backgroundColor: 'white',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid #e0e0e0'
                  }}
                >
                  {analysis.analysis}
                </Typography>
              </Box>

              {/* 인사이트 */}
              {analysis.insights && analysis.insights.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Lightbulb sx={{ color: '#ff9800', mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                      주요 인사이트
                    </Typography>
                  </Box>
                  <List dense>
                    {analysis.insights.map((insight, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Chip 
                            label="💡" 
                            size="small" 
                            sx={{ 
                              backgroundColor: '#fff3e0',
                              color: '#e65100',
                              fontSize: '12px'
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={insight}
                          sx={{ 
                            '& .MuiListItemText-primary': {
                              fontSize: '14px',
                              lineHeight: 1.5
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* 권장사항 */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Recommend sx={{ color: '#4caf50', mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                      권장사항
                    </Typography>
                  </Box>
                  <List dense>
                    {analysis.recommendations.map((recommendation, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Chip 
                            label="✅" 
                            size="small" 
                            sx={{ 
                              backgroundColor: '#e8f5e8',
                              color: '#2e7d32',
                              fontSize: '12px'
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={recommendation}
                          sx={{ 
                            '& .MuiListItemText-primary': {
                              fontSize: '14px',
                              lineHeight: 1.5
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default StatisticsAnalysis; 