import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  useColorModeValue,
  Icon,
  Spinner
} from '@chakra-ui/react';
import { FiPlay, FiPause, FiRefreshCw, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';

const BackgroundTaskMonitor = ({ taskId, onComplete, onError, autoRefresh = true }) => {
  const [taskStatus, setTaskStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // 상태별 색상 및 아이콘
  const getStatusConfig = (status) => {
    switch (status) {
      case 'started':
        return { color: 'blue', icon: FiPlay, text: '시작됨' };
      case 'collecting_data':
        return { color: 'blue', icon: FiClock, text: '데이터 수집 중' };
      case 'processing_evaluations':
        return { color: 'blue', icon: FiClock, text: '평가 처리 중' };
      case 'calculating_statistics':
        return { color: 'blue', icon: FiClock, text: '통계 계산 중' };
      case 'generating_report':
        return { color: 'blue', icon: FiClock, text: '보고서 생성 중' };
      case 'saving_cache':
        return { color: 'blue', icon: FiClock, text: '캐시 저장 중' };
      case 'completed':
        return { color: 'green', icon: FiCheckCircle, text: '완료' };
      case 'failed':
        return { color: 'red', icon: FiXCircle, text: '실패' };
      default:
        return { color: 'gray', icon: FiClock, text: '알 수 없음' };
    }
  };

  const fetchTaskStatus = async () => {
    if (!taskId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`/background-reports/task-status/${taskId}`);
      const status = response.data;
      
      setTaskStatus(status);
      
      // 완료 또는 실패 시 콜백 호출
      if (status.status === 'completed') {
        if (onComplete) onComplete(status.result);
        toast({
          title: '작업 완료',
          description: '백그라운드 작업이 성공적으로 완료되었습니다.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        stopPolling();
      } else if (status.status === 'failed') {
        if (onError) onError(status.error);
        toast({
          title: '작업 실패',
          description: status.error || '백그라운드 작업 중 오류가 발생했습니다.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        stopPolling();
      }
      
    } catch (err) {
      console.error('작업 상태 조회 실패:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    if (pollingInterval) return;
    
    const interval = setInterval(fetchTaskStatus, 2000); // 2초마다 폴링
    setPollingInterval(interval);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const handleRefresh = () => {
    fetchTaskStatus();
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskStatus();
      
      if (autoRefresh) {
        startPolling();
      }
    }

    return () => {
      stopPolling();
    };
  }, [taskId]);

  if (!taskId) {
    return (
      <Alert status="info">
        <AlertIcon />
        <AlertTitle>작업 ID가 없습니다.</AlertTitle>
        <AlertDescription>백그라운드 작업을 시작해주세요.</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>오류 발생</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!taskStatus) {
    return (
      <Box p={4} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <HStack spacing={3}>
          <Spinner size="sm" />
          <Text>작업 상태를 불러오는 중...</Text>
        </HStack>
      </Box>
    );
  }

  const statusConfig = getStatusConfig(taskStatus.status);

  return (
    <Box p={4} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
      <VStack spacing={4} align="stretch">
        {/* 헤더 */}
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Icon as={statusConfig.icon} color={`${statusConfig.color}.500`} />
            <Text fontWeight="bold">백그라운드 작업</Text>
            <Badge colorScheme={statusConfig.color}>{statusConfig.text}</Badge>
          </HStack>
          
          <HStack spacing={2}>
            <Button
              size="sm"
              leftIcon={<Icon as={FiRefreshCw} />}
              onClick={handleRefresh}
              isLoading={isLoading}
              variant="outline"
            >
              새로고침
            </Button>
            
            {autoRefresh && (
              <Button
                size="sm"
                onClick={pollingInterval ? stopPolling : startPolling}
                variant="outline"
                colorScheme={pollingInterval ? 'red' : 'green'}
              >
                {pollingInterval ? '폴링 중지' : '폴링 시작'}
              </Button>
            )}
          </HStack>
        </HStack>

        {/* 진행률 */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" color="gray.600">진행률</Text>
            <Text fontSize="sm" fontWeight="bold">{taskStatus.progress}%</Text>
          </HStack>
          <Progress
            value={taskStatus.progress}
            colorScheme={statusConfig.color}
            size="sm"
            borderRadius="full"
          />
        </Box>

        {/* 작업 정보 */}
        <VStack spacing={2} align="stretch">
          <Text fontSize="sm" color="gray.600">
            작업 ID: {taskId}
          </Text>
          <Text fontSize="sm" color="gray.600">
            마지막 업데이트: {new Date(taskStatus.updated_at).toLocaleString()}
          </Text>
        </VStack>

        {/* 결과 또는 오류 */}
        {taskStatus.status === 'completed' && taskStatus.result && (
          <Alert status="success">
            <AlertIcon />
            <Box>
              <AlertTitle>작업 완료!</AlertTitle>
              <AlertDescription>
                {taskStatus.result.message || '작업이 성공적으로 완료되었습니다.'}
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {taskStatus.status === 'failed' && taskStatus.error && (
          <Alert status="error">
            <AlertIcon />
            <Box>
              <AlertTitle>작업 실패</AlertTitle>
              <AlertDescription>{taskStatus.error}</AlertDescription>
            </Box>
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default BackgroundTaskMonitor; 