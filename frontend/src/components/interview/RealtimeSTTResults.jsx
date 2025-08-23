import React from 'react';
import { Typography, Paper, Chip, IconButton, Box } from '@mui/material';
import { Delete as DeleteIcon, Mic as MicIcon } from '@mui/icons-material';

const RealtimeSTTResults = ({ 
  isRealtimeAnalysisEnabled, 
  realtimeAnalysisResults, 
  maxResults = 20,
  onRemoveResult
}) => {
  if (!isRealtimeAnalysisEnabled) {
    return (
      <Box className="text-center py-8">
        <MicIcon className="text-gray-400 text-4xl mb-2" />
        <Typography variant="body2" color="text.secondary">
          상단의 STT 시작 버튼을 클릭하면 실시간 음성 인식이 시작됩니다.
        </Typography>
      </Box>
    );
  }

  if (realtimeAnalysisResults.length === 0) {
    return (
      <Box className="text-center py-8">
        <Typography variant="body2" color="text.secondary">
          음성 인식 결과가 아직 없습니다. 마이크에 말씀해보세요.
        </Typography>
      </Box>
    );
  }

  return (
    <div className="space-y-2">
      {realtimeAnalysisResults.slice(0, maxResults).map((result) => (
        <Paper key={result.id} elevation={1} className="p-3 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Typography variant="caption" color="text.secondary" className="font-medium">
                  {result.timestamp}
                </Typography>
                {result.confidence && (
                  <Chip 
                    label={`${(result.confidence * 100).toFixed(0)}%`}
                    size="small" 
                    variant="outlined"
                    color={result.confidence > 0.8 ? "success" : result.confidence > 0.6 ? "warning" : "error"}
                  />
                )}
              </div>
              <Typography variant="body2" className="text-gray-800">
                {result.text}
              </Typography>
            </div>
            {onRemoveResult && (
              <IconButton
                size="small"
                onClick={() => onRemoveResult(result.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </div>
        </Paper>
      ))}
      
      {realtimeAnalysisResults.length > maxResults && (
        <Typography variant="caption" color="text.secondary" className="text-center block py-2">
          최근 {maxResults}개 결과만 표시됩니다. (총 {realtimeAnalysisResults.length}개)
        </Typography>
      )}
    </div>
  );
};

export default RealtimeSTTResults;
