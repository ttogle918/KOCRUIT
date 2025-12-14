import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Select,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
} from '@chakra-ui/react';
import { FiFile, FiDownload, FiRefreshCw, FiTrendingUp, FiMessageSquare, FiUpload } from 'react-icons/fi';
import axiosInstance from '../../api/axiosInstance';
import AudioAnalysisResult from '../../components/AudioAnalysisResult';
import JsonDataUploader from '../../components/JsonDataUploader';

const AudioAnalysisResultPage = () => {
  const { applicantId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFileType, setSelectedFileType] = useState('detailed');
  const [showUploader, setShowUploader] = useState(false);
  const toast = useToast();

  // 지원자 ID가 없으면 기본값 사용
  const effectiveApplicantId = applicantId || '68';

  useEffect(() => {
    loadAnalysisData();
  }, [effectiveApplicantId, selectedFileType]);

  const loadAnalysisData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      switch (selectedFileType) {
        case 'detailed':
          response = await axiosInstance.get(`/api/v2/audio-analysis/analysis/${effectiveApplicantId}/detailed`);
          setAnalysisData(response.data.analysis_data);
          break;
        case 'summary':
          response = await axiosInstance.get(`/api/v2/audio-analysis/analysis/${effectiveApplicantId}/summary`);
          setAnalysisData(response.data);
          break;
        case 'stt':
          response = await axiosInstance.get(`/api/v2/audio-analysis/analysis/${effectiveApplicantId}/stt`);
          setAnalysisData(response.data.stt_data);
          break;
        default:
          response = await axiosInstance.get(`/api/v2/audio-analysis/analysis/${effectiveApplicantId}`);
          setAnalysisData(response.data);
      }
      
      // 사용 가능한 파일 목록도 로드
      await loadAvailableFiles();
      
    } catch (err) {
      console.error('분석 데이터 로드 실패:', err);
      setError(err.response?.data?.detail || '분석 데이터를 불러오는데 실패했습니다.');
      
      toast({
        title: '오류',
        description: err.response?.data?.detail || '분석 데이터를 불러오는데 실패했습니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFiles = async () => {
    try {
      const response = await axiosInstance.get('/api/v2/audio-analysis/analysis-files');
      const files = response.data.files_by_applicant[effectiveApplicantId] || [];
      setAvailableFiles(files);
    } catch (err) {
      console.warn('파일 목록 로드 실패:', err);
    }
  };

  const handleRefresh = () => {
    loadAnalysisData();
  };

  const handleFileTypeChange = (event) => {
    setSelectedFileType(event.target.value);
  };

  const downloadAnalysisData = () => {
    if (!analysisData) return;
    
    const dataStr = JSON.stringify(analysisData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis_${effectiveApplicantId}_${selectedFileType}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: '다운로드 완료',
      description: '분석 데이터가 다운로드되었습니다.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleUploadSuccess = (fileInfo) => {
    toast({
      title: '업로드 성공',
      description: `${fileInfo.filename}이 성공적으로 저장되었습니다.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    
    // 파일 목록 새로고침
    loadAvailableFiles();
    setShowUploader(false);
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>분석 데이터를 불러오는 중...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>오류 발생!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Box mt={4}>
          <Button onClick={handleRefresh} leftIcon={<FiRefreshCw />}>
            다시 시도
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={6} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* 헤더 */}
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <VStack align="start" spacing={2}>
                <HStack>
                  <FiTrendingUp />
                  <Heading size="lg">오디오 분석 결과</Heading>
                </HStack>
                <Text color="gray.600">
                  지원자 ID: {effectiveApplicantId}
                </Text>
              </VStack>
              <HStack spacing={3}>
                <Select 
                  value={selectedFileType} 
                  onChange={handleFileTypeChange}
                  width="200px"
                >
                  <option value="detailed">상세 분석</option>
                  <option value="summary">요약 분석</option>
                  <option value="stt">STT 분석</option>
                </Select>
                <Button 
                  onClick={downloadAnalysisData} 
                  leftIcon={<FiDownload />}
                  colorScheme="blue"
                >
                  다운로드
                </Button>
                <Button 
                  onClick={handleRefresh} 
                  leftIcon={<FiRefreshCw />}
                  variant="outline"
                >
                  새로고침
                </Button>
                <Button 
                  onClick={() => setShowUploader(!showUploader)} 
                  leftIcon={<FiUpload />}
                  colorScheme="green"
                  variant="outline"
                >
                  {showUploader ? '업로드 닫기' : '데이터 업로드'}
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
        </Card>

        {/* 데이터 업로드 섹션 */}
        {showUploader && (
          <JsonDataUploader onUploadSuccess={handleUploadSuccess} />
        )}

        {/* 사용 가능한 파일 목록 */}
        {availableFiles.length > 0 && (
          <Card>
            <CardHeader>
              <HStack>
                <FiFile />
                <Heading size="md">사용 가능한 분석 파일</Heading>
                <Badge colorScheme="blue">{availableFiles.length}개</Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={4}>
                {availableFiles.map((file, idx) => (
                  <GridItem key={idx}>
                    <Card size="sm" variant="outline">
                      <CardBody>
                        <VStack align="start" spacing={2}>
                          <Text fontWeight="bold">{file.filename}</Text>
                          <HStack spacing={4}>
                            <Stat size="sm">
                              <StatLabel>크기</StatLabel>
                              <StatNumber fontSize="sm">
                                {(file.size / 1024).toFixed(1)} KB
                              </StatNumber>
                            </Stat>
                            <Stat size="sm">
                              <StatLabel>수정일</StatLabel>
                              <StatNumber fontSize="sm">
                                {new Date(file.modified * 1000).toLocaleDateString()}
                              </StatNumber>
                            </Stat>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>
                ))}
              </Grid>
            </CardBody>
          </Card>
        )}

        {/* 분석 결과 표시 */}
        <Tabs variant="enclosed">
          <TabList>
            <Tab>
              <HStack>
                <FiTrendingUp />
                <Text>분석 결과</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <FiMessageSquare />
                <Text>STT 결과</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <AudioAnalysisResult analysisData={analysisData} />
            </TabPanel>
            <TabPanel>
              <Card>
                <CardHeader>
                  <Heading size="md">음성 인식 결과</Heading>
                </CardHeader>
                <CardBody>
                  <Box 
                    p={4} 
                    bg="gray.50" 
                    borderRadius="md" 
                    border="1px solid" 
                    borderColor="gray.200"
                    maxH="400px"
                    overflowY="auto"
                  >
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {JSON.stringify(analysisData, null, 2)}
                    </Text>
                  </Box>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};

export default AudioAnalysisResultPage; 