import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, List, ListItem, ListItemText, IconButton, Chip, TextField, Button, Divider } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import api from '../../api/api';

const SelectedQuestionsList = ({ jobPostId, refreshTrigger }) => {
  const [questions, setQuestions] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [loading, setLoading] = useState(false);

  // 질문 목록 로드
  const fetchQuestions = async () => {
    if (!jobPostId) return;
    try {
      const res = await api.get(`/ai-interview/job-post/${jobPostId}/selected-questions`);
      if (res.data.success) {
        setQuestions(res.data.questions);
      }
    } catch (error) {
      console.error('질문 목록 로드 실패:', error);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [jobPostId, refreshTrigger]);

  // 질문 삭제
  const handleDelete = async (id) => {
    try {
      await api.delete(`/ai-interview/questions/${id}`);
      fetchQuestions();
    } catch (error) {
      console.error('질문 삭제 실패:', error);
    }
  };

  // 직접 질문 추가
  const handleAddCustom = async () => {
    if (!newQuestionText.trim()) return;
    try {
      await api.post(`/ai-interview/job-post/${jobPostId}/questions`, {
        question_text: newQuestionText,
        category: 'custom',
        difficulty: 'medium'
      });
      setNewQuestionText('');
      fetchQuestions();
    } catch (error) {
      console.error('질문 추가 실패:', error);
    }
  };

  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedItemIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    const newQuestions = [...questions];
    const [draggedItem] = newQuestions.splice(draggedItemIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedItem);
    
    setQuestions(newQuestions);
    setDraggedItemIndex(null);

    // 변경된 순서 서버에 저장
    try {
      const questionIds = newQuestions.map(q => q.id);
      await api.put('/ai-interview/questions/order', { question_ids: questionIds });
    } catch (error) {
      console.error('순서 변경 실패:', error);
      // 실패 시 롤백하거나 에러 메시지 표시
    }
  };

  return (
    <Paper sx={{ p: 3, boxShadow: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
          확정된 AI 면접 질문
        </Typography>
        <Chip label={`${questions.length}개`} color="primary" size="small" />
      </Box>
      
      <Typography variant="body2" sx={{ color: 'grey.600', mb: 2 }}>
        실제 AI 면접 체험 시 이 순서대로 질문이 제시됩니다. (드래그하여 순서 변경 가능)
      </Typography>

      <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, border: '1px solid #eee', borderRadius: 1, minHeight: 0 }}>
        <List dense sx={{ height: '100%', overflowY: 'auto' }}>
          {questions.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'grey.500' }}>
              등록된 질문이 없습니다.<br />
              왼쪽에서 질문을 선택하거나 아래에 직접 입력하세요.
            </Box>
          ) : (
            questions.map((q, index) => (
              <ListItem
                key={q.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(q.id)} size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ 
                  bgcolor: 'white', 
                  mb: 1, 
                  borderBottom: '1px solid #f0f0f0',
                  '&:hover': { bgcolor: '#f9fafb' },
                  cursor: 'move',
                  opacity: draggedItemIndex === index ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <Box sx={{ mr: 2, color: 'grey.400', display: 'flex', alignItems: 'center' }}>
                  <DragIcon fontSize="small" sx={{ mr: 1, color: 'grey.300' }} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', mr: 1, width: '20px' }}>{index + 1}</Typography>
                </Box>
                <ListItemText
                  primary={q.question_text}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      {q.category && <Chip label={q.category} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />}
                    </Box>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="추가 질문을 입력하세요..."
          value={newQuestionText}
          onChange={(e) => setNewQuestionText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
        />
        <Button 
          variant="contained" 
          onClick={handleAddCustom}
          disabled={!newQuestionText.trim()}
          sx={{ minWidth: '80px' }}
        >
          추가
        </Button>
      </Box>
    </Paper>
  );
};

export default SelectedQuestionsList;
