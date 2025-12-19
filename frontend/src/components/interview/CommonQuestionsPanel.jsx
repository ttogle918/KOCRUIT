import React, { useState } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSave } from 'react-icons/fi';
import { Button, TextField, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Divider, Chip } from '@mui/material';

// 전체 화면 공통 질문 패널
export const CommonQuestionsPanelFull = ({ questions, onQuestionsChange }) => {
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editText, setEditText] = useState('');
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  // Helper to safely get question text
  const getQuestionText = (q) => (typeof q === 'string' ? q : q.question_text || '');

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditText(getQuestionText(questions[index]));
  };

  const handleSave = () => {
    if (editingIndex >= 0 && editText.trim()) {
      const newQuestions = [...questions];
      const currentQ = newQuestions[editingIndex];
      
      if (typeof currentQ === 'object') {
        newQuestions[editingIndex] = { ...currentQ, question_text: editText.trim() };
      } else {
        newQuestions[editingIndex] = editText.trim();
      }
      
      onQuestionsChange(newQuestions);
      setEditingIndex(-1);
      setEditText('');
    }
  };

  const handleDelete = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    onQuestionsChange(newQuestions);
  };

  const handleAdd = () => {
    if (editText.trim()) {
      // 새 질문은 기본적으로 객체 형태로 추가 (기본 타입: COMMON)
      const newQuestion = {
        question_text: editText.trim(),
        type: 'COMMON',
        category: 'general'
      };
      const newQuestions = [...questions, newQuestion];
      onQuestionsChange(newQuestions);
      setEditText('');
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemIndex === null || draggedItemIndex === index) return;
  };

  const handleDragEnd = (e) => {
    setDraggedItemIndex(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    const newQuestions = [...questions];
    const [draggedItem] = newQuestions.splice(draggedItemIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedItem);
    
    onQuestionsChange(newQuestions);
    setDraggedItemIndex(null);
  };

  const getTypeChipColor = (type) => {
    switch (type) {
      case 'COMMON': return 'primary';
      case 'PERSONAL': return 'success';
      case 'JOB': return 'warning';
      case 'EXECUTIVE': return 'secondary';
      default: return 'default';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'COMMON': return '공통';
      case 'PERSONAL': return '개인';
      case 'JOB': return '직무';
      case 'EXECUTIVE': return '임원';
      default: return type || '기타';
    }
  };

  const getDifficultyChipColor = (difficulty) => {
    switch (String(difficulty).toLowerCase()) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch (String(difficulty).toLowerCase()) {
      case 'easy': return '쉬움';
      case 'medium': return '보통';
      case 'hard': return '어려움';
      default: return difficulty || '보통';
    }
  };

  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <TextField
          fullWidth
          label="새 질문 추가"
          value={editingIndex === -1 ? editText : ''} 
          onChange={(e) => editingIndex === -1 && setEditText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && editingIndex === -1 && handleAdd()}
          placeholder="질문 내용을 입력하세요"
          variant="outlined"
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleAdd}
          startIcon={<FiPlus />}
          className="whitespace-nowrap h-10 bg-blue-600 hover:bg-blue-700"
        >
          추가
        </Button>
      </div>

      <List className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-2 custom-scrollbar">
        {questions.map((question, index) => (
          <div
            key={index}
            draggable={editingIndex !== index}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, index)}
            className={`
              transition-all duration-200 rounded-lg border
              ${draggedItemIndex === index ? 'opacity-50 bg-gray-100 border-dashed border-gray-400' : 'bg-white border-gray-200 hover:shadow-md hover:border-blue-300'}
              ${editingIndex === index ? 'ring-2 ring-blue-500 border-transparent' : ''}
            `}
          >
            <ListItem className="cursor-move flex flex-col items-start gap-1"> 
              {editingIndex === index ? (
                <div className="flex-1 flex items-center gap-2 py-1 w-full">
                  <TextField
                    fullWidth
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                    autoFocus
                    size="small"
                  />
                  <IconButton onClick={handleSave} color="primary" size="small" className="bg-blue-50 hover:bg-blue-100">
                    <FiSave />
                  </IconButton>
                </div>
              ) : (
                <div className="w-full flex items-center">
                  <div className="mr-3 text-gray-400 flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 3h2v2H9V3zm4 0h2v2h-2V3zm-4 4h2v2H9V7zm4 0h2v2h-2V7zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z"/>
                    </svg>
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      {typeof question === 'object' && question.type && (
                        <Chip 
                          label={getTypeLabel(question.type)} 
                          size="small" 
                          color={getTypeChipColor(question.type)} 
                          variant="outlined"
                          sx={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}
                        />
                      )}
                      {typeof question === 'object' && question.difficulty && (
                        <Chip 
                          label={getDifficultyLabel(question.difficulty)} 
                          size="small" 
                          color={getDifficultyChipColor(question.difficulty)} 
                          variant="outlined"
                          sx={{ height: '20px', fontSize: '0.7rem' }}
                        />
                      )}
                    </div>
                    <ListItemText 
                      primary={getQuestionText(question)} 
                      primaryTypographyProps={{ className: 'text-gray-700 font-medium break-all whitespace-pre-wrap' }}
                    />
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    <IconButton onClick={() => handleEdit(index)} className="text-blue-500 hover:bg-blue-50 mr-1">
                      <FiEdit size={18} />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(index)} className="text-red-500 hover:bg-red-50">
                      <FiTrash2 size={18} />
                    </IconButton>
                  </div>
                </div>
              )}
            </ListItem>
          </div>
        ))}
        
        {questions.length === 0 && (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            등록된 공통 질문이 없습니다.
            <br />
            새로운 질문을 추가해보세요.
          </div>
        )}
      </List>
    </div>
  );
};

// 축소된 공통 질문 패널
export const CommonQuestionsPanel = ({ questions, onQuestionsChange }) => {
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editText, setEditText] = useState('');

  // Helper to safely get question text
  const getQuestionText = (q) => (typeof q === 'string' ? q : q.question_text || '');

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditText(getQuestionText(questions[index]));
  };

  const handleSave = () => {
    if (editingIndex >= 0 && editText.trim()) {
      const newQuestions = [...questions];
      const currentQ = newQuestions[editingIndex];
      
      if (typeof currentQ === 'object') {
        newQuestions[editingIndex] = { ...currentQ, question_text: editText.trim() };
      } else {
        newQuestions[editingIndex] = editText.trim();
      }
      
      onQuestionsChange(newQuestions);
      setEditingIndex(-1);
      setEditText('');
    }
  };

  const handleDelete = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    onQuestionsChange(newQuestions);
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-800 dark:text-white">공통 질문</h4>
      <div className="space-y-2">
        {questions.map((question, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
            {editingIndex === index ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                  className="flex-1 px-2 py-1 border rounded"
                />
                <IconButton onClick={handleSave} size="small" color="primary">
                  <FiSave />
                </IconButton>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm">{getQuestionText(question)}</span>
                <IconButton onClick={() => handleEdit(index)} size="small" color="primary">
                  <FiEdit />
                </IconButton>
                <IconButton onClick={() => handleDelete(index)} size="small" color="error">
                  <FiTrash2 />
                </IconButton>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommonQuestionsPanel;