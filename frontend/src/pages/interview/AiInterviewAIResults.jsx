import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Container, 
  Divider, 
  Grid, 
  Paper, 
  Tab, 
  Tabs, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  Analytics as AnalyticsIcon,
  List as ListIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  VideoLibrary as VideoLibraryIcon
} from '@mui/icons-material';
import { MdOutlineRecordVoiceOver, MdOutlineAnalytics, MdOutlineVideoLibrary } from 'react-icons/md';
import { FaList } from 'react-icons/fa';
import api from '../../api/api';

const AiInterviewAIResults = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openStt, setOpenStt] = useState(false);
  const [openQa, setOpenQa] = useState(false);

  const [sttStatus, setSttStatus] = useState(null); // GET /whisper-analysis/status
  const [qaResult, setQaResult] = useState(null);   // POST /whisper-analysis/process-qa
  const [applicantInfo, setApplicantInfo] = useState(null); // 지원자 정보

  const handleTabChange = useCallback((event, newValue) => setActiveTab(newValue), []);

  // 지원자 정보 로드
  const loadApplicantInfo = useCallback(async () => {
    try {
      const res = await api.get(`/applications/${applicationId}`);
      setApplicantInfo(res.data);
    } catch (e) {
      console.error('지원자 정보 로드 실패:', e);
    }
  }, [applicationId]);

  const loadSttStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/whisper-analysis/status/${applicationId}`);
      setSttStatus(res.data || null);
    } catch (e) {
      console.error('STT 상태 로드 실패:', e);
      setError('STT 상태를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const runQaAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post(`/whisper-analysis/process-qa/${applicationId}?persist=true&output_dir=/data/qa_slices`);
      setQaResult(res.data || null);
      if (!(res.data && res.data.success)) {
        throw new Error(res.data?.detail || res.data?.message || 'QA 분석 실패');
      }
      // 성공 시 자동으로 overview 보이도록 유지
    } catch (e) {
      console.error('QA 분석 실행 실패:', e);
      setError(e.message || 'QA 분석 실행 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  // 초기 한번 STT 상태와 지원자 정보 로드
  useEffect(() => {
    loadSttStatus();
    loadApplicantInfo();
  }, [loadSttStatus, loadApplicantInfo]);

  const overviewStats = useMemo(() => {
    if (!sttStatus || !sttStatus.has_analysis) return null;
    return {
      score: sttStatus.score,
      transcriptionLength: sttStatus.transcription_length,
      createdAt: sttStatus.created_at,
    };
  }, [sttStatus]);

  const qaItems = useMemo(() => qaResult?.qa || [], [qaResult]);

  const tabLabels = [
    { label: '개요', icon: <AnalyticsIcon /> },
    { label: '답변별 분석', icon: <ListIcon /> },
    { label: 'STT', icon: <RecordVoiceOverIcon /> },
    { label: '영상', icon: <VideoLibraryIcon /> }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 3 }}>
      <Container maxWidth="xl">
        {/* 헤더 */}
        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'grey.900' }}>
                  AI 면접 결과
                </Typography>
                <Typography variant="body1" sx={{ color: 'grey.600', mt: 1 }}>
                  {applicantInfo ? `${applicantInfo.name} (${applicantInfo.email})` : `지원자 ID: ${applicationId}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate(-1)}
                  sx={{ 
                    borderColor: 'grey.600', 
                    color: 'grey.700',
                    '&:hover': { borderColor: 'grey.700', bgcolor: 'grey.50' }
                  }}
                >
                  돌아가기
                </Button>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={loadSttStatus}
                  disabled={loading}
                  sx={{ 
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&:disabled': { bgcolor: 'grey.400' }
                  }}
                  title="STT 상태 새로고침"
                >
                  STT 새로고침
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={runQaAnalysis}
                  disabled={loading}
                  sx={{ 
                    bgcolor: 'success.main',
                    '&:hover': { bgcolor: 'success.dark' },
                    '&:disabled': { bgcolor: 'grey.400' }
                  }}
                  title="답변별 분석 실행"
                >
                  답변별 분석 실행
                </Button>
              </Box>
            </Box>
            
            {overviewStats && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                    <Typography variant="body2" sx={{ color: 'primary.600' }}>
                      총점(Whisper)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'semibold', color: 'primary.900' }}>
                      {overviewStats.score ?? 'N/A'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                    <Typography variant="body2" sx={{ color: 'success.600' }}>
                      전사 길이
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'semibold', color: 'success.900' }}>
                      {overviewStats.transcriptionLength ?? 0}자
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
                    <Typography variant="body2" sx={{ color: 'secondary.600' }}>
                      생성일
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'medium', color: 'secondary.900' }}>
                      {overviewStats.createdAt ? new Date(overviewStats.createdAt).toLocaleString() : 'N/A'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 탭 네비게이션 */}
        <Card sx={{ boxShadow: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ px: 3 }}
            >
              {tabLabels.map((tab, index) => (
                <Tab 
                  key={index}
                  label={tab.label}
                  icon={tab.icon}
                  iconPosition="start"
                  sx={{ 
                    minHeight: 64,
                    '&.Mui-selected': { color: 'primary.main' }
                  }}
                />
              ))}
            </Tabs>
          </Box>

          {/* 탭 콘텐츠 */}
          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Box sx={{ color: 'grey.700', space: 3 }}>
                {overviewStats ? (
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    AI 면접의 요약 지표를 확인할 수 있습니다. 상단 버튼으로 STT 새로고침 및 답변별 분석을 실행하세요.
                  </Typography>
                ) : (
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    STT 분석 결과가 아직 없습니다. 상단의 STT 새로고침 또는 Whisper 분석을 먼저 실행하세요.
                  </Typography>
                )}

                {/* STT 요약 아코디언 */}
                <Accordion 
                  expanded={openStt} 
                  onChange={() => setOpenStt(!openStt)}
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      STT 요약
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {sttStatus?.has_analysis ? (
                      <Box sx={{ space: 2 }}>
                        <Typography variant="body2">
                          점수: <Box component="span" sx={{ fontWeight: 'medium' }}>
                            {sttStatus.score ?? 'N/A'}
                          </Box>
                        </Typography>
                        <Typography variant="body2">
                          전사 길이: <Box component="span" sx={{ fontWeight: 'medium' }}>
                            {sttStatus.transcription_length ?? 0}자
                          </Box>
                        </Typography>
                        <Typography variant="body2">
                          생성일: <Box component="span" sx={{ fontWeight: 'medium' }}>
                            {sttStatus.created_at ? new Date(sttStatus.created_at).toLocaleString() : 'N/A'}
                          </Box>
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'grey.500' }}>
                        STT 분석 결과가 없습니다.
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* 답변별 분석 아코디언 */}
                <Accordion 
                  expanded={openQa} 
                  onChange={() => setOpenQa(!openQa)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      답변별 분석
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ color: 'grey.600', mb: 2 }}>
                      상단의 "답변별 분석 실행"을 눌러 분석을 생성하세요.
                    </Typography>
                    {qaItems.length > 0 && (
                      <Typography variant="body2" sx={{ color: 'grey.700' }}>
                        총 {qaItems.length}개 답변 분석이 생성되었습니다. 탭에서 "답변별 분석"을 선택해 상세를 확인하세요.
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}

            {activeTab === 1 && (
              <Box sx={{ space: 3 }}>
                <Typography variant="body2" sx={{ color: 'grey.600', mb: 2 }}>
                  총 페어: {qaItems.length}
                </Typography>
                {qaItems.length === 0 ? (
                  <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                      답변별 분석 결과가 없습니다. 상단의 "답변별 분석 실행" 버튼을 눌러 분석을 생성하세요.
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ space: 3 }}>
                    {qaItems.map((item) => (
                      <Accordion key={item.index} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle2">
                            #{item.index} 응답 구간: {item.answer?.start?.toFixed?.(1) ?? item.answer?.start ?? 0}s ~ {item.answer?.end?.toFixed?.(1) ?? item.answer?.end ?? 0}s
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ space: 2 }}>
                            {item.question && (
                              <Typography variant="body2">
                                <Box component="span" sx={{ fontWeight: 'medium' }}>질문 구간: </Box>
                                {item.question.start?.toFixed?.(1) ?? item.question.start ?? 0}s ~ {item.question.end?.toFixed?.(1) ?? item.question.end ?? 0}s
                              </Typography>
                            )}
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                                전사:
                              </Typography>
                              <Paper sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                                <Typography variant="body2">
                                  {item.analysis?.transcription || item.analysis?.text || '(전사 없음)'}
                                </Typography>
                              </Paper>
                            </Box>
                            <Grid container spacing={2}>
                              <Grid item xs={6} md={3}>
                                <Typography variant="body2">
                                  <Box component="span" sx={{ color: 'grey.600' }}>길이:</Box>
                                  <Box component="span" sx={{ ml: 1, fontWeight: 'medium' }}>
                                    {item.analysis?.duration?.toFixed?.(1) ?? item.analysis?.duration ?? 0}s
                                  </Box>
                                </Typography>
                              </Grid>
                              <Grid item xs={6} md={3}>
                                <Typography variant="body2">
                                  <Box component="span" sx={{ color: 'grey.600' }}>속도:</Box>
                                  <Box component="span" sx={{ ml: 1, fontWeight: 'medium' }}>
                                    {item.analysis?.speech_rate ?? 0} w/s
                                  </Box>
                                </Typography>
                              </Grid>
                              {item.answer_audio_path && (
                                <Grid item xs={12} md={6}>
                                  <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                    파일 경로: {item.answer_audio_path}
                                  </Typography>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {activeTab === 2 && (
              <Box sx={{ space: 4 }}>
                {!sttStatus?.has_analysis ? (
                  <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                      STT 분석 결과가 없습니다. STT 새로고침 또는 Whisper 분석을 먼저 실행하세요.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                          <Typography variant="body2" sx={{ color: 'primary.600' }}>점수</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'semibold', color: 'primary.900' }}>
                            {sttStatus.score ?? 'N/A'}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                          <Typography variant="body2" sx={{ color: 'success.600' }}>전사 길이</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'semibold', color: 'success.900' }}>
                            {sttStatus.transcription_length ?? 0}자
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
                          <Typography variant="body2" sx={{ color: 'secondary.600' }}>생성일</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'secondary.900' }}>
                            {sttStatus.created_at ? new Date(sttStatus.created_at).toLocaleString() : 'N/A'}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    {sttStatus.transcription && (
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'medium', color: 'grey.900', mb: 2 }}>
                          전체 전사
                        </Typography>
                        <Paper sx={{ p: 3, maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'grey.200' }}>
                          <Typography variant="body2" sx={{ color: 'grey.800', whiteSpace: 'pre-wrap' }}>
                            {sttStatus.transcription}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}

            {activeTab === 3 && (
              <Typography variant="body1" sx={{ color: 'grey.600' }}>
                AI 면접 비디오 프리뷰는 기존 시스템에서 제공된 URL을 재사용하세요. (이 페이지에서는 별도 로딩을 생략했습니다.)
              </Typography>
            )}
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default AiInterviewAIResults;


