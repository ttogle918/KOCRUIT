import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Button, Paper, Box, Chip } from '@mui/material';
import { Mic as MicIcon, MicOff as MicOffIcon, Delete as DeleteIcon } from '@mui/icons-material';

// ?�시�?STT ?�스???�이지
export default function STTTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [sttResults, setSttResults] = useState([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);

  // STT ?�작
  const startSTT = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // MediaRecorder ?�정
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
      
      recorder.start(3000); // 3초마??�?�� ?�성
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
      
      // ?�시�??�성 분석 ?�작
      startRealtimeAnalysis(stream);
      
    } catch (error) {
      console.error('마이???�근 ?�패:', error);
      alert('마이???�근 권한???�요?�니??');
    }
  };

  // STT 중�?
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

  // ?�시�??�성 분석 ?�작
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
      
      // ?�시�?분석 루프
      const analyzeAudio = () => {
        if (!isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // ?�성 ?�벨 계산
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        
        // ?�성??감�??�면 STT 결과 추�? (?�제로는 Whisper API ?�출)
        if (average > 30) {
          addSTTResult(`?�성 감�???(${new Date().toLocaleTimeString()}) - ?�벨: ${average.toFixed(0)}`);
        }
        
        requestAnimationFrame(analyzeAudio);
      };
      
      analyzeAudio();
      
    } catch (error) {
      console.error('?�시�?분석 ?�작 ?�패:', error);
    }
  };

  const processAudioChunk = async (audioBlob) => {
    try {
      // const formData = new FormData();
      // formData.append('audio', audioBlob);
      // const response = await api.post('/whisper/transcribe', formData);
      
      const dummyResults = [
        '?�기?�개�??�주?�요.',
        '지???�기??무엇?��???',
        '본인??강점�??�점?� 무엇?��???',
        '주요 ?�로?�트 경험???�???�명?�주?�요.',
        '?�려??기술 문제�??�결??경험??공유?�주?�요.',
        '?� ?�로?�트?�서????���?기여?��? ?�명?�주?�요.',
        '최근???�습??기술?�나 지?�에 ?�??말�??�주?�요.',
        '직장?�서???�려???�황???�떻�??�결?�는지 ?�시�??�어주세??',
        '?�으로의 커리??계획???�???�야기해주세??',
        '?�사??기여?????�는 부분�? 무엇?��???'
      ];
      
      const randomResult = dummyResults[Math.floor(Math.random() * dummyResults.length)];
      addSTTResult(randomResult);
      
    } catch (error) {
      console.error('?�디??처리 ?�패:', error);
      addSTTResult('?�디??처리 �??�류가 발생?�습?�다.');
    }
  };

  // STT 결과 추�?
  const addSTTResult = (text) => {
    const newResult = {
      id: Date.now(),
      text,
      timestamp: new Date().toLocaleTimeString(),
      confidence: Math.random() * 0.3 + 0.7 // 0.7 ~ 1.0
    };
    
    setSttResults(prev => [newResult, ...prev.slice(0, 19)]); // 최�? 20�??��?
  };

  // STT 결과 ??��
  const removeSTTResult = (id) => {
    setSttResults(prev => prev.filter(result => result.id !== id));
  };

  // STT 결과 초기??
  const clearSTTResults = () => {
    setSttResults([]);
  };

  // 컴포?�트 ?�마?�트 ???�리
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
        ?�시�?STT ?�스??
      </Typography>
      
      {/* STT 컨트�?*/}
      <Paper className="p-6 mb-6">
        <Typography variant="h6" component="h2" className="mb-4">
          STT 컨트�?
        </Typography>
        
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant={isRecording ? "contained" : "outlined"}
            color={isRecording ? "error" : "primary"}
            size="large"
            startIcon={isRecording ? <MicOffIcon /> : <MicIcon />}
            onClick={isRecording ? stopSTT : startSTT}
          >
            {isRecording ? "STT 중�?" : "STT ?�작"}
          </Button>
          
          {sttResults.length > 0 && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={clearSTTResults}
            >
              결과 초기??
            </Button>
          )}
        </div>
        
        {/* ?�성 ?�벨 ?�시 */}
        {isRecording && (
          <Box className="mb-4">
            <Typography variant="body2" className="mb-2">
              ?�성 ?�벨: {audioLevel.toFixed(0)}
            </Typography>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${Math.min((audioLevel / 255) * 100, 100)}%` }}
              ></div>
            </div>
          </Box>
        )}
        
        {/* ?�태 ?�시 */}
        <Box className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <Typography variant="body2">
              {isRecording ? '?�성 ?�식 �?..' : 'STT 준비됨'}
            </Typography>
          </div>
        </Box>
      </Paper>
      
      {/* STT 결과 */}
      <Paper className="p-6">
        <Typography variant="h6" component="h2" className="mb-4">
          STT 결과 ({sttResults.length}�?
        </Typography>
        
        {sttResults.length === 0 ? (
          <Box className="text-center py-8">
            <MicIcon className="text-gray-400 text-4xl mb-2" />
            <Typography variant="body2" color="text.secondary">
              STT�??�작?�고 마이?�에 말�??�보?�요.
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

