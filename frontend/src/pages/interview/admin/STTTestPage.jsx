import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Button, Paper, Box, Chip } from '@mui/material';
import { Mic as MicIcon, MicOff as MicOffIcon, Delete as DeleteIcon } from '@mui/icons-material';

// ?§ÏãúÍ∞?STT ?åÏä§???òÏù¥ÏßÄ
export default function STTTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [sttResults, setSttResults] = useState([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);

  // STT ?úÏûë
  const startSTT = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // MediaRecorder ?§Ï†ï
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
      
      recorder.start(3000); // 3Ï¥àÎßà??Ï≤?Å¨ ?ùÏÑ±
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
      
      // ?§ÏãúÍ∞??åÏÑ± Î∂ÑÏÑù ?úÏûë
      startRealtimeAnalysis(stream);
      
    } catch (error) {
      console.error('ÎßàÏù¥???ëÍ∑º ?§Ìå®:', error);
      alert('ÎßàÏù¥???ëÍ∑º Í∂åÌïú???ÑÏöî?©Îãà??');
    }
  };

  // STT Ï§ëÏ?
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

  // ?§ÏãúÍ∞??åÏÑ± Î∂ÑÏÑù ?úÏûë
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
      
      // ?§ÏãúÍ∞?Î∂ÑÏÑù Î£®ÌîÑ
      const analyzeAudio = () => {
        if (!isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // ?åÏÑ± ?àÎ≤® Í≥ÑÏÇ∞
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        
        // ?åÏÑ±??Í∞êÏ??òÎ©¥ STT Í≤∞Í≥º Ï∂îÍ? (?§Ï†úÎ°úÎäî Whisper API ?∏Ï∂ú)
        if (average > 30) {
          addSTTResult(`?åÏÑ± Í∞êÏ???(${new Date().toLocaleTimeString()}) - ?àÎ≤®: ${average.toFixed(0)}`);
        }
        
        requestAnimationFrame(analyzeAudio);
      };
      
      analyzeAudio();
      
    } catch (error) {
      console.error('?§ÏãúÍ∞?Î∂ÑÏÑù ?úÏûë ?§Ìå®:', error);
    }
  };

  // ?§Îîî??Ï≤?Å¨ Ï≤òÎ¶¨ (?§Ï†ú Whisper API ?∞Îèô)
  const processAudioChunk = async (audioBlob) => {
    try {
      // ?§Ï†ú Íµ¨ÌòÑ?êÏÑú??Whisper API ?∏Ï∂ú
      // const formData = new FormData();
      // formData.append('audio', audioBlob);
      // const response = await api.post('/whisper/transcribe', formData);
      
      // ?ÑÏãúÎ°??îÎ? Í≤∞Í≥º ?ùÏÑ±
      const dummyResults = [
        '?êÍ∏∞?åÍ∞úÎ•??¥Ï£º?∏Ïöî.',
        'ÏßÄ???ôÍ∏∞??Î¨¥Ïóá?∏Í???',
        'Î≥∏Ïù∏??Í∞ïÏ†êÍ≥??ΩÏ†ê?Ä Î¨¥Ïóá?∏Í???',
        'Ï£ºÏöî ?ÑÎ°ú?ùÌä∏ Í≤ΩÌóò???Ä???§Î™Ö?¥Ï£º?∏Ïöî.',
        '?¥Î†§??Í∏∞Ïà† Î¨∏Ï†úÎ•??¥Í≤∞??Í≤ΩÌóò??Í≥µÏú†?¥Ï£º?∏Ïöî.',
        '?Ä ?ÑÎ°ú?ùÌä∏?êÏÑú????ï†Í≥?Í∏∞Ïó¨?ÑÎ? ?§Î™Ö?¥Ï£º?∏Ïöî.',
        'ÏµúÍ∑º???ôÏäµ??Í∏∞Ïà†?¥ÎÇò ÏßÄ?ùÏóê ?Ä??ÎßêÏ??¥Ï£º?∏Ïöî.',
        'ÏßÅÏû•?êÏÑú???¥Î†§???ÅÌô©???¥ÎñªÍ≤??¥Í≤∞?àÎäîÏßÄ ?àÏãúÎ•??§Ïñ¥Ï£ºÏÑ∏??',
        '?ûÏúºÎ°úÏùò Ïª§Î¶¨??Í≥ÑÌöç???Ä???¥ÏïºÍ∏∞Ìï¥Ï£ºÏÑ∏??',
        '?åÏÇ¨??Í∏∞Ïó¨?????àÎäî Î∂ÄÎ∂ÑÏ? Î¨¥Ïóá?∏Í???'
      ];
      
      const randomResult = dummyResults[Math.floor(Math.random() * dummyResults.length)];
      addSTTResult(randomResult);
      
    } catch (error) {
      console.error('?§Îîî??Ï≤òÎ¶¨ ?§Ìå®:', error);
      addSTTResult('?§Îîî??Ï≤òÎ¶¨ Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.');
    }
  };

  // STT Í≤∞Í≥º Ï∂îÍ?
  const addSTTResult = (text) => {
    const newResult = {
      id: Date.now(),
      text,
      timestamp: new Date().toLocaleTimeString(),
      confidence: Math.random() * 0.3 + 0.7 // 0.7 ~ 1.0
    };
    
    setSttResults(prev => [newResult, ...prev.slice(0, 19)]); // ÏµúÎ? 20Í∞??†Ï?
  };

  // STT Í≤∞Í≥º ??†ú
  const removeSTTResult = (id) => {
    setSttResults(prev => prev.filter(result => result.id !== id));
  };

  // STT Í≤∞Í≥º Ï¥àÍ∏∞??
  const clearSTTResults = () => {
    setSttResults([]);
  };

  // Ïª¥Ìè¨?åÌä∏ ?∏Îßà?¥Ìä∏ ???ïÎ¶¨
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
        ?§ÏãúÍ∞?STT ?åÏä§??
      </Typography>
      
      {/* STT Ïª®Ìä∏Î°?*/}
      <Paper className="p-6 mb-6">
        <Typography variant="h6" component="h2" className="mb-4">
          STT Ïª®Ìä∏Î°?
        </Typography>
        
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant={isRecording ? "contained" : "outlined"}
            color={isRecording ? "error" : "primary"}
            size="large"
            startIcon={isRecording ? <MicOffIcon /> : <MicIcon />}
            onClick={isRecording ? stopSTT : startSTT}
          >
            {isRecording ? "STT Ï§ëÏ?" : "STT ?úÏûë"}
          </Button>
          
          {sttResults.length > 0 && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={clearSTTResults}
            >
              Í≤∞Í≥º Ï¥àÍ∏∞??
            </Button>
          )}
        </div>
        
        {/* ?åÏÑ± ?àÎ≤® ?úÏãú */}
        {isRecording && (
          <Box className="mb-4">
            <Typography variant="body2" className="mb-2">
              ?åÏÑ± ?àÎ≤®: {audioLevel.toFixed(0)}
            </Typography>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${Math.min((audioLevel / 255) * 100, 100)}%` }}
              ></div>
            </div>
          </Box>
        )}
        
        {/* ?ÅÌÉú ?úÏãú */}
        <Box className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <Typography variant="body2">
              {isRecording ? '?åÏÑ± ?∏Ïãù Ï§?..' : 'STT Ï§ÄÎπÑÎê®'}
            </Typography>
          </div>
        </Box>
      </Paper>
      
      {/* STT Í≤∞Í≥º */}
      <Paper className="p-6">
        <Typography variant="h6" component="h2" className="mb-4">
          STT Í≤∞Í≥º ({sttResults.length}Í∞?
        </Typography>
        
        {sttResults.length === 0 ? (
          <Box className="text-center py-8">
            <MicIcon className="text-gray-400 text-4xl mb-2" />
            <Typography variant="body2" color="text.secondary">
              STTÎ•??úÏûë?òÍ≥† ÎßàÏù¥?¨Ïóê ÎßêÏ??¥Î≥¥?∏Ïöî.
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

