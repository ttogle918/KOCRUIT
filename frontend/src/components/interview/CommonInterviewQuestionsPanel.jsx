import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Box,
  Tooltip,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../../api/api';
import InterviewQuestionApi from '../../api/interviewQuestionApi';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  shadows: [
    "none",
    "0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.24)", // shadow[1] 추가!
    ...Array(23).fill("none") // 나머지 shadow 값 채우기
  ]
});

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

const CommonInterviewQuestionsPanel = ({
  questions: initialQuestions = [],
  onChange,
  fullWidth = false,
  resumeId,
  jobPostId,
  applicationId,
  companyName,
  applicantName,
  interviewChecklist,
  interviewGuideline,
  evaluationCriteria,
  toolsLoading,
  error = null
}) => {
  const [questions, setQuestions] = useState(initialQuestions);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [addingIndex, setAddingIndex] = useState(null);
  const [addValue, setAddValue] = useState('');
  const [activeTab, setActiveTab] = useState('questions');
  const [memo, setMemo] = useState('');
  
  // 🆕 DB에서 조회한 질문들 상태
  const [dbQuestions, setDbQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);
  const [questionsStatus, setQuestionsStatus] = useState(null);

  // 🆕 DB에서 공통 질문 조회
  const loadCommonQuestionsFromDB = async () => {
    if (!jobPostId) return;
    
    setLoadingQuestions(true);
    setQuestionsError(null);
    
    try {
      // 질문 생성 상태 확인
      const statusResponse = await InterviewQuestionApi.getQuestionsStatus(jobPostId);
      setQuestionsStatus(statusResponse);
      
      // 공통 질문 조회
      const response = await InterviewQuestionApi.getCommonQuestions(jobPostId);
      const commonQuestions = response.common_questions || [];
      
      // 질문 텍스트만 추출하여 배열로 변환
      const questionTexts = commonQuestions.map(q => q.question_text);
      setDbQuestions(questionTexts);
      
      // 기존 questions가 비어있으면 DB 질문으로 설정
      if (questions.length === 0) {
        setQuestions(questionTexts);
        onChange && onChange(questionTexts);
      }
      
      console.log('✅ DB에서 공통 질문 로드 완료:', questionTexts.length, '개');
      
    } catch (error) {
      console.error('❌ 공통 질문 조회 실패:', error);
      setQuestionsError('공통 질문을 불러오는데 실패했습니다.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // 🆕 공통 질문 수동 생성
  const generateCommonQuestions = async () => {
    if (!jobPostId) return;
    
    setLoadingQuestions(true);
    setQuestionsError(null);
    
    try {
      const response = await InterviewQuestionApi.generateCommonQuestions(jobPostId);
      console.log('✅ 공통 질문 생성 완료:', response);
      
      // 생성 후 다시 조회
      await loadCommonQuestionsFromDB();
      
    } catch (error) {
      console.error('❌ 공통 질문 생성 실패:', error);
      setQuestionsError('공통 질문 생성에 실패했습니다.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // 🆕 컴포넌트 마운트 시 자동으로 DB 질문 로드
  useEffect(() => {
    if (jobPostId && activeTab === 'questions') {
      loadCommonQuestionsFromDB();
    }
  }, [jobPostId, activeTab]);

  // Drag & Drop
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = reorder(questions, result.source.index, result.destination.index);
    setQuestions(reordered);
    onChange && onChange(reordered);
  };

  // 삭제
  const handleDelete = (idx) => {
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    onChange && onChange(updated);
  };

  // 인라인 수정
  const handleEdit = (idx) => {
    setEditingIndex(idx);
    setEditValue(questions[idx]);
  };
  const handleEditSave = (idx) => {
    const updated = [...questions];
    updated[idx] = editValue;
    setQuestions(updated);
    setEditingIndex(null);
    setEditValue('');
    onChange && onChange(updated);
  };

  // 새 질문 추가
  const handleAdd = (idx) => {
    setAddingIndex(idx);
    setAddValue('');
  };
  const handleAddSave = (idx) => {
    if (!addValue.trim()) return;
    const updated = [...questions];
    updated.splice(idx + 1, 0, addValue.trim());
    setQuestions(updated);
    setAddingIndex(null);
    setAddValue('');
    onChange && onChange(updated);
  };

  // 질문 탭 클릭 시
  const handleLoadJobCommonQuestions = () => {
    console.log('🔍 공통 질문 탭 클릭됨');
    if (jobPostId) {
      loadCommonQuestionsFromDB();
    }
  };

  // interviewChecklist 등 프롭스가 바뀌면 내부 상태도 동기화 (질문 제외)
  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  return (
    <Box sx={{ p: 2, height: '100%', width: fullWidth ? '100%' : undefined, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Box sx={{ fontWeight: 'bold', fontSize: 20, mb: 2 }}>공통 면접 질문</Box>
      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-300 dark:border-gray-600 mb-2">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'questions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => {
            setActiveTab('questions');
            handleLoadJobCommonQuestions();
          }}
        >
          질문
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'checklist' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('checklist')}
        >
          체크리스트
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'guideline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('guideline')}
        >
          가이드라인
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'criteria' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('criteria')}
        >
          평가 기준
        </button>
        {/* 개별 분석 탭 제거 - 공통 질문 패널에서는 지원자별 강점/약점 분석을 표시하지 않음 */}
      </div>
      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-y-auto mb-4">
        {activeTab === 'questions' && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                <div className="font-semibold">오류 발생</div>
                <div className="text-sm">{error}</div>
              </div>
            )}
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="questions-list">
                {(provided) => (
                  <List ref={provided.innerRef} {...provided.droppableProps} sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {loadingQuestions ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                        <CircularProgress size={24} sx={{ mr: 2 }} />
                        <span>공통 질문을 불러오는 중입니다...</span>
                      </Box>
                    ) : questionsError ? (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {questionsError}
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={generateCommonQuestions}
                          startIcon={<RefreshIcon />}
                          sx={{ ml: 2 }}
                        >
                          다시 생성
                        </Button>
                      </Alert>
                    ) : questions.length === 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                        <span style={{ marginBottom: '16px', color: '#666' }}>
                          아직 공통 질문이 생성되지 않았습니다.
                        </span>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={generateCommonQuestions}
                          startIcon={<AddIcon />}
                        >
                          공통 질문 생성
                        </Button>
                      </Box>
                    ) : (
                      questions.map((q, idx) => (
                        <React.Fragment key={idx}>
                          <Draggable draggableId={q + '-' + idx} index={idx}>
                            {(provided, snapshot) => (
                              <ListItem
                                ref={provided.innerRef}
                                sx={{ bgcolor: snapshot.isDragging ? 'grey.100' : 'inherit', borderRadius: 1, mb: 1 }}
                                secondaryAction={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Tooltip title="질문 추가">
                                      <IconButton edge="end" size="small" onClick={() => handleAdd(idx)}>
                                        <AddIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="삭제">
                                      <IconButton edge="end" size="small" onClick={() => handleDelete(idx)}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                }
                              >
                                {/* Drag handle: dragHandleProps는 여기만 */}
                                <Box
                                  {...provided.dragHandleProps}
                                  sx={{ mr: 1, cursor: 'grab', color: 'grey.500', display: 'flex', alignItems: 'center' }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <DragIndicatorIcon />
                                </Box>
                                {/* 인라인 수정 or 텍스트 */}
                                {editingIndex === idx ? (
                                  <TextField
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={() => handleEditSave(idx)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleEditSave(idx);
                                    }}
                                    size="small"
                                    autoFocus
                                    fullWidth
                                  />
                                ) : (
                                  <ListItemText
                                    primary={q}
                                    onDoubleClick={() => handleEdit(idx)}
                                    onTouchStart={e => {
                                      // 모바일 롱프레스 지원
                                      const timeout = setTimeout(() => handleEdit(idx), 600);
                                      const cancel = () => clearTimeout(timeout);
                                      e.target.addEventListener('touchend', cancel, { once: true });
                                      e.target.addEventListener('touchmove', cancel, { once: true });
                                    }}
                                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                                  />
                                )}
                              </ListItem>
                            )}
                          </Draggable>
                          {/* +를 누른 질문 바로 아래에 입력창 */}
                          {addingIndex === idx && (
                            <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                              <TextField
                                value={addValue}
                                onChange={e => setAddValue(e.target.value)}
                                onBlur={() => handleAddSave(addingIndex)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddSave(addingIndex);
                                }}
                                size="small"
                                autoFocus
                                fullWidth
                                placeholder="새 질문 입력..."
                              />
                            </ListItem>
                          )}
                        </React.Fragment>
                      ))
                    )}
                    {provided.placeholder}
                  </List>
                )}
              </Droppable>
            </DragDropContext>
          </>
        )}
        {activeTab === 'checklist' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 체크리스트</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">체크리스트 분석 중입니다...</span>
              </div>
            ) : interviewChecklist ? (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-green-700 dark:text-green-300">면접 전 체크리스트</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewChecklist.pre_interview_checklist?.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">면접 중 체크리스트</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewChecklist.during_interview_checklist?.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 dark:text-red-300">주의할 레드플래그</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewChecklist.red_flags_to_watch?.map((flag, i) => <li key={i}>{flag}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-700 dark:text-green-300">확인할 그린플래그</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewChecklist.green_flags_to_confirm?.map((flag, i) => <li key={i}>{flag}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">체크리스트를 생성할 수 없습니다.</div>
            )}
          </div>
        )}
        {activeTab === 'guideline' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 가이드라인</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">가이드라인 분석 중입니다...</span>
              </div>
            ) : interviewGuideline ? (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">면접 접근 방식</h4>
                  <p className="text-gray-700 dark:text-gray-200">{interviewGuideline.interview_approach}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">시간 배분</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(interviewGuideline.time_allocation || {}).map(([area, time]) => (
                      <div key={area} className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-200">{area}:</span>
                        <span className="font-medium">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">후속 질문</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                    {interviewGuideline.follow_up_questions?.map((question, i) => <li key={i}>{question}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">가이드라인을 생성할 수 없습니다.</div>
            )}
          </div>
        )}
        {activeTab === 'criteria' && (
          <div>
            <div className="mb-2 font-bold text-lg">평가 기준 제안</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">평가 기준 분석 중입니다...</span>
              </div>
            ) : evaluationCriteria ? (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">제안 평가 기준</h4>
                  {evaluationCriteria.suggested_criteria?.map((criteria, i) => (
                    <div key={i} className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="font-medium">{criteria.criterion}</div>
                      <div className="text-gray-600 dark:text-gray-400">{criteria.description}</div>
                      <div className="text-xs text-gray-500">최대 점수: {criteria.max_score}점</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">가중치 권장사항</h4>
                  {evaluationCriteria.weight_recommendations?.map((weight, i) => (
                    <div key={i} className="mb-1">
                      <span className="font-medium">{weight.criterion}:</span>
                      <span className="ml-2">{(weight.weight * 100).toFixed(0)}%</span>
                      <div className="text-xs text-gray-500 ml-4">{weight.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">평가 기준을 생성할 수 없습니다.</div>
            )}
          </div>
        )}

      </div>
      {/* 메모 입력 */}
      <div>
        <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">면접 메모</h3>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full h-24 p-2 border border-gray-300 dark:border-gray-600 rounded resize-none text-sm"
          placeholder="면접 중 메모를 입력하세요..."
        />
      </div>
    </Box>
  );
};

export default CommonInterviewQuestionsPanel; 