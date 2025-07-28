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
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  Lightbulb,
  Recommend,
  ExpandMore,
  ExpandLess,
  Psychology,
  SmartToy,
  AccessTime
} from '@mui/icons-material';
import api from '../api/api';

const StatisticsAnalysis = ({ jobPostId, chartType, chartData, isVisible }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [isLLMUsed, setIsLLMUsed] = useState(false);

  useEffect(() => {
    if (isVisible && jobPostId && chartType && chartData && chartData.length > 0) {
      fetchAnalysis();
    }
  }, [isVisible, jobPostId, chartType, chartData]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 먼저 저장된 분석 결과가 있는지 확인
      let response;
      try {
        response = await api.get(`/statistics/job/${jobPostId}/analysis/${chartType}`);
        console.log('저장된 분석 결과를 찾았습니다:', response.data);
      } catch (err) {
        if (err.response?.status === 404) {
          // 저장된 결과가 없으면 새로운 분석 실행
          console.log('저장된 분석 결과가 없어 새로운 분석을 실행합니다.');
          response = await api.post('/statistics/analyze', {
            job_post_id: jobPostId,
            chart_type: chartType,
            chart_data: chartData
          });
        } else {
          throw err;
        }
      }
      
      setAnalysis(response.data);
      
      // 백엔드에서 받은 실제 LLM 사용 여부 사용
      setIsLLMUsed(response.data.is_llm_used || false);
    } catch (err) {
      console.error('통계 분석 요청 실패:', err);
      setError('AI 분석을 불러오는 중 오류가 발생했습니다.');
      setIsLLMUsed(false);
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
            {analysis?.created_at && (
              <Tooltip title={`분석 생성 시간: ${new Date(analysis.created_at).toLocaleString('ko-KR')}`}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                  <AccessTime sx={{ fontSize: 16, color: '#666' }} />
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    {new Date(analysis.created_at).toLocaleDateString('ko-KR')}
                  </Typography>
                </Box>
              </Tooltip>
            )}
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
                {isLLMUsed ? 'AI 모델이 데이터를 분석하고 있습니다...' : '데이터를 분석하고 있습니다...'}
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