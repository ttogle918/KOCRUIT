import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import api from '../../api/api';
import { FiChevronLeft, FiChevronRight, FiPlus, FiEdit, FiTrash2, FiSave } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { mapResumeData } from '../../utils/resumeUtils';

// Material-UI 컴포넌트 import
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  Typography,
  Box,
  Fab,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Grid,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Lightbulb as LightbulbIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

// 드래그 가능한 패널 컴포넌트
const DraggablePanel = ({ title, children, initialSize = { width: 500, height: 400 }, onSizeChange }) => {
  const [size, setSize] = useState(initialSize);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const resizeRef = useRef(null);

  const handleMouseDown = (e, type) => {
    e.preventDefault();
    if (type === 'resize') {
      setIsResizing(true);
    } else {
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition(prev => ({
          x: prev.x + e.movementX,
          y: prev.y + e.movementY
        }));
      } else if (isResizing) {
        const newWidth = Math.max(400, size.width + e.movementX);
        const newHeight = Math.max(300, size.height + e.movementY);
        const newSize = { width: newWidth, height: newHeight };
        setSize(newSize);
        onSizeChange?.(newSize);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, size.width, size.height, onSizeChange]);

  return (
    <div
      ref={panelRef}
      className="absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
      >
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      
      {/* 컨텐츠 */}
      <div className="p-3 h-full overflow-auto">
        {children}
      </div>
      
      {/* 리사이즈 핸들 */}
      <div
        ref={resizeRef}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
      >
        <div className="w-0 h-0 border-l-4 border-l-transparent border-b-4 border-b-gray-400"></div>
      </div>
    </div>
  );
};

// 탭 컴포넌트
const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
      active
        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
    }`}
  >
    {children}
  </button>
);

// 지원자 목록 컴포넌트 (전체 화면)
const ApplicantListFull = ({ applicants, selectedApplicant, onSelectApplicant }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full">
      <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">지원자 목록</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full overflow-y-auto">
        {applicants.map((applicant) => (
          <div
            key={applicant.applicant_id || applicant.id}
            onClick={() => onSelectApplicant(applicant)}
            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
              selectedApplicant?.id === (applicant.applicant_id || applicant.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {applicant.name.charAt(0)}
                </span>
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{applicant.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {applicant.schedule_date || '시간 미정'}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                ID: {applicant.applicant_id || applicant.id}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 공통 질문 관리 컴포넌트 (전체 화면)
const CommonQuestionsPanelFull = ({ questions, onQuestionsChange }) => {
  const [newQuestion, setNewQuestion] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      onQuestionsChange([...questions, newQuestion.trim()]);
      setNewQuestion('');
      setOpenAddDialog(false);
    }
  };

  const handleEditQuestion = (index) => {
    setEditingIndex(index);
    setEditText(questions[index]);
    setOpenEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim()) {
      const updatedQuestions = [...questions];
      updatedQuestions[editingIndex] = editText.trim();
      onQuestionsChange(updatedQuestions);
      setEditingIndex(null);
      setEditText('');
      setOpenEditDialog(false);
    }
  };

  const handleDeleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    onQuestionsChange(updatedQuestions);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h3" className="text-gray-900 dark:text-gray-100">
          공통 질문 관리
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddDialog(true)}
        >
          질문 추가
        </Button>
      </Box>

      {/* 질문 목록 */}
      <List className="h-full overflow-y-auto">
        {questions.map((question, index) => (
          <React.Fragment key={index}>
            <ListItem className="border border-gray-200 dark:border-gray-600 rounded-lg mb-2 hover:shadow-md transition-shadow">
              <ListItemText
                primary={question}
                primaryTypographyProps={{
                  className: "text-gray-900 dark:text-gray-100"
                }}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => handleEditQuestion(index)}
                  color="primary"
                  size="small"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteQuestion(index)}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            {index < questions.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>

      {/* 질문 추가 다이얼로그 */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 질문 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="질문 내용"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)} color="secondary">
            취소
          </Button>
          <Button onClick={handleAddQuestion} color="primary" variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 질문 수정 다이얼로그 */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>질문 수정</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="질문 내용"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="secondary">
            취소
          </Button>
          <Button onClick={handleSaveEdit} color="primary" variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

// 공통 질문 관리 컴포넌트 (컴팩트 버전 - 면접 진행 화면용)
const CommonQuestionsPanel = ({ questions, onQuestionsChange }) => {
  const [newQuestion, setNewQuestion] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      onQuestionsChange([...questions, newQuestion.trim()]);
      setNewQuestion('');
      setOpenAddDialog(false);
    }
  };

  const handleEditQuestion = (index) => {
    setEditingIndex(index);
    setEditText(questions[index]);
    setOpenEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim()) {
      const updatedQuestions = [...questions];
      updatedQuestions[editingIndex] = editText.trim();
      onQuestionsChange(updatedQuestions);
      setEditingIndex(null);
      setEditText('');
      setOpenEditDialog(false);
    }
  };

  const handleDeleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    onQuestionsChange(updatedQuestions);
  };

  return (
    <div className="space-y-3">
      {/* 질문 추가 버튼 */}
      <Box display="flex" justifyContent="center">
        <Tooltip title="질문 추가">
          <Fab
            color="primary"
            size="small"
            onClick={() => setOpenAddDialog(true)}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      </Box>

      {/* 질문 목록 */}
      <List className="max-h-64 overflow-y-auto">
        {questions.map((question, index) => (
          <ListItem key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg mb-2 p-2">
            <ListItemText
              primary={question}
              primaryTypographyProps={{
                className: "text-gray-900 dark:text-gray-100 text-sm"
              }}
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="edit"
                onClick={() => handleEditQuestion(index)}
                color="primary"
                size="small"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleDeleteQuestion(index)}
                color="error"
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* 질문 추가 다이얼로그 */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 질문 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="질문 내용"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)} color="secondary">
            취소
          </Button>
          <Button onClick={handleAddQuestion} color="primary" variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 질문 수정 다이얼로그 */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>질문 수정</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="질문 내용"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="secondary">
            취소
          </Button>
          <Button onClick={handleSaveEdit} color="primary" variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

// 이력서 패널 컴포넌트
const ResumePanel = ({ resume, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">이력서</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">이력서</h3>
        <p className="text-gray-500 dark:text-gray-400">지원자를 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">이력서</h3>
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">{resume.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{resume.email}</p>
        </div>
        {resume.phone && (
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">연락처:</span>
            <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">{resume.phone}</span>
          </div>
        )}
        {resume.education && resume.education.length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">학력:</span>
            <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
              {resume.education.map((edu, index) => (
                <div key={index}>{edu.school} - {edu.major}</div>
              ))}
            </div>
          </div>
        )}
        {resume.experience && resume.experience.length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">경력:</span>
            <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
              {resume.experience.map((exp, index) => (
                <div key={index}>{exp.company} - {exp.position}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 맞춤형 질문 패널 컴포넌트
const CustomQuestionsPanel = ({ questions, onQuestionsChange, applicantName }) => {
  const [newQuestion, setNewQuestion] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      onQuestionsChange([...questions, newQuestion.trim()]);
      setNewQuestion('');
      setOpenAddDialog(false);
    }
  };

  const handleDeleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    onQuestionsChange(updatedQuestions);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" component="h3" className="text-gray-900 dark:text-gray-100">
          {applicantName ? `${applicantName} 맞춤형 질문` : '맞춤형 질문'}
        </Typography>
        <Tooltip title="맞춤형 질문 추가">
          <IconButton
            color="primary"
            onClick={() => setOpenAddDialog(true)}
            size="small"
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 질문 목록 */}
      <List className="max-h-64 overflow-y-auto">
        {questions.map((question, index) => (
          <ListItem key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg mb-2 p-2">
            <ListItemText
              primary={question}
              primaryTypographyProps={{
                className: "text-gray-900 dark:text-gray-100 text-sm"
              }}
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleDeleteQuestion(index)}
                color="error"
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* 질문 추가 다이얼로그 */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>맞춤형 질문 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="질문 내용"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)} color="secondary">
            취소
          </Button>
          <Button onClick={handleAddQuestion} color="primary" variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

// 질문 추천 내역 패널 컴포넌트
const QuestionRecommendationPanel = ({ resume, applicantName }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resume) {
      generateRecommendations();
    }
  }, [resume]);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      // 이력서 기반 질문 추천 로직
      const recommendations = [];
      
      if (resume.experience && resume.experience.length > 0) {
        resume.experience.forEach((exp, index) => {
          recommendations.push({
            id: `exp_${index}`,
            category: '경력',
            question: `${exp.company}에서 ${exp.position}로 일하신 경험에 대해 구체적으로 설명해주세요.`,
            priority: 'high'
          });
        });
      }
      
      if (resume.education && resume.education.length > 0) {
        resume.education.forEach((edu, index) => {
          recommendations.push({
            id: `edu_${index}`,
            category: '학력',
            question: `${edu.school}에서 ${edu.major}를 전공하신 이유와 배운 내용에 대해 설명해주세요.`,
            priority: 'medium'
          });
        });
      }
      
      // 기본 추천 질문들
      recommendations.push(
        {
          id: 'basic_1',
          category: '기본',
          question: '지원하신 직무와 관련하여 가장 자신 있는 기술이나 경험은 무엇인가요?',
          priority: 'high'
        },
        {
          id: 'basic_2',
          category: '기본',
          question: '최근 관심 있게 보고 있는 기술 트렌드나 새로운 기술이 있다면 무엇인가요?',
          priority: 'medium'
        },
        {
          id: 'basic_3',
          category: '기본',
          question: '팀 프로젝트에서 어려웠던 상황과 그를 해결한 방법에 대해 설명해주세요.',
          priority: 'high'
        }
      );
      
      setRecommendations(recommendations);
    } catch (error) {
      console.error('질문 추천 생성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '기본';
    }
  };

  if (!resume) {
    return (
      <Card className="h-full" elevation={0}>
        <CardContent>
          <Typography variant="h6" component="h3" className="text-gray-900 dark:text-gray-100 mb-4">
            질문 추천 내역
          </Typography>
          <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
            지원자를 선택하면 이력서 기반 질문 추천이 표시됩니다.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full" elevation={0}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={3}>
          <LightbulbIcon color="primary" className="mr-2" />
          <Typography variant="h6" component="h3" className="text-gray-900 dark:text-gray-100">
            {applicantName} 질문 추천 내역
          </Typography>
        </Box>
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
              질문 추천을 생성 중입니다...
            </Typography>
          </Box>
        ) : (
          <Box>
            {recommendations.length > 0 ? (
              <List>
                {recommendations.map((rec, index) => (
                  <ListItem key={rec.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" className="text-gray-900 dark:text-gray-100">
                            {rec.question}
                          </Typography>
                          <Chip
                            label={getPriorityLabel(rec.priority)}
                            color={getPriorityColor(rec.priority)}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" className="text-gray-500 dark:text-gray-400">
                          {rec.category}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
                추천 질문이 없습니다.
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// 평가 패널 컴포넌트 (하단 전체 너비)
const EvaluationPanelFull = ({ selectedApplicant, onEvaluationSubmit }) => {
  const [evaluation, setEvaluation] = useState({
    technical: 0,
    communication: 0,
    problemSolving: 0,
    teamwork: 0,
    learning: 0,
    overall: 0
  });
  const [memo, setMemo] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const recordingInterval = useRef(null);

  const handleScoreChange = (category, score) => {
    setEvaluation(prev => ({
      ...prev,
      [category]: score
    }));
  };

  const handleSubmit = () => {
    onEvaluationSubmit({
      applicantId: selectedApplicant?.id,
      evaluation,
      memo
    });
    setSnackbarMessage('평가가 저장되었습니다.');
    setShowSnackbar(true);
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      // 녹음 중지
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      setSnackbarMessage('녹음이 중지되었습니다.');
      setShowSnackbar(true);
    } else {
      // 녹음 시작
      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setSnackbarMessage('녹음이 시작되었습니다.');
      setShowSnackbar(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderScoreSlider = (category, label) => (
    <Box key={category} className="w-full md:w-1/2 p-2">
      <Box mb={3}>
        <Typography variant="body2" className="text-gray-700 dark:text-gray-300 mb-1">
          {label}: {evaluation[category]}/10
        </Typography>
        <Slider
          value={evaluation[category]}
          onChange={(e, value) => handleScoreChange(category, value)}
          min={0}
          max={10}
          step={1}
          marks
          valueLabelDisplay="auto"
          color="primary"
        />
      </Box>
    </Box>
  );

  return (
    <Paper className="w-full p-4" elevation={0}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <AssessmentIcon color="primary" className="mr-2" />
          <Typography variant="h6" component="h3" className="text-gray-900 dark:text-gray-100">
            면접 평가
          </Typography>
        </Box>
        
        {selectedApplicant && (
          <Box display="flex" alignItems="center" gap={2}>
            {isRecording && (
              <Typography variant="body2" className="text-red-600 font-medium">
                {formatTime(recordingTime)}
              </Typography>
            )}
            <Tooltip title={isRecording ? "녹음 중지" : "녹음 시작"}>
              <IconButton
                color={isRecording ? "error" : "primary"}
                onClick={handleRecordingToggle}
                size="large"
              >
                {isRecording ? <StopIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
      
      {selectedApplicant ? (
        <Box>
          <Typography variant="body1" className="text-gray-900 dark:text-gray-100 mb-4">
            평가 대상: <strong>{selectedApplicant.name}</strong>
          </Typography>
          
          <Box display="flex" flexWrap="wrap" gap={2} mb={4}>
            {renderScoreSlider('technical', '기술적 역량')}
            {renderScoreSlider('communication', '의사소통 능력')}
            {renderScoreSlider('problemSolving', '문제해결 능력')}
            {renderScoreSlider('teamwork', '팀워크')}
            {renderScoreSlider('learning', '학습 의지')}
            {renderScoreSlider('overall', '종합 평가')}
          </Box>
          
          <Box mb={3}>
            <TextField
              label="면접 평가 메모"
              multiline
              rows={4}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="면접 평가 메모를 입력하세요..."
            />
          </Box>
          
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSubmit}
              startIcon={<SaveIcon />}
            >
              평가 저장
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
          지원자를 선택해주세요.
        </Typography>
      )}

      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

function InterviewProgress() {
  const { jobPostId, interviewStage = 'first' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 상태 관리
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobPost, setJobPost] = useState(null);
  
  // 질문 관리
  const [commonQuestions, setCommonQuestions] = useState([
    '자기소개를 해주세요.',
    '지원 동기는 무엇인가요?',
    '본인의 강점과 약점은 무엇인가요?'
  ]);
  const [customQuestions, setCustomQuestions] = useState([]);
  
  // 패널 상태
  const [showSelectionScreen, setShowSelectionScreen] = useState(true);
  const [activeTab, setActiveTab] = useState('applicants'); // 'applicants' 또는 'questions'
  const [panelSizes, setPanelSizes] = useState({
    resume: { width: 400, height: 300 },
    commonQuestions: { width: 400, height: 300 },
    customQuestions: { width: 400, height: 300 },
    questionRecommendation: { width: 400, height: 300 }
  });

  // 지원자 목록 로드
  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true);
      try {
        const endpoint = `/applications/job/${jobPostId}/applicants-with-interview`;
        const res = await api.get(endpoint);
        setApplicants(res.data);
      } catch (err) {
        console.error('지원자 목록 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    if (jobPostId) {
      fetchApplicants();
    }
  }, [jobPostId]);

  // 공고 정보 로드
  useEffect(() => {
    const fetchJobPost = async () => {
      try {
        const res = await api.get(`/company/jobposts/${jobPostId}`);
        setJobPost(res.data);
      } catch (err) {
        console.error('공고 정보 로드 실패:', err);
      }
    };

    if (jobPostId) {
      fetchJobPost();
    }
  }, [jobPostId]);

  // 지원자 선택 핸들러
  const handleSelectApplicant = async (applicant) => {
    setSelectedApplicant({
      ...applicant,
      id: applicant.applicant_id || applicant.id
    });
    
    try {
      const res = await api.get(`/applications/${applicant.applicant_id || applicant.id}`);
      const mappedResume = mapResumeData(res.data);
      setResume(mappedResume);
      
      // 맞춤형 질문 로드 (기본 질문으로 초기화)
      setCustomQuestions([
        "지원자의 주요 프로젝트 경험에 대해 설명해주세요.",
        "기술적 문제를 해결한 경험이 있다면 구체적으로 설명해주세요.",
        "팀 프로젝트에서 본인의 역할과 기여도는 어떻게 되었나요?"
      ]);
      
      setShowSelectionScreen(false);
    } catch (err) {
      console.error('지원자 데이터 로드 실패:', err);
    }
  };

  // 평가 제출 핸들러
  const handleEvaluationSubmit = (evaluationData) => {
    console.log('평가 제출:', evaluationData);
    // TODO: API로 평가 데이터 전송
    alert('평가가 저장되었습니다.');
  };

  // 선택 화면으로 돌아가기
  const handleBackToSelection = () => {
    setShowSelectionScreen(true);
    setSelectedApplicant(null);
    setResume(null);
    setCustomQuestions([]);
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Navbar />
        <ViewPostSidebar jobPost={null} />
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <ViewPostSidebar jobPost={jobPost} />
      
      {/* 헤더 */}
      <div className="fixed top-[64px] left-[90px] right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              1차 면접 (실무진)
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              실무 역량 및 기술 검증
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!showSelectionScreen && selectedApplicant && (
              <Tooltip title="면접 녹음">
                <IconButton
                  color="primary"
                  size="large"
                  className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                >
                  <MicIcon />
                </IconButton>
              </Tooltip>
            )}
            {!showSelectionScreen && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleBackToSelection}
                startIcon={<FiChevronLeft />}
              >
                지원자 선택으로 돌아가기
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div
        className="flex flex-row"
        style={{
          paddingTop: 120,
          marginLeft: 90,
          height: 'calc(100vh - 120px)'
        }}
      >
        {showSelectionScreen ? (
          // 탭 기반 선택 화면
          <div className="flex-1 flex flex-col">
            {/* 탭 네비게이션 */}
            <div className="flex border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <TabButton
                active={activeTab === 'applicants'}
                onClick={() => setActiveTab('applicants')}
              >
                지원자 목록 ({applicants.length}명)
              </TabButton>
              <TabButton
                active={activeTab === 'questions'}
                onClick={() => setActiveTab('questions')}
              >
                공통 질문 ({commonQuestions.length}개)
              </TabButton>
            </div>
            
            {/* 탭 컨텐츠 */}
            <div className="flex-1 p-6">
              {activeTab === 'applicants' ? (
                <ApplicantListFull
                  applicants={applicants}
                  selectedApplicant={selectedApplicant}
                  onSelectApplicant={handleSelectApplicant}
                />
              ) : (
                <CommonQuestionsPanelFull
                  questions={commonQuestions}
                  onQuestionsChange={setCommonQuestions}
                />
              )}
            </div>
          </div>
        ) : (
          // 면접 진행 화면 - 새로운 레이아웃
          <div className="flex-1 flex flex-col">
            {/* 상단 패널들 */}
            <div className="flex-1 relative mb-4">
              <DraggablePanel
                title="이력서"
                initialSize={{ ...panelSizes.resume, x: 20, y: 20 }}
                onSizeChange={(size) => setPanelSizes(prev => ({ ...prev, resume: size }))}
              >
                <ResumePanel resume={resume} loading={false} />
              </DraggablePanel>
              
              <DraggablePanel
                title="공통 질문"
                initialSize={{ ...panelSizes.commonQuestions, x: 440, y: 20 }}
                onSizeChange={(size) => setPanelSizes(prev => ({ ...prev, commonQuestions: size }))}
              >
                <CommonQuestionsPanel
                  questions={commonQuestions}
                  onQuestionsChange={setCommonQuestions}
                />
              </DraggablePanel>
              
              <DraggablePanel
                title="맞춤형 질문"
                initialSize={{ ...panelSizes.customQuestions, x: 20, y: 340 }}
                onSizeChange={(size) => setPanelSizes(prev => ({ ...prev, customQuestions: size }))}
              >
                <CustomQuestionsPanel
                  questions={customQuestions}
                  onQuestionsChange={setCustomQuestions}
                  applicantName={selectedApplicant?.name}
                />
              </DraggablePanel>
              
              <DraggablePanel
                title="질문 추천 내역"
                initialSize={{ ...panelSizes.questionRecommendation, x: 440, y: 340 }}
                onSizeChange={(size) => setPanelSizes(prev => ({ ...prev, questionRecommendation: size }))}
              >
                <QuestionRecommendationPanel
                  resume={resume}
                  applicantName={selectedApplicant?.name}
                />
              </DraggablePanel>
            </div>
            
            {/* 하단 평가 패널 (전체 너비) */}
            <div className="h-80 p-4">
              <EvaluationPanelFull
                selectedApplicant={selectedApplicant}
                onEvaluationSubmit={handleEvaluationSubmit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewProgress; 