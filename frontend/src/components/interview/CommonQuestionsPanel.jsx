import React, { useState } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSave } from 'react-icons/fi';
import { Button, TextField, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Divider } from '@mui/material';

// 전체 화면 공통 질문 패널
export const CommonQuestionsPanelFull = ({ questions, onQuestionsChange }) => {
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editText, setEditText] = useState('');
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditText(questions[index] || '');
  };

  const handleSave = () => {
    if (editingIndex >= 0 && editText.trim()) {
      const newQuestions = [...questions];
      newQuestions[editingIndex] = editText.trim();
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
      const newQuestions = [...questions, editText.trim()];
      onQuestionsChange(newQuestions);
      setEditText('');
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    // 드래그 효과 설정 (선택 사항)
    e.dataTransfer.effectAllowed = 'move';
    // 투명도 조절로 드래그 중임을 표시
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); // 드롭 허용을 위해 필수
    e.dataTransfer.dropEffect = 'move';
    
    // 드래그 중인 아이템이 없거나 자기 자신 위라면 무시
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    // 리스트 순서 변경 로직 (실시간 미리보기 효과를 위해 여기서 처리 가능하지만,
    // 간단하게 drop 시점에만 처리하거나, 스로틀링해서 처리할 수 있음.
    // 여기서는 간단하게 구현하기 위해 dragOver에서는 시각적 피드백만 주거나 생략)
  };

  const handleDragEnd = (e) => {
    setDraggedItemIndex(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    // 배열 순서 변경
    const newQuestions = [...questions];
    const [draggedItem] = newQuestions.splice(draggedItemIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedItem);
    
    onQuestionsChange(newQuestions);
    setDraggedItemIndex(null);
  };

  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <TextField
          fullWidth
          label="새 질문 추가"
          value={editingIndex === -1 ? editText : ''} // 편집 중일 땐 입력창 비움 방지
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
            draggable={editingIndex !== index} // 편집 중엔 드래그 방지
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
            <ListItem className="cursor-move"> {/* cursor-move 추가 */}
              {editingIndex === index ? (
                <div className="flex-1 flex items-center gap-2 py-1">
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
                <>
                  <div className="mr-3 text-gray-400">
                    {/* 드래그 핸들 아이콘 (점 6개) */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 3h2v2H9V3zm4 0h2v2h-2V3zm-4 4h2v2H9V7zm4 0h2v2h-2V7zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z"/>
                    </svg>
                  </div>
                  <ListItemText 
                    primary={question} 
                    primaryTypographyProps={{ className: 'text-gray-700 font-medium' }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => handleEdit(index)} className="text-blue-500 hover:bg-blue-50 mr-1">
                      <FiEdit size={18} />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(index)} className="text-red-500 hover:bg-red-50">
                      <FiTrash2 size={18} />
                    </IconButton>
                  </ListItemSecondaryAction>
                </>
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

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditText(questions[index] || '');
  };

  const handleSave = () => {
    if (editingIndex >= 0 && editText.trim()) {
      const newQuestions = [...questions];
      newQuestions[editingIndex] = editText.trim();
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
                <span className="flex-1 text-sm">{question}</span>
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
