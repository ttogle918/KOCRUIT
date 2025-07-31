import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  VideoFile,
  PlayArrow,
  Download,
  Info,
  Refresh,
  CheckCircle,
  Schedule
} from '@mui/icons-material';
import api from '../api/api';

const LocalVideoSelector = ({ onVideoSelect, selectedVideo }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadLocalVideos();
  }, []);

  const loadLocalVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/ai-interview/local-videos');
      if (response.data.success) {
        setVideos(response.data.videos);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('로컬 비디오 목록을 불러올 수 없습니다.');
      console.error('로컬 비디오 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = (video) => {
    onVideoSelect(video);
    setOpen(false);
  };

  const formatFileSize = (sizeMB) => {
    if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(1)} KB`;
    return `${sizeMB.toFixed(1)} MB`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('ko-KR');
  };

  const getVideoInfo = (filename) => {
    // 파일명에서 지원자 ID 추출 시도
    const match = filename.match(/interview_(\d+)/);
    if (match) {
      return `지원자 ID: ${match[1]}`;
    }
    return '지원자 정보 없음';
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<VideoFile />}
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
      >
        로컬 비디오 선택
      </Button>

      {selectedVideo && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            선택된 비디오: {selectedVideo.filename}
          </Typography>
        </Alert>
      )}

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              로컬 비디오 파일 선택
            </Typography>
            <IconButton onClick={loadLocalVideos} disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : videos.length === 0 ? (
            <Alert severity="info">
              로컬 비디오 파일이 없습니다. interview_videos 디렉토리에 MP4 파일을 추가해주세요.
            </Alert>
          ) : (
            <List>
              {videos.map((video, index) => (
                <ListItem
                  key={index}
                  sx={{
                    border: 1,
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      bgcolor: 'grey.50'
                    }
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="재생">
                        <IconButton
                          onClick={() => window.open(video.url, '_blank')}
                          size="small"
                        >
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleVideoSelect(video)}
                        startIcon={<CheckCircle />}
                      >
                        선택
                      </Button>
                    </Box>
                  }
                >
                  <ListItemIcon>
                    <VideoFile color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {video.filename}
                        </Typography>
                        <Chip 
                          label={getVideoInfo(video.filename)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Download fontSize="small" />
                          <Typography variant="caption">
                            {formatFileSize(video.size_mb)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Schedule fontSize="small" />
                          <Typography variant="caption">
                            {formatDate(video.modified)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LocalVideoSelector; 