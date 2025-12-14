import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  Select,
  useToast,
  Container,
  Heading,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  useColorModeValue
} from '@chakra-ui/react';
import { FiUpload, FiPlay, FiFileText, FiDownload } from 'react-icons/fi';
import AudioAnalysisResult from '../../components/AudioAnalysisResult';
import axiosInstance from '../../api/axiosInstance';

const AudioAnalysisPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [driveUrls, setDriveUrls] = useState('');
  const [analysisType, setAnalysisType] = useState('enhanced');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileInput, setFileInput] = useState(null);
  
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // 파일 업로드 핸들러
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const audioFiles = files.filter(file => 
      file.type.startsWith('audio/') || 
      file.name.match(/\.(m4a|mp3|wav|mp4)$/i)
    );
    
    if (audioFiles.length === 0) {
      toast({
        title: "지원되지 않는 파일 형식",
        description: "오디오 파일만 업로드 가능합니다 (m4a, mp3, wav, mp4)",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setUploadedFiles(audioFiles);
    toast({
      title: "파일 업로드 완료",
      description: `${audioFiles.length}개의 오디오 파일이 업로드되었습니다.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // 디렉토리 선택 핸들러
  const handleDirectorySelect = (event) => {
    setSelectedDirectory(event.target.value);
  };

  // Google Drive URL 입력 핸들러
  const handleDriveUrlsChange = (event) => {
    setDriveUrls(event.target.value);
  };

  // 분석 타입 변경 핸들러
  const handleAnalysisTypeChange = (event) => {
    setAnalysisType(event.target.value);
  };

  // 분석 실행
  const runAnalysis = async () => {
    if (!selectedDirectory && !driveUrls && uploadedFiles.length === 0) {
      toast({
        title: "분석할 파일이 없습니다",
        description: "로컬 디렉토리, Google Drive URL, 또는 파일 업로드 중 하나를 선택해주세요.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let requestData = {
        analysis_type: analysisType
      };

      // 로컬 디렉토리 분석
      if (selectedDirectory) {
        requestData.audio_dir = selectedDirectory;
      }

      // Google Drive URL 분석
      if (driveUrls) {
        const urls = driveUrls.split('\n').filter(url => url.trim());
        requestData.drive_urls = urls;
      }

      // 파일 업로드 분석
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach((file, index) => {
          formData.append(`audio_files`, file);
        });
        formData.append('analysis_type', analysisType);
        
        const response = await axiosInstance.post('/api/v2/audio-analysis/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        setAnalysisData(response.data);
        toast({
          title: "분석 완료",
          description: "오디오 파일 분석이 성공적으로 완료되었습니다.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // 백엔드 스크립트 실행
      const response = await axiosInstance.post('/api/v2/audio-analysis/run', requestData);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      setAnalysisData(response.data);
      toast({
        title: "분석 완료",
        description: "오디오 파일 분석이 성공적으로 완료되었습니다.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "분석 실패",
        description: error.response?.data?.detail || error.message || "알 수 없는 오류가 발생했습니다.",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 테스트 오디오 생성
  const generateTestAudio = async () => {
    setIsLoading(true);
    
    try {
      const response = await axiosInstance.post('/api/v2/audio-analysis/generate-test');
      
      if (response.data.success) {
        toast({
          title: "테스트 오디오 생성 완료",
          description: response.data.message,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        
        // 생성된 디렉토리로 설정
        setSelectedDirectory(response.data.output_dir);
      } else {
        throw new Error(response.data.error);
      }
      
    } catch (error) {
      console.error('Test audio generation error:', error);
      toast({
        title: "테스트 오디오 생성 실패",
        description: error.response?.data?.detail || error.message || "테스트 오디오 생성 중 오류가 발생했습니다.",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 분석 결과 다운로드
  const downloadAnalysisResult = () => {
    if (!analysisData) return;
    
    const dataStr = JSON.stringify(analysisData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `audio_analysis_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "다운로드 완료",
      description: "분석 결과가 JSON 파일로 다운로드되었습니다.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* 헤더 */}
        <Box textAlign="center">
          <Heading size="lg" mb={2}>
            🎵 오디오 분석 시스템
          </Heading>
          <Text color="gray.600">
            여러 음성파일을 합쳐서 통합 분석하고 결과를 확인하세요
          </Text>
        </Box>

        {/* 분석 설정 */}
        <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
          <VStack spacing={6} align="stretch">
            <Heading size="md">분석 설정</Heading>
            
            {/* 분석 타입 선택 */}
            <FormControl>
              <FormLabel>분석 타입</FormLabel>
              <Select value={analysisType} onChange={handleAnalysisTypeChange}>
                <option value="enhanced">향상된 분석 (기본)</option>
                <option value="optimized">성능 최적화 분석</option>
                <option value="simple">간단 분석</option>
              </Select>
            </FormControl>

            <Divider />

            {/* 파일 업로드 */}
            <FormControl>
              <FormLabel>파일 업로드</FormLabel>
              <Input
                type="file"
                multiple
                accept="audio/*,.m4a,.mp3,.wav,.mp4"
                onChange={handleFileUpload}
                ref={setFileInput}
              />
              <Text fontSize="sm" color="gray.500" mt={2}>
                여러 오디오 파일을 선택할 수 있습니다 (m4a, mp3, wav, mp4)
              </Text>
              {uploadedFiles.length > 0 && (
                <Box mt={2}>
                  <Text fontSize="sm" fontWeight="medium">업로드된 파일:</Text>
                  {uploadedFiles.map((file, index) => (
                    <Text key={index} fontSize="sm" color="gray.600">
                      • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </Text>
                  ))}
                </Box>
              )}
            </FormControl>

            <Divider />

            {/* 로컬 디렉토리 */}
            <FormControl>
              <FormLabel>로컬 디렉토리</FormLabel>
              <Input
                placeholder="예: ./test_audio_files 또는 /path/to/audio/files"
                value={selectedDirectory}
                onChange={handleDirectorySelect}
              />
              <Text fontSize="sm" color="gray.500" mt={2}>
                서버에 있는 오디오 파일 디렉토리 경로를 입력하세요
              </Text>
            </FormControl>

            <Divider />

            {/* Google Drive URL */}
            <FormControl>
              <FormLabel>Google Drive URL</FormLabel>
              <Input
                as="textarea"
                placeholder="Google Drive URL을 한 줄에 하나씩 입력하세요"
                value={driveUrls}
                onChange={handleDriveUrlsChange}
                rows={3}
              />
              <Text fontSize="sm" color="gray.500" mt={2}>
                Google Drive에서 공유된 오디오 파일 URL을 입력하세요
              </Text>
            </FormControl>

            {/* 액션 버튼들 */}
            <HStack spacing={4} justify="center">
              <Button
                leftIcon={<FiPlay />}
                colorScheme="blue"
                onClick={runAnalysis}
                isLoading={isLoading}
                loadingText="분석 중..."
                size="lg"
              >
                분석 실행
              </Button>
              
              <Button
                leftIcon={<FiUpload />}
                variant="outline"
                onClick={generateTestAudio}
                isLoading={isLoading}
                loadingText="생성 중..."
              >
                테스트 오디오 생성
              </Button>
            </HStack>
          </VStack>
        </Box>

        {/* 분석 결과 */}
        {analysisData && (
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">분석 결과</Heading>
              <Button
                leftIcon={<FiDownload />}
                variant="outline"
                onClick={downloadAnalysisResult}
                size="sm"
              >
                결과 다운로드
              </Button>
            </HStack>
            
            <AudioAnalysisResult 
              analysisData={analysisData} 
              isLoading={isLoading} 
            />
          </Box>
        )}

        {/* 로딩 상태 */}
        {isLoading && !analysisData && (
          <Box p={8} textAlign="center">
            <Spinner size="xl" color="blue.500" mb={4} />
            <Text>오디오 파일을 분석하고 있습니다...</Text>
            <Text fontSize="sm" color="gray.500" mt={2}>
              파일 크기와 개수에 따라 시간이 걸릴 수 있습니다
            </Text>
          </Box>
        )}

        {/* 사용법 안내 */}
        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>사용법 안내</AlertTitle>
            <AlertDescription>
              <VStack align="start" spacing={2}>
                <Text>1. <strong>파일 업로드</strong>: 브라우저에서 직접 오디오 파일을 선택하여 업로드</Text>
                <Text>2. <strong>로컬 디렉토리</strong>: 서버에 있는 오디오 파일 디렉토리 경로 입력</Text>
                <Text>3. <strong>Google Drive</strong>: 공유된 오디오 파일 URL 입력 (여러 개 가능)</Text>
                <Text>4. <strong>테스트 오디오 생성</strong>: 샘플 오디오 파일을 자동으로 생성</Text>
                <Text>5. <strong>분석 실행</strong>: 선택한 방법으로 오디오 파일 분석 시작</Text>
              </VStack>
            </AlertDescription>
          </Box>
        </Alert>

        {/* 지원 형식 */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            📋 지원하는 파일 형식:
          </Text>
          <Text fontSize="sm" color="gray.600">
            • 오디오: M4A, MP3, WAV, MP4
            • 최대 파일 크기: 100MB
            • 권장 샘플레이트: 16kHz 이상
            • 권장 채널: 모노 또는 스테레오
          </Text>
        </Box>
      </VStack>
    </Container>
  );
};

export default AudioAnalysisPage; 