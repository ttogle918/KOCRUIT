import { useState, useRef, useCallback, useEffect } from 'react';

const useMediaRecorder = (options = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  
  const chunksRef = useRef([]);
  const requestRef = useRef(null);
  
  const { 
    onDataAvailable, // 실시간 데이터 처리를 위한 콜백
    onStop, 
    mimeType = 'audio/webm;codecs=opus',
    timeSlice = 1000 // 데이터를 쪼개서 보낼 간격 (ms)
  } = options;

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      setError(null);

      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setStream(audioStream);

      // 지원하는 MIME 타입 확인
      let validMimeType = mimeType;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`${mimeType} is not supported. Trying default.`);
        validMimeType = ''; // 브라우저 기본값 사용
      }

      const recorder = new MediaRecorder(audioStream, validMimeType ? { mimeType: validMimeType } : undefined);
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          if (onDataAvailable) {
            onDataAvailable(event.data);
          }
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (onStop) {
          onStop(blob);
        }
        
        // 스트림 정리
        audioStream.getTracks().forEach(track => track.stop());
        setStream(null);
        setMediaRecorder(null);
        setIsRecording(false);
      };

      recorder.start(timeSlice);
      setMediaRecorder(recorder);
      setIsRecording(true);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError(err);
      setIsRecording(false);
    }
  }, [mimeType, timeSlice, onDataAvailable, onStop]);

  // 녹음 중지
  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }, [mediaRecorder]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error
  };
};

export default useMediaRecorder;
