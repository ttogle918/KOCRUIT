import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Rating, 
  Stack, 
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Snackbar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import { FiSave, FiX, FiRefreshCw, FiDatabase, FiSettings, FiEdit3 } from 'react-icons/fi';
import { 
  saveInterviewEvaluation, 
  getInterviewEvaluation, 
  getEvaluationCriteria,
  updateEvaluationCriteria
} from '../../api/interviewEvaluationApi';

const EvaluationPanelFull = ({ 
  selectedApplicant, 
  interviewId, 
  evaluatorId,
  evaluationType = 'PRACTICAL', // 'PRACTICAL' | 'EXECUTIVE'
  jobPostId, // 채용공고 ID 추가
  onEvaluationSubmit 
}) => {
  const [evaluation, setEvaluation] = useState({
    technicalSkills: 0,
    communication: 0,
    problemSolving: 0,
    teamwork: 0,
    motivation: 0,
    overallRating: 0,
    strengths: '',
    weaknesses: '',
    comments: '',
    recommendation: 'PENDING'
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [existingEvaluation, setExistingEvaluation] = useState(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  
  // evaluation_criteria 관련 상태
  const [evaluationCriteria, setEvaluationCriteria] = useState(null);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  const [weightSettingsOpen, setWeightSettingsOpen] = useState(false);
  const [weightSettings, setWeightSettings] = useState({
    '기술적 역량': 0.2,
    '의사소통 능력': 0.2,
    '문제해결 능력': 0.2,
    '팀워크': 0.2,
    '동기부여': 0.2
  });

  // 기존 평가 데이터 조회
  useEffect(() => {
    if (interviewId && evaluatorId) {
      loadExistingEvaluation();
    }
  }, [interviewId, evaluatorId]);

  // 평가 기준 데이터 로드
  useEffect(() => {
    if (jobPostId) {
      loadEvaluationCriteria();
    }
  }, [jobPostId]);

  const loadEvaluationCriteria = async () => {
    try {
      setIsLoadingCriteria(true);
      const interviewStage = evaluationType === 'PRACTICAL' ? 'practical' : 'executive';
      const data = await getEvaluationCriteria(jobPostId, interviewStage);
      
      if (data && data.evaluation_items && Array.isArray(data.evaluation_items)) {
        setEvaluationCriteria(data);
        
        // weight 설정 초기화
        const initialWeights = {};
        data.evaluation_items.forEach(item => {
          if (item && item.item_name && typeof item.weight === 'number') {
            initialWeights[item.item_name] = item.weight;
          } else if (item && item.item_name) {
            initialWeights[item.item_name] = 0.2; // 기본값 0.2
          }
        });
        setWeightSettings(initialWeights);
      } else {
        // 기본 weight 설정
        const defaultWeights = {
          '기술적 역량': 0.2,
          '의사소통 능력': 0.2,
          '문제해결 능력': 0.2,
          '팀워크': 0.2,
          '동기부여': 0.2
        };
        setWeightSettings(defaultWeights);
      }
    } catch (error) {
      console.error('평가 기준 로드 실패:', error);
      // 에러가 발생해도 기본 weight 설정
      const defaultWeights = {
        '기술적 역량': 0.2,
        '의사소통 능력': 0.2,
        '문제해결 능력': 0.2,
        '팀워크': 0.2,
        '동기부여': 0.2
      };
      setWeightSettings(defaultWeights);
    } finally {
      setIsLoadingCriteria(false);
    }
  };

  const loadExistingEvaluation = async () => {
    try {
      setIsLoading(true);
      const data = await getInterviewEvaluation(interviewId, evaluatorId);
      if (data && data.id) {
        setExistingEvaluation(data);
        setHasExistingData(true);
        
        // 기존 평가 데이터로 폼 초기화
        const evaluationItems = data.evaluation_items || [];
        
        // 평가 항목별 점수 매핑
        const itemScores = {};
        evaluationItems.forEach(item => {
          if (item.evaluate_type === '기술적 역량') itemScores.technicalSkills = Math.round(item.evaluate_score / 20);
          else if (item.evaluate_type === '의사소통 능력') itemScores.communication = Math.round(item.evaluate_score / 20);
          else if (item.evaluate_type === '문제해결 능력') itemScores.problemSolving = Math.round(item.evaluate_score / 20);
          else if (item.evaluate_type === '팀워크') itemScores.teamwork = Math.round(item.evaluate_score / 20);
          else if (item.evaluate_type === '동기부여') itemScores.motivation = Math.round(item.evaluate_score / 20);
        });

        setEvaluation({
          technicalSkills: itemScores.technicalSkills || 0,
          communication: itemScores.communication || 0,
          problemSolving: itemScores.problemSolving || 0,
          teamwork: itemScores.teamwork || 0,
          motivation: itemScores.motivation || 0,
          overallRating: Math.round((data.total_score || 0) / 20),
          strengths: data.summary || '',
          weaknesses: '', // 기존 데이터에 없음
          comments: data.summary || '',
          recommendation: data.status || 'PENDING'
        });
      }
    } catch (error) {
      console.error('기존 평가 조회 실패:', error);
      // 기존 데이터가 없는 경우는 에러가 아님
      if (error.response && error.response.status !== 404) {
        setSnackbar({
          open: true,
          message: '기존 평가 데이터 조회에 실패했습니다',
          severity: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingChange = (field, value) => {
    setEvaluation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTextChange = (field, value) => {
    setEvaluation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateEvaluation = () => {
    const newErrors = {};
    
    if (evaluation.overallRating === 0) {
      newErrors.overallRating = '전체 평가 점수를 입력해주세요';
    }
    
    if (!evaluation.comments.trim()) {
      newErrors.comments = '평가 코멘트를 입력해주세요';
    }

    setErrors(newErrors);
    // 안전한 Object.keys 검사 추가
    return newErrors && typeof newErrors === 'object' ? Object.keys(newErrors).length === 0 : true;
  };

  const handleSubmit = async () => {
    if (!validateEvaluation()) return;

    try {
      setIsSaving(true);
      
      // API 호출을 위한 데이터 구조 변환
      const evaluationData = {
        interview_id: interviewId,
        evaluator_id: evaluatorId,
        evaluation_type: evaluationType,
        total_score: evaluation.overallRating * 20, // 5점을 100점으로 변환
        summary: evaluation.comments,
        evaluation_items: [
          {
            evaluate_type: '기술적 역량',
            evaluate_score: evaluation.technicalSkills * 20,
            comment: evaluation.strengths
          },
          {
            evaluate_type: '의사소통 능력',
            evaluate_score: evaluation.communication * 20,
            comment: ''
          },
          {
            evaluate_type: '문제해결 능력',
            evaluate_score: evaluation.problemSolving * 20,
            comment: ''
          },
          {
            evaluate_type: '팀워크',
            evaluate_score: evaluation.teamwork * 20,
            comment: ''
          },
          {
            evaluate_type: '동기부여',
            evaluate_score: evaluation.motivation * 20,
            comment: ''
          }
        ],
        details: [
          {
            category: '기술적 역량',
            score: evaluation.technicalSkills * 20,
            grade: getGradeFromScore(evaluation.technicalSkills * 20)
          },
          {
            category: '의사소통 능력',
            score: evaluation.communication * 20,
            grade: getGradeFromScore(evaluation.communication * 20)
          },
          {
            category: '문제해결 능력',
            score: evaluation.problemSolving * 20,
            grade: getGradeFromScore(evaluation.problemSolving * 20)
          },
          {
            category: '팀워크',
            score: evaluation.teamwork * 20,
            grade: getGradeFromScore(evaluation.teamwork * 20)
          },
          {
            category: '동기부여',
            score: evaluation.motivation * 20,
            grade: getGradeFromScore(evaluation.motivation * 20)
          }
        ]
      };

      // API 호출
      const result = await saveInterviewEvaluation(evaluationData);
      
      setSnackbar({
        open: true,
        message: '면접 평가가 성공적으로 저장되었습니다!',
        severity: 'success'
      });

      // 성공 후 기존 평가 데이터 업데이트
      setExistingEvaluation(result);
      setHasExistingData(true);
      
      // 부모 컴포넌트에 알림
      if (onEvaluationSubmit) {
        onEvaluationSubmit({
          applicantId: selectedApplicant.id,
          ...evaluation,
          submittedAt: new Date().toISOString(),
          savedToDB: true
        });
      }
      
    } catch (error) {
      console.error('평가 저장 실패:', error);
      setSnackbar({
        open: true,
        message: '평가 저장에 실패했습니다. 다시 시도해주세요.',
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWeightChange = (itemName, newWeight) => {
    if (!itemName || typeof newWeight !== 'string') return;
    
    const parsedWeight = parseFloat(newWeight);
    if (isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 1) return;
    
    setWeightSettings(prev => {
      if (prev && typeof prev === 'object') {
        return {
          ...prev,
          [itemName]: parsedWeight
        };
      }
      // prev가 유효하지 않으면 기본값으로 초기화
      return {
        '기술적 역량': 0.2,
        '의사소통 능력': 0.2,
        '문제해결 능력': 0.2,
        '팀워크': 0.2,
        '동기부여': 0.2,
        [itemName]: parsedWeight
      };
    });
  };

  const handleWeightSettingsSave = async () => {
    try {
      if (evaluationCriteria && evaluationCriteria.id) {
        // weight_recommendations 업데이트
        const updatedCriteria = {
          ...evaluationCriteria,
          weight_recommendations: Object.entries(weightSettings).map(([itemName, weight]) => ({
            criterion: itemName,
            weight: weight,
            reason: `${itemName} 항목의 가중치를 ${(weight * 100).toFixed(0)}%로 설정`
          }))
        };

        await updateEvaluationCriteria(evaluationCriteria.id, updatedCriteria);
        
        setSnackbar({
          open: true,
          message: '가중치 설정이 저장되었습니다!',
          severity: 'success'
        });
        
        setWeightSettingsOpen(false);
      }
    } catch (error) {
      console.error('가중치 설정 저장 실패:', error);
      setSnackbar({
        open: true,
        message: '가중치 설정 저장에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const getGradeFromScore = (score) => {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  };

  const getRatingLabel = (rating) => {
    const labels = ['매우 낮음', '낮음', '보통', '높음', '매우 높음'];
    return labels[rating - 1] || '선택 안함';
  };

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'STRONGLY_RECOMMEND': return 'success';
      case 'RECOMMEND': return 'primary';
      case 'PENDING': return 'warning';
      case 'NOT_RECOMMEND': return 'error';
      default: return 'default';
    }
  };

  const getRecommendationLabel = (recommendation) => {
    switch (recommendation) {
      case 'STRONGLY_RECOMMEND': return '강력 추천';
      case 'RECOMMEND': return '추천';
      case 'PENDING': return '보류';
      case 'NOT_RECOMMEND': return '추천 안함';
      default: return '선택 안함';
    }
  };

  // 기본 평가 항목 (evaluation_criteria가 없을 때 사용)
  const defaultEvaluationItems = [
    { field: 'technicalSkills', label: '기술적 역량', description: '기술적 지식과 실무 능력' },
    { field: 'communication', label: '의사소통 능력', description: '명확한 의사전달과 경청 능력' },
    { field: 'problemSolving', label: '문제해결 능력', description: '논리적 사고와 창의적 해결' },
    { field: 'teamwork', label: '팀워크', description: '협력과 조화를 이끌어내는 능력' },
    { field: 'motivation', label: '동기부여', description: '업무에 대한 열정과 성장 의지' }
  ];

  // evaluation_criteria에서 평가 항목 가져오기
  const getEvaluationItems = () => {
    try {
      if (evaluationCriteria && evaluationCriteria.evaluation_items && Array.isArray(evaluationCriteria.evaluation_items)) {
        const items = evaluationCriteria.evaluation_items.map(item => ({
          field: getFieldFromItemName(item?.item_name),
          label: item?.item_name || '제목 없음',
          description: item?.description || '',
          maxScore: item?.max_score || 100,
          weight: typeof item?.weight === 'number' ? item.weight : 0.2
        })).filter(item => item.field && item.label); // 매핑된 항목만 반환
        
        return items.length > 0 ? items : defaultEvaluationItems;
      }
      return defaultEvaluationItems;
    } catch (error) {
      console.error('평가 항목 생성 중 오류:', error);
      return defaultEvaluationItems;
    }
  };

  // 평가 항목명을 필드명으로 매핑
  const getFieldFromItemName = (itemName) => {
    if (!itemName || typeof itemName !== 'string') {
      return null;
    }
    
    const mapping = {
      '기술적 역량': 'technicalSkills',
      '의사소통 능력': 'communication',
      '문제해결 능력': 'problemSolving',
      '팀워크': 'teamwork',
      '동기부여': 'motivation'
    };
    return mapping[itemName] || null;
  };

  if (!selectedApplicant) {
    return (
      <Card className="h-full">
        <CardContent>
          <Typography variant="h6" color="textSecondary" align="center">
            평가할 지원자를 선택해주세요
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <CircularProgress size={40} />
            <Typography variant="body2" className="mt-2">
              평가 데이터를 불러오는 중...
            </Typography>
          </div>
        </CardContent>
      </Card>
    );
  }

  const evaluationItems = getEvaluationItems();

  return (
    <>
      <Card className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0 bg-white dark:bg-gray-800 rounded-t-lg">
          <Typography variant="h6">
            {selectedApplicant.name} 지원자 평가
          </Typography>
          <div className="flex items-center gap-2">
            {hasExistingData && (
              <Chip
                icon={<FiDatabase />}
                label="DB 저장됨"
                color="success"
                size="small"
                variant="outlined"
              />
            )}
            <Tooltip title="가중치 설정">
              <IconButton
                size="small"
                onClick={() => setWeightSettingsOpen(true)}
                color="primary"
              >
                <FiSettings />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* 기존 평가 데이터 표시 */}
          {hasExistingData && existingEvaluation && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <Typography variant="subtitle2" color="primary" gutterBottom>
                📊 기존 평가 데이터
              </Typography>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>총점: <strong>{existingEvaluation?.total_score || 0}점</strong></div>
                <div>상태: <strong>{existingEvaluation?.status || 'N/A'}</strong></div>
                <div>평가일: <strong>{existingEvaluation?.created_at ? new Date(existingEvaluation.created_at).toLocaleDateString() : 'N/A'}</strong></div>
                <div>평가자: <strong>ID {existingEvaluation?.evaluator_id || 'N/A'}</strong></div>
              </div>
            </div>
          )}

          {/* 세부 평가 항목 */}
          <div className="space-y-4">
            <Typography variant="subtitle1" gutterBottom className="font-bold">
              세부 평가
            </Typography>
            
            {Array.isArray(evaluationItems) && evaluationItems.length > 0 ? evaluationItems.map(({ field, label, description, weight }) => (
              <div key={field} className="space-y-1 p-2 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Typography variant="body2" className="font-medium">
                      {label || '제목 없음'}
                    </Typography>
                    {description && (
                      <Typography 
                        variant="caption" 
                        color="textSecondary"
                        className="text-xs leading-tight block mt-1"
                      >
                        {description}
                      </Typography>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof weight === 'number' && (
                      <Chip
                        label={`${(weight * 100).toFixed(0)}%`}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    )}
                    <Rating
                      value={evaluation[field] || 0}
                      onChange={(_, value) => handleRatingChange(field, value)}
                      size="small"
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ minWidth: '60px', textAlign: 'right' }}>
                      {getRatingLabel(evaluation[field] || 0)}
                    </Typography>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500">
                평가 항목을 불러올 수 없습니다.
              </div>
            )}
          </div>

          <Divider />

          {/* 전체 평가 */}
          <div className="space-y-2">
            <Typography variant="subtitle1" gutterBottom className="font-bold">
              전체 평가
            </Typography>
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <Rating
                value={evaluation.overallRating}
                onChange={(_, value) => handleRatingChange('overallRating', value)}
                size="large"
              />
              <Typography variant="h5" color="primary" className="font-bold">
                {evaluation.overallRating}/5
              </Typography>
            </div>
            {errors.overallRating && (
              <Alert severity="error" size="small">{errors.overallRating}</Alert>
            )}
          </div>

          <Divider />

          {/* 강점/약점 */}
          <div className="space-y-4">
            <Typography variant="subtitle1" gutterBottom className="font-bold">
              상세 의견
            </Typography>
            <div className="grid grid-cols-1 gap-4">
              <TextField
                fullWidth
                label="강점"
                multiline
                rows={2}
                value={evaluation.strengths}
                onChange={(e) => handleTextChange('strengths', e.target.value)}
                placeholder="지원자의 주요 강점을 입력하세요"
                variant="outlined"
                size="small"
              />
              <TextField
                fullWidth
                label="개선점"
                multiline
                rows={2}
                value={evaluation.weaknesses}
                onChange={(e) => handleTextChange('weaknesses', e.target.value)}
                placeholder="개선이 필요한 부분을 입력하세요"
                variant="outlined"
                size="small"
              />
            </div>
          </div>

          {/* 평가 코멘트 */}
          <TextField
            fullWidth
            label="종합 평가 코멘트"
            multiline
            rows={3}
            value={evaluation.comments}
            onChange={(e) => handleTextChange('comments', e.target.value)}
            placeholder="지원자에 대한 종합적인 평가를 입력하세요"
            error={!!errors.comments}
            helperText={errors.comments}
            required
            variant="outlined"
          />

          {/* 최종 추천 */}
          <FormControl fullWidth>
            <InputLabel>최종 추천</InputLabel>
            <Select
              value={evaluation.recommendation}
              onChange={(e) => handleTextChange('recommendation', e.target.value)}
              label="최종 추천"
            >
              <MenuItem value="STRONGLY_RECOMMEND">강력 추천</MenuItem>
              <MenuItem value="RECOMMEND">추천</MenuItem>
              <MenuItem value="PENDING">보류</MenuItem>
              <MenuItem value="NOT_RECOMMEND">추천 안함</MenuItem>
            </Select>
          </FormControl>

          {/* 최종 추천 표시 */}
          <div className="flex justify-center pb-4">
            <Chip
              label={getRecommendationLabel(evaluation.recommendation)}
              color={getRecommendationColor(evaluation.recommendation)}
              variant="filled"
              size="medium" 
              sx={{ fontWeight: 'bold', px: 2 }}
            />
          </div>
        </CardContent>

        {/* 하단 고정 버튼 영역 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-2 flex-shrink-0 rounded-b-lg">
          <Button
            variant="contained"
            onClick={handleSubmit}
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <FiSave />}
            disabled={isSaving}
            fullWidth
            size="large"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? '저장 중...' : '평가 제출'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setEvaluation({
              technicalSkills: 0,
              communication: 0,
              problemSolving: 0,
              teamwork: 0,
              motivation: 0,
              overallRating: 0,
              strengths: '',
              weaknesses: '',
              comments: '',
              recommendation: 'PENDING'
            })}
            startIcon={<FiRefreshCw />}
            color="inherit"
          >
            초기화
          </Button>
        </div>
      </Card>

      {/* 가중치 설정 모달 */}
      <Dialog 
        open={weightSettingsOpen} 
        onClose={() => setWeightSettingsOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: { width: '100%', maxWidth: '600px' }
        }}
      >
        <DialogTitle>
          <div className="flex items-center gap-2">
            <FiEdit3 />
            평가 항목 가중치 설정
          </div>
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <Typography variant="body2" color="textSecondary">
              각 평가 항목의 가중치를 설정하여 전체 점수 계산에 반영할 수 있습니다.
            </Typography>
            
            {evaluationItems && evaluationItems.length > 0 ? evaluationItems.map(({ label, weight }) => (
              <div key={label} className="flex items-center justify-between">
                <Typography variant="body2">{label}</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={weightSettings && typeof weightSettings === 'object' && label ? (weightSettings[label] || weight || 0.2) : (weight || 0.2)}
                  onChange={(e) => handleWeightChange(label, e.target.value)}
                  inputProps={{
                    min: 0,
                    max: 1,
                    step: 0.1
                  }}
                  sx={{ width: 100 }}
                  helperText={`${((weightSettings && typeof weightSettings === 'object' && label ? (weightSettings[label] || weight || 0.2) : (weight || 0.2)) * 100).toFixed(0)}%`}
                />
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500">
                평가 항목을 불러올 수 없습니다.
              </div>
            )}
            
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Typography variant="body2" color="textSecondary">
                총 가중치: <strong>
                  {weightSettings && typeof weightSettings === 'object' && Object.keys(weightSettings).length > 0 ? 
                    Object.values(weightSettings).reduce((sum, weight) => sum + (parseFloat(weight) || 0), 0).toFixed(1) : 
                    '0.0'
                  }
                </strong>
                {weightSettings && typeof weightSettings === 'object' && Object.keys(weightSettings).length > 0 && 
                 Math.abs(Object.values(weightSettings).reduce((sum, weight) => sum + (parseFloat(weight) || 0), 0) - 1.0) > 0.01 && (
                  <span className="text-orange-600 ml-2">
                    (권장: 1.0)
                  </span>
                )}
              </Typography>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWeightSettingsOpen(false)}>
            취소
          </Button>
          <Button 
            onClick={handleWeightSettingsSave}
            variant="contained"
            startIcon={<FiSave />}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EvaluationPanelFull;
