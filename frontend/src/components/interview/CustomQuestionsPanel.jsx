import React, { useState } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSave } from 'react-icons/fi';
import { Button, TextField, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Divider } from '@mui/material';

const CustomQuestionsPanel = ({ questions, onQuestionsChange, applicantName }) => {
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
          label={`${applicantName || '지원자'} 전용 질문 추가`}
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

export default CustomQuestionsPanel;
