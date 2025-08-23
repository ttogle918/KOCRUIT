import React, { useState } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSave } from 'react-icons/fi';
import { Button, TextField, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Divider } from '@mui/material';

// 전체 화면 공통 질문 패널
export const CommonQuestionsPanelFull = ({ questions, onQuestionsChange }) => {
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

  const handleAdd = () => {
    if (editText.trim()) {
      const newQuestions = [...questions, editText.trim()];
      onQuestionsChange(newQuestions);
      setEditText('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TextField
          fullWidth
          label="새 질문 추가"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button
          variant="contained"
          onClick={handleAdd}
          startIcon={<FiPlus />}
        >
          추가
        </Button>
      </div>

      <List>
        {questions.map((question, index) => (
          <React.Fragment key={index}>
            <ListItem>
              {editingIndex === index ? (
                <div className="flex-1 flex items-center gap-2">
                  <TextField
                    fullWidth
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <IconButton onClick={handleSave} color="primary">
                    <FiSave />
                  </IconButton>
                </div>
              ) : (
                <>
                  <ListItemText primary={question} />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => handleEdit(index)} color="primary">
                      <FiEdit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(index)} color="error">
                      <FiTrash2 />
                    </IconButton>
                  </ListItemSecondaryAction>
                </>
              )}
            </ListItem>
            {index < questions.length - 1 && <Divider />}
          </React.Fragment>
        ))}
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
