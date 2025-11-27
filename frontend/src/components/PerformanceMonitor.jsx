import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  useColorModeValue,
  Icon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid
} from '@chakra-ui/react';
import { FiActivity, FiTrendingUp, FiTrendingDown, FiClock, FiDatabase, FiCpu, FiMemory } from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';

const PerformanceMonitor = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 성능 정보 조회
      const response = await axiosInstance.get('/performance');
      setPerformanceData(response.data);
      
    } catch (err) {
      console.error('성능 데이터 조회 실패:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCacheStatus = async () => {
    try {
      const response = await axiosInstance.get('/background-reports/cache-status');
      return response.data;
    } catch (err) {
      console.error('캐시 상태 조회 실패:', err);
      return null;
    }
  };

  const startAutoRefresh = () => {
    if (refreshInterval) return;
    
    const interval = setInterval(() => {
      fetchPerformanceData();
    }, 10000); // 10초마다 갱신
    
    setRefreshInterval(interval);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  const clearAllCache = async () => {
    try {
      await axiosInstance.delete('/background-reports/cache/interview/all');
      toast({
        title: '캐시 삭제 완료',
        description: '모든 캐시가 삭제되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchPerformanceData();
    } catch (err) {
      toast({
        title: '캐시 삭제 실패',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    fetchPerformanceData();
    startAutoRefresh();

    return () => {
      stopAutoRefresh();
    };
  }, []);

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>오류 발생</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
      <VStack spacing={6} align="stretch">
        {/* 헤더 */}
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Icon as={FiActivity} color="blue.500" />
            <Text fontSize="lg" fontWeight="bold">성능 모니터링</Text>
            <Badge colorScheme={refreshInterval ? 'green' : 'gray'}>
              {refreshInterval ? '실시간' : '수동'}
            </Badge>
          </HStack>
          
          <HStack spacing={2}>
            <Button
              size="sm"
              onClick={fetchPerformanceData}
              isLoading={isLoading}
              variant="outline"
            >
              새로고침
            </Button>
            
            <Button
              size="sm"
              onClick={refreshInterval ? stopAutoRefresh : startAutoRefresh}
              variant="outline"
              colorScheme={refreshInterval ? 'red' : 'green'}
            >
              {refreshInterval ? '자동 갱신 중지' : '자동 갱신 시작'}
            </Button>
          </HStack>
        </HStack>

        {performanceData && (
          <>
            {/* 시스템 성능 */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={3}>시스템 성능</Text>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Stat>
                  <StatLabel>CPU 사용률</StatLabel>
                  <StatNumber>{performanceData.cpu_usage || 0}%</StatNumber>
                  <StatHelpText>
                    <StatArrow type={performanceData.cpu_usage > 80 ? 'decrease' : 'increase'} />
                    {performanceData.cpu_usage > 80 ? '높음' : '정상'}
                  </StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel>메모리 사용률</StatLabel>
                  <StatNumber>{performanceData.memory_usage || 0}%</StatNumber>
                  <StatHelpText>
                    <StatArrow type={performanceData.memory_usage > 80 ? 'decrease' : 'increase'} />
                    {performanceData.memory_usage > 80 ? '높음' : '정상'}
                  </StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel>디스크 사용률</StatLabel>
                  <StatNumber>{performanceData.disk_usage || 0}%</StatNumber>
                  <StatHelpText>
                    <StatArrow type={performanceData.disk_usage > 90 ? 'decrease' : 'increase'} />
                    {performanceData.disk_usage > 90 ? '높음' : '정상'}
                  </StatHelpText>
                </Stat>
              </SimpleGrid>
            </Box>

            {/* 데이터베이스 성능 */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={3}>데이터베이스 성능</Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Stat>
                  <StatLabel>활성 연결</StatLabel>
                  <StatNumber>{performanceData.db_active_connections || 0}</StatNumber>
                  <StatHelpText>최대: {performanceData.db_max_connections || 0}</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel>평균 응답 시간</StatLabel>
                  <StatNumber>{(performanceData.db_avg_response_time || 0).toFixed(2)}ms</StatNumber>
                  <StatHelpText>
                    <StatArrow type={performanceData.db_avg_response_time > 100 ? 'decrease' : 'increase'} />
                    {performanceData.db_avg_response_time > 100 ? '느림' : '정상'}
                  </StatHelpText>
                </Stat>
              </SimpleGrid>
            </Box>

            {/* 캐시 성능 */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={3}>캐시 성능</Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Stat>
                  <StatLabel>Redis 히트율</StatLabel>
                  <StatNumber>{(performanceData.redis_hit_rate || 0).toFixed(1)}%</StatNumber>
                  <StatHelpText>
                    <StatArrow type={performanceData.redis_hit_rate > 80 ? 'increase' : 'decrease'} />
                    {performanceData.redis_hit_rate > 80 ? '좋음' : '개선 필요'}
                  </StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel>캐시 키 수</StatLabel>
                  <StatNumber>{performanceData.redis_keys || 0}</StatNumber>
                  <StatHelpText>총 캐시된 항목</StatHelpText>
                </Stat>
              </SimpleGrid>
            </Box>

            {/* 성능 권장사항 */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={3}>성능 권장사항</Text>
              <VStack spacing={2} align="stretch">
                {performanceData.cpu_usage > 80 && (
                  <Alert status="warning">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>CPU 사용률 높음</AlertTitle>
                      <AlertDescription>
                        CPU 사용률이 {performanceData.cpu_usage}%로 높습니다. 백그라운드 작업을 조절하거나 서버 리소스를 늘려주세요.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
                
                {performanceData.memory_usage > 80 && (
                  <Alert status="warning">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>메모리 사용률 높음</AlertTitle>
                      <AlertDescription>
                        메모리 사용률이 {performanceData.memory_usage}%로 높습니다. 캐시를 정리하거나 메모리를 늘려주세요.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
                
                {performanceData.redis_hit_rate < 50 && (
                  <Alert status="info">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>캐시 히트율 낮음</AlertTitle>
                      <AlertDescription>
                        캐시 히트율이 {(performanceData.redis_hit_rate || 0).toFixed(1)}%로 낮습니다. 캐시 전략을 개선해주세요.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
                
                {performanceData.db_avg_response_time > 100 && (
                  <Alert status="warning">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>데이터베이스 응답 시간 느림</AlertTitle>
                      <AlertDescription>
                        평균 응답 시간이 {(performanceData.db_avg_response_time || 0).toFixed(2)}ms로 느립니다. 쿼리를 최적화해주세요.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </VStack>
            </Box>

            {/* 캐시 관리 */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={3}>캐시 관리</Text>
              <HStack spacing={3}>
                <Button
                  size="sm"
                  onClick={clearAllCache}
                  colorScheme="red"
                  variant="outline"
                >
                  모든 캐시 삭제
                </Button>
                <Text fontSize="sm" color="gray.600">
                  캐시를 삭제하면 성능이 일시적으로 저하될 수 있습니다.
                </Text>
              </HStack>
            </Box>
          </>
        )}

        {!performanceData && !isLoading && (
          <Alert status="info">
            <AlertIcon />
            <AlertTitle>성능 데이터 없음</AlertTitle>
            <AlertDescription>성능 데이터를 불러올 수 없습니다.</AlertDescription>
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default PerformanceMonitor; 