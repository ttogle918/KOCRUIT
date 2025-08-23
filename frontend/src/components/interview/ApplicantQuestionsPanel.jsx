import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Chip,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  shadows: [
    "none",
    "0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.24)",
    ...Array(23).fill("none")
  ]
});

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

const ApplicantQuestionsPanel = ({
  questions = [],
  onChange,
  fullWidth = false,
  applicantName = '',
  toolsLoading = false
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [addingIndex, setAddingIndex] = useState(null);
  const [addValue, setAddValue] = useState('');

  // Drag & Drop
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = reorder(questions, result.source.index, result.destination.index);
    onChange && onChange(reordered);
  };

  // 삭제
  const handleDelete = (idx) => {
    const updated = questions.filter((_, i) => i !== idx);
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
    setAddingIndex(null);
    setAddValue('');
    onChange && onChange(updated);
  };

  return (
    <MuiThemeProvider theme={muiTheme}>
      <Box sx={{ p: 2, height: '100%', width: fullWidth ? '100%' : undefined, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {applicantName ? `${applicantName} 지원자 질문` : '지원자별 질문'}
          </Typography>
          <Chip 
            label={`${questions.length}개 질문`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>

        {toolsLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <Typography sx={{ ml: 2 }}>질문 생성 중...</Typography>
          </Box>
        ) : questions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">
              아직 생성된 질문이 없습니다.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              지원자를 선택하면 AI가 해당 지원자에 맞는 질문을 생성합니다.
            </Typography>
          </Box>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="applicant-questions-list">
              {(provided) => (
                <List 
                  ref={provided.innerRef} 
                  {...provided.droppableProps} 
                  sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
                >
                  {questions.map((question, idx) => (
                    <React.Fragment key={idx}>
                      <Draggable draggableId={`question-${idx}`} index={idx}>
                        {(provided, snapshot) => (
                          <ListItem
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            sx={{ 
                              bgcolor: snapshot.isDragging ? 'grey.100' : 'inherit', 
                              borderRadius: 1, 
                              mb: 1,
                              border: '1px solid',
                              borderColor: 'grey.200'
                            }}
                            secondaryAction={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconButton 
                                  edge="end" 
                                  size="small" 
                                  onClick={() => handleAdd(idx)}
                                  title="질문 추가"
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  edge="end" 
                                  size="small" 
                                  onClick={() => handleEdit(idx)}
                                  title="질문 수정"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  edge="end" 
                                  size="small" 
                                  onClick={() => handleDelete(idx)}
                                  title="질문 삭제"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            }
                          >
                            <Box
                              {...provided.dragHandleProps}
                              sx={{ mr: 1, cursor: 'grab', color: 'grey.500', display: 'flex', alignItems: 'center' }}
                            >
                              <div className="w-4 h-4 border-2 border-gray-300 border-dashed rounded"></div>
                            </Box>
                            
                            {editingIndex === idx ? (
                              <Box sx={{ flex: 1 }}>
                                <input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleEditSave(idx)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEditSave(idx);
                                    if (e.key === 'Escape') {
                                      setEditingIndex(null);
                                      setEditValue('');
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                  }}
                                  autoFocus
                                />
                              </Box>
                            ) : (
                              <ListItemText
                                primary={
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {question}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" color="text.secondary">
                                    질문 {idx + 1}
                                  </Typography>
                                }
                                sx={{ cursor: 'pointer' }}
                                onDoubleClick={() => handleEdit(idx)}
                              />
                            )}
                          </ListItem>
                        )}
                      </Draggable>
                      
                      {/* 새 질문 입력창 */}
                      {addingIndex === idx && (
                        <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <input
                              value={addValue}
                              onChange={(e) => setAddValue(e.target.value)}
                              onBlur={() => handleAddSave(addingIndex)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddSave(addingIndex);
                                if (e.key === 'Escape') {
                                  setAddingIndex(null);
                                  setAddValue('');
                                }
                              }}
                              placeholder="새 질문을 입력하세요..."
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                              autoFocus
                            />
                          </Box>
                        </ListItem>
                      )}
                    </React.Fragment>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        )}

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            💡 드래그하여 질문 순서를 변경하거나, 더블클릭하여 수정할 수 있습니다.
          </Typography>
        </Box>
      </Box>
    </MuiThemeProvider>
  );
};

export default ApplicantQuestionsPanel; 