import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  FormHelperText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardBody,
  CardHeader,
  Heading,
  useToast,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';

const JsonDataUploader = ({ onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [applicantId, setApplicantId] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [fileType, setFileType] = useState('stt_analysis');
  const [uploadMethod, setUploadMethod] = useState('text'); // 'text' or 'file'
  const [selectedFile, setSelectedFile] = useState(null);
  const toast = useToast();

  const validateJson = (jsonString) => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleTextUpload = async () => {
    if (!applicantId.trim()) {
      setError('지원자 ID를 입력해주세요.');
      return;
    }

    if (!jsonData.trim()) {
      setError('JSON 데이터를 입력해주세요.');
      return;
    }

    if (!validateJson(jsonData)) {
      setError('올바른 JSON 형식이 아닙니다.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const data = JSON.parse(jsonData);
      
      const response = await axiosInstance.post('/api/v2/audio-analysis/save-user-analysis', {
        applicant_id: applicantId,
        analysis_data: data,
        file_type: fileType
      });

      setSuccess(true);
      toast({
        title: '업로드 성공',
        description: response.data.message,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      if (onUploadSuccess) {
        onUploadSuccess(response.data.file_info);
      }

      // 폼 초기화
      setJsonData('');
      setApplicantId('');

    } catch (err) {
      console.error('JSON 업로드 실패:', err);
      setError(err.response?.data?.detail || '업로드에 실패했습니다.');
      
      toast({
        title: '업로드 실패',
        description: err.response?.data?.detail || '업로드에 실패했습니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!applicantId.trim()) {
      setError('지원자 ID를 입력해주세요.');
      return;
    }

    if (!selectedFile) {
      setError('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('applicant_id', applicantId);
      formData.append('file_type', fileType);

      const response = await axiosInstance.post('/api/v2/audio-analysis/upload-json-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(true);
      toast({
        title: '업로드 성공',
        description: response.data.message,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      if (onUploadSuccess) {
        onUploadSuccess(response.data.file_info);
      }

      // 폼 초기화
      setSelectedFile(null);
      setApplicantId('');

    } catch (err) {
      console.error('파일 업로드 실패:', err);
      setError(err.response?.data?.detail || '업로드에 실패했습니다.');
      
      toast({
        title: '업로드 실패',
        description: err.response?.data?.detail || '업로드에 실패했습니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('JSON 파일만 업로드 가능합니다.');
      setSelectedFile(null);
    }
  };

  const resetForm = () => {
    setApplicantId('');
    setJsonData('');
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
  };

  return (
    <Card>
      <CardHeader>
        <HStack>
          <FiUpload />
          <Heading size="md">JSON 분석 데이터 업로드</Heading>
        </HStack>
      </CardHeader>
      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* 업로드 방법 선택 */}
          <HStack spacing={4}>
            <Button
              variant={uploadMethod === 'text' ? 'solid' : 'outline'}
              colorScheme="blue"
              onClick={() => setUploadMethod('text')}
            >
              텍스트 입력
            </Button>
            <Button
              variant={uploadMethod === 'file' ? 'solid' : 'outline'}
              colorScheme="blue"
              onClick={() => setUploadMethod('file')}
            >
              파일 업로드
            </Button>
          </HStack>

          {/* 지원자 ID 입력 */}
          <FormControl isRequired>
            <FormLabel>지원자 ID</FormLabel>
            <Input
              value={applicantId}
              onChange={(e) => setApplicantId(e.target.value)}
              placeholder="예: 68"
            />
            <FormHelperText>분석 결과를 저장할 지원자의 ID를 입력하세요.</FormHelperText>
          </FormControl>

          {/* 파일 타입 선택 */}
          <FormControl>
            <FormLabel>파일 타입</FormLabel>
            <Input
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              placeholder="stt_analysis"
            />
            <FormHelperText>저장할 파일의 타입을 지정하세요 (예: stt_analysis, user_analysis)</FormHelperText>
          </FormControl>

          {/* 텍스트 입력 방식 */}
          {uploadMethod === 'text' && (
            <FormControl isRequired>
              <FormLabel>JSON 데이터</FormLabel>
              <Textarea
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                placeholder="JSON 데이터를 여기에 붙여넣으세요..."
                rows={10}
                fontFamily="mono"
                fontSize="sm"
              />
              <FormHelperText>
                분석 결과 JSON 데이터를 입력하세요. 올바른 JSON 형식이어야 합니다.
              </FormHelperText>
            </FormControl>
          )}

          {/* 파일 업로드 방식 */}
          {uploadMethod === 'file' && (
            <FormControl isRequired>
              <FormLabel>JSON 파일</FormLabel>
              <Input
                type="file"
                accept=".json"
                onChange={handleFileChange}
              />
              <FormHelperText>JSON 파일을 선택하세요.</FormHelperText>
              {selectedFile && (
                <HStack mt={2}>
                  <FiFile />
                  <Text fontSize="sm">{selectedFile.name}</Text>
                  <Badge colorScheme="green" size="sm">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Badge>
                </HStack>
              )}
            </FormControl>
          )}

          {/* 오류 메시지 */}
          {error && (
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>오류!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 성공 메시지 */}
          {success && (
            <Alert status="success">
              <AlertIcon />
              <AlertTitle>성공!</AlertTitle>
              <AlertDescription>데이터가 성공적으로 업로드되었습니다.</AlertDescription>
            </Alert>
          )}

          {/* 액션 버튼 */}
          <HStack spacing={4}>
            <Button
              onClick={uploadMethod === 'text' ? handleTextUpload : handleFileUpload}
              leftIcon={loading ? <Spinner size="sm" /> : <FiUpload />}
              colorScheme="blue"
              isLoading={loading}
              loadingText="업로드 중..."
            >
              업로드
            </Button>
            <Button
              onClick={resetForm}
              variant="outline"
              leftIcon={<FiXCircle />}
            >
              초기화
            </Button>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default JsonDataUploader; 