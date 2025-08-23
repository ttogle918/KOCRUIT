import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Button, Paper, Box, Chip } from '@mui/material';
import { Mic as MicIcon, MicOff as MicOffIcon, Delete as DeleteIcon } from '@mui/icons-material';

// 실시간 STT 테스트 페이지
export default function STTTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [sttResults, setSttResults] = useState([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);

  // STT 시작
  const startSTT = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // MediaRecorder 설정
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await processAudioChunk(audioBlob);
      };
      
      recorder.start(3000); // 3초마다 청크 생성
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
      
      // 실시간 음성 분석 시작
      startRealtimeAnalysis(stream);
      
    } catch (error) {
      console.error('마이크 접근 실패:', error);
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  // STT 중지
  const stopSTT = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsRecording(false);
    setMediaRecorder(null);
    setAudioChunks([]);
    setAudioLevel(0);
  };

  // 실시간 음성 분석 시작
  const startRealtimeAnalysis = (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;
      
      microphone.connect(analyser);
      
      // 실시간 분석 루프
      const analyzeAudio = () => {
        if (!isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // 음성 레벨 계산
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        
        // 음성이 감지되면 STT 결과 추가 (실제로는 Whisper API 호출)
        if (average > 30) {
          addSTTResult(`음성 감지됨 (${new Date().toLocaleTimeString()}) - 레벨: ${average.toFixed(0)}`);
        }
        
        requestAnimationFrame(analyzeAudio);
      };
      
      analyzeAudio();
      
    } catch (error) {
      console.error('실시간 분석 시작 실패:', error);
    }
  };

  // 오디오 청크 처리 (실제 Whisper API 연동)
  const processAudioChunk = async (audioBlob) => {
    try {
      // 실제 구현에서는 Whisper API 호출
      // const formData = new FormData();
      // formData.append('audio', audioBlob);
      // const response = await api.post('/whisper/transcribe', formData);
      
      // 임시로 더미 결과 생성
      const dummyResults = [
        '자기소개를 해주세요.',
        '지원 동기는 무엇인가요?',
        '본인의 강점과 약점은 무엇인가요?',
        '주요 프로젝트 경험에 대해 설명해주세요.',
        '어려운 기술 문제를 해결한 경험을 공유해주세요.',
        '팀 프로젝트에서의 역할과 기여도를 설명해주세요.',
        '최근에 학습한 기술이나 지식에 대해 말씀해주세요.',
        '직장에서의 어려운 상황을 어떻게 해결했는지 예시를 들어주세요.',
        '앞으로의 커리어 계획에 대해 이야기해주세요.',
        '회사에 기여할 수 있는 부분은 무엇인가요?'
      ];
      
      const randomResult = dummyResults[Math.floor(Math.random() * dummyResults.length)];
      addSTTResult(randomResult);
      
    } catch (error) {
      console.error('오디오 처리 실패:', error);
      addSTTResult('오디오 처리 중 오류가 발생했습니다.');
    }
  };

  // STT 결과 추가
  const addSTTResult = (text) => {
    const newResult = {
      id: Date.now(),
      text,
      timestamp: new Date().toLocaleTimeString(),
      confidence: Math.random() * 0.3 + 0.7 // 0.7 ~ 1.0
    };
    
    setSttResults(prev => [newResult, ...prev.slice(0, 19)]); // 최대 20개 유지
  };

  // STT 결과 삭제
  const removeSTTResult = (id) => {
    setSttResults(prev => prev.filter(result => result.id !== id));
  };

  // STT 결과 초기화
  const clearSTTResults = () => {
    setSttResults([]);
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (mediaRecorder && isRecording) {
        stopSTT();
      }
    };
  }, [mediaRecorder, isRecording]);

  return (
    <Container maxWidth="lg" className="py-8">
      <Typography variant="h4" component="h1" className="mb-6 text-center">
        실시간 STT 테스트
      </Typography>
      
      {/* STT 컨트롤 */}
      <Paper className="p-6 mb-6">
        <Typography variant="h6" component="h2" className="mb-4">
          STT 컨트롤
        </Typography>
        
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant={isRecording ? "contained" : "outlined"}
            color={isRecording ? "error" : "primary"}
            size="large"
            startIcon={isRecording ? <MicOffIcon /> : <MicIcon />}
            onClick={isRecording ? stopSTT : startSTT}
          >
            {isRecording ? "STT 중지" : "STT 시작"}
          </Button>
          
          {sttResults.length > 0 && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={clearSTTResults}
            >
              결과 초기화
            </Button>
          )}
        </div>
        
        {/* 음성 레벨 표시 */}
        {isRecording && (
          <Box className="mb-4">
            <Typography variant="body2" className="mb-2">
              음성 레벨: {audioLevel.toFixed(0)}
            </Typography>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${Math.min((audioLevel / 255) * 100, 100)}%` }}
              ></div>
            </div>
          </Box>
        )}
        
        {/* 상태 표시 */}
        <Box className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <Typography variant="body2">
              {isRecording ? '음성 인식 중...' : 'STT 준비됨'}
            </Typography>
          </div>
        </Box>
      </Paper>
      
      {/* STT 결과 */}
      <Paper className="p-6">
        <Typography variant="h6" component="h2" className="mb-4">
          STT 결과 ({sttResults.length}개)
        </Typography>
        
        {sttResults.length === 0 ? (
          <Box className="text-center py-8">
            <MicIcon className="text-gray-400 text-4xl mb-2" />
            <Typography variant="body2" color="text.secondary">
              STT를 시작하고 마이크에 말씀해보세요.
            </Typography>
          </Box>
        ) : (
          <div className="space-y-3">
            {sttResults.map((result) => (
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
                  <Button
                    size="small"
                    onClick={() => removeSTTResult(result.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <DeleteIcon fontSize="small" />
                  </Button>
                </div>
              </Paper>
            ))}
          </div>
        )}
      </Paper>
    </Container>
  );
}
