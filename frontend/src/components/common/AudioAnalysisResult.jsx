import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Divider,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { FiFile, FiClock, FiVolume2, FiMessageSquare, FiTrendingUp } from 'react-icons/fi';

const AudioAnalysisResult = ({ analysisData }) => {
  const [expandedItems, setExpandedItems] = useState([]);

  if (!analysisData) {
    return (
      <Box p={6} textAlign="center">
        <Text color="gray.500">분석 데이터가 없습니다.</Text>
      </Box>
    );
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      '긍정적': 'green',
      '부정적': 'red',
      '중립적': 'blue',
      '기쁨': 'green',
      '슬픔': 'blue',
      '분노': 'red',
      '놀람': 'orange',
    };
    return colors[emotion] || 'gray';
  };

  const renderFileInfo = (fileInfo) => (
    <Card size="sm" variant="outline">
      <CardBody>
        <VStack align="start" spacing={2}>
          <HStack>
            <FiFile />
            <Text fontWeight="bold">{fileInfo.filename}</Text>
          </HStack>
          <Grid templateColumns="repeat(2, 1fr)" gap={2} w="full">
            <Stat size="sm">
              <StatLabel>파일 크기</StatLabel>
              <StatNumber fontSize="sm">{formatFileSize(fileInfo.file_size)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel>길이</StatLabel>
              <StatNumber fontSize="sm">{formatDuration(fileInfo.duration_seconds)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel>샘플레이트</StatLabel>
              <StatNumber fontSize="sm">{fileInfo.sample_rate}Hz</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel>채널</StatLabel>
              <StatNumber fontSize="sm">{fileInfo.channels}</StatNumber>
            </Stat>
          </Grid>
        </VStack>
      </CardBody>
    </Card>
  );

  const renderSTTAnalysis = (sttAnalysis) => (
    <Card size="sm" variant="outline">
      <CardHeader pb={2}>
        <HStack>
          <FiMessageSquare />
          <Heading size="sm">음성 인식 결과</Heading>
        </HStack>
      </CardHeader>
      <CardBody pt={0}>
        <VStack align="start" spacing={3}>
          <Box w="full">
            <Text fontWeight="bold" mb={2}>전체 텍스트:</Text>
            <Box 
              p={3} 
              bg="gray.50" 
              borderRadius="md" 
              border="1px solid" 
              borderColor="gray.200"
              maxH="200px"
              overflowY="auto"
            >
              <Text fontSize="sm" whiteSpace="pre-wrap">{sttAnalysis.text}</Text>
            </Box>
          </Box>
          
          <Box w="full">
            <Text fontWeight="bold" mb={2}>세그먼트 분석:</Text>
            <VStack align="start" spacing={2}>
              {sttAnalysis.segments?.map((segment, idx) => (
                <Box 
                  key={idx} 
                  p={2} 
                  bg="blue.50" 
                  borderRadius="md" 
                  border="1px solid" 
                  borderColor="blue.200"
                  w="full"
                >
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color="gray.600">
                      {formatDuration(segment.start)} - {formatDuration(segment.end)}
                    </Text>
                    <Badge size="sm" colorScheme="blue">
                      신뢰도: {(segment.avg_logprob * -100).toFixed(1)}%
                    </Badge>
                  </HStack>
                  <Text fontSize="sm">{segment.text}</Text>
                </Box>
              ))}
            </VStack>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* 전체 분석 요약 */}
        <Card>
          <CardHeader>
            <HStack>
              <FiTrendingUp />
              <Heading size="md">오디오 분석 결과 요약</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
              <Stat>
                <StatLabel>분석 날짜</StatLabel>
                <StatNumber fontSize="lg">
                  {new Date(analysisData.analysis_date).toLocaleDateString('ko-KR')}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>총 파일 수</StatLabel>
                <StatNumber fontSize="lg">{analysisData.file_count}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>지원자 번호</StatLabel>
                <StatNumber fontSize="lg">
                  {analysisData.file_order[0]?.split(' ')[0] || 'N/A'}
                </StatNumber>
              </Stat>
            </Grid>
          </CardBody>
        </Card>

        {/* 개별 파일 분석 */}
        <Card>
          <CardHeader>
            <HStack>
              <FiFile />
              <Heading size="md">개별 파일 분석 결과</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <Accordion allowMultiple>
              {analysisData.individual_analyses?.map((analysis, idx) => (
                <AccordionItem key={idx}>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <HStack>
                        <Text fontWeight="bold">
                          {analysis.file_info.filename}
                        </Text>
                        <Badge colorScheme="blue">
                          {formatDuration(analysis.file_info.duration_seconds)}
                        </Badge>
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <VStack spacing={4} align="stretch">
                      {renderFileInfo(analysis.file_info)}
                      {renderSTTAnalysis(analysis.stt_analysis)}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </CardBody>
        </Card>

        {/* 파일 목록 */}
        <Card>
          <CardHeader>
            <HStack>
              <FiFile />
              <Heading size="md">분석된 파일 목록</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <List spacing={2}>
              {analysisData.file_order?.map((filename, idx) => (
                <ListItem key={idx}>
                  <HStack>
                    <ListIcon as={FiFile} color="blue.500" />
                    <Text>{filename}</Text>
                    <Badge size="sm" colorScheme="gray">
                      {idx + 1}번째
                    </Badge>
                  </HStack>
                </ListItem>
              ))}
            </List>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default AudioAnalysisResult; 