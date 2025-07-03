import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  IconButton,
  Avatar,
  Badge,
  Flex,
  Divider,
  useColorModeValue,
  SlideFade,
  ScaleFade,
  Icon
} from '@chakra-ui/react';
import {
  ChatIcon,
  CloseIcon,
  ArrowForwardIcon
} from '@chakra-ui/icons';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "안녕하세요! 코크루트 챗봇입니다. 무엇을 도와드릴까요?",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 400, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);

  const quickReplies = [
    "채용공고 등록 방법",
    "지원자 관리",
    "면접 일정 관리",
    "주요 기능 안내"
  ];

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const userMessageBg = useColorModeValue('blue.500', 'blue.400');
  const botMessageBg = useColorModeValue('gray.100', 'gray.700');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 크기 조절 이벤트 리스너
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeStart, resizeDirection]);

  const handleQuickReply = (reply) => {
    setInputMessage(reply);
    handleSendMessage(reply);
  };

  const handleSendMessage = (customMessage = null) => {
    const messageToSend = customMessage || inputMessage;
    if (messageToSend.trim() === '') return;

    const userMessage = {
      id: messages.length + 1,
      text: messageToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // 봇 응답 시뮬레이션
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: getBotResponse(messageToSend),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getBotResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('안녕') || lowerMessage.includes('hello')) {
      return '안녕하세요! 코크루트에서 도움이 필요하시면 언제든 말씀해 주세요.';
    } else if (lowerMessage.includes('채용') || lowerMessage.includes('구인') || lowerMessage.includes('등록')) {
      return '채용공고 등록 방법:\n1. 상단 메뉴에서 "채용공고 등록" 클릭\n2. 필요한 정보 입력 (제목, 내용, 자격요건 등)\n3. 저장 후 공고 게시\n\n자세한 내용은 "채용공고 등록" 페이지에서 확인하실 수 있습니다.';
    } else if (lowerMessage.includes('지원') || lowerMessage.includes('이력서')) {
      return '지원자 관리 방법:\n1. "지원자 목록" 메뉴에서 지원자 확인\n2. 이력서 다운로드 및 검토\n3. 합격/불합격 처리\n4. 면접 일정 조율\n\n지원자별 상세 정보와 이력서를 확인할 수 있습니다.';
    } else if (lowerMessage.includes('일정') || lowerMessage.includes('면접')) {
      return '면접 일정 관리:\n1. "일정 관리" 메뉴에서 면접 일정 확인\n2. 새로운 면접 일정 등록\n3. 면접관 배정\n4. 지원자에게 알림 발송\n\n캘린더 형태로 직관적인 일정 관리가 가능합니다.';
    } else if (lowerMessage.includes('도움') || lowerMessage.includes('help')) {
      return '코크루트는 채용 관리 플랫폼입니다. 채용공고 등록, 지원자 관리, 면접 일정 관리 등의 기능을 제공합니다.';
    } else if (lowerMessage.includes('기능') || lowerMessage.includes('메뉴')) {
      return '주요 기능:\n1) 채용공고 등록/관리\n2) 지원자 목록 확인\n3) 면접 일정 관리\n4) 이메일 발송\n5) 통계 확인\n\n각 메뉴에서 해당 기능을 이용하실 수 있습니다.';
    } else {
      return '죄송합니다. 더 구체적으로 말씀해 주시면 더 정확한 답변을 드릴 수 있습니다.\n\n빠른 응답 버튼을 이용해 보세요!';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 크기 조절 시작
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: chatSize.width,
      height: chatSize.height
    });
  };

  // 크기 조절 중
  const handleResizeMove = (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;

    // 방향에 따라 크기 조절
    if (resizeDirection.includes('right')) {
      newWidth = Math.max(300, Math.min(800, resizeStart.width + deltaX));
    }
    if (resizeDirection.includes('left')) {
      newWidth = Math.max(300, Math.min(800, resizeStart.width - deltaX));
    }
    if (resizeDirection.includes('bottom')) {
      newHeight = Math.max(400, Math.min(800, resizeStart.height + deltaY));
    }
    if (resizeDirection.includes('top')) {
      newHeight = Math.max(400, Math.min(800, resizeStart.height - deltaY));
    }

    setChatSize({ width: newWidth, height: newHeight });
  };

  // 크기 조절 종료
  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeDirection('');
  };

  return (
    <Box position="fixed" bottom={4} right={4} zIndex={1000}>
      {/* 챗봇 토글 버튼 - 채팅창이 열려있을 때는 숨김 */}
      <ScaleFade in={!isOpen}>
        <Button
          onClick={() => setIsOpen(true)}
          colorScheme="blue"
          size="lg"
          borderRadius="full"
          boxShadow="lg"
          _hover={{ transform: 'scale(1.1)' }}
          transition="all 0.3s"
        >
          <ChatIcon />
        </Button>
      </ScaleFade>

      {/* 챗봇 채팅창 */}
      <SlideFade in={isOpen} offsetY="20px">
        {isOpen && (
          <Box
            ref={chatRef}
            position="absolute"
            bottom={4}
            right={0}
            w={`${chatSize.width}px`}
            h={`${chatSize.height}px`}
            bg={bgColor}
            borderRadius="lg"
            boxShadow="xl"
            border="1px"
            borderColor={borderColor}
            display="flex"
            flexDirection="column"
            userSelect="none"
          >
            {/* 헤더 */}
            <Box
              bgGradient="linear(to-r, blue.500, blue.600)"
              color="white"
              p={4}
              borderTopRadius="lg"
            >
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={2}>
                  <Avatar size="sm" bg="white" color="blue.500" icon={<ChatIcon />} />
                  <Box>
                    <Text fontWeight="semibold">코크루트 챗봇</Text>
                    <Text fontSize="sm" opacity={0.8}>실시간 도움말 (모서리 드래그로 크기 조절)</Text>
                  </Box>
                </Flex>
                <IconButton
                  icon={<CloseIcon />}
                  onClick={() => setIsOpen(false)}
                  size="sm"
                  variant="ghost"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200' }}
                />
              </Flex>
            </Box>

            {/* 메시지 영역 */}
            <VStack
              flex={1}
              overflowY="auto"
              p={4}
              spacing={3}
              bg={useColorModeValue('gray.50', 'gray.900')}
            >
              {messages.map((message) => (
                <Box
                  key={message.id}
                  alignSelf={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                  maxW="80%"
                >
                  <Box
                    bg={message.sender === 'user' ? userMessageBg : botMessageBg}
                    color={message.sender === 'user' ? 'white' : 'inherit'}
                    p={3}
                    borderRadius="lg"
                    boxShadow="sm"
                  >
                    <Text fontSize="sm" whiteSpace="pre-line">
                      {message.text}
                    </Text>
                    <Text fontSize="xs" opacity={0.7} mt={1}>
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                  </Box>
                </Box>
              ))}

              {/* 타이핑 인디케이터 */}
              {isTyping && (
                <Box alignSelf="flex-start" maxW="80%">
                  <Box bg={botMessageBg} p={3} borderRadius="lg" boxShadow="sm">
                    <HStack spacing={1}>
                      <Box
                        w={2}
                        h={2}
                        bg="gray.400"
                        borderRadius="full"
                        animation="bounce 1.4s infinite ease-in-out"
                        animationDelay="0s"
                      />
                      <Box
                        w={2}
                        h={2}
                        bg="gray.400"
                        borderRadius="full"
                        animation="bounce 1.4s infinite ease-in-out"
                        animationDelay="0.16s"
                      />
                      <Box
                        w={2}
                        h={2}
                        bg="gray.400"
                        borderRadius="full"
                        animation="bounce 1.4s infinite ease-in-out"
                        animationDelay="0.32s"
                      />
                    </HStack>
                  </Box>
                </Box>
              )}

              {/* 빠른 응답 버튼들 */}
              {messages.length === 1 && !isTyping && (
                <HStack spacing={2} flexWrap="wrap" justify="flex-start" w="100%">
                  {quickReplies.map((reply, index) => (
                    <Badge
                      key={index}
                      colorScheme="blue"
                      variant="outline"
                      cursor="pointer"
                      _hover={{ bg: 'blue.50' }}
                      onClick={() => handleQuickReply(reply)}
                      p={2}
                      borderRadius="full"
                    >
                      {reply}
                    </Badge>
                  ))}
                </HStack>
              )}

              <div ref={messagesEndRef} />
            </VStack>

            <Divider />

            {/* 입력 영역 */}
            <Box p={4} bg={bgColor}>
              <HStack spacing={2}>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="메시지를 입력하세요..."
                  disabled={isTyping}
                  size="sm"
                />
                <IconButton
                  colorScheme="blue"
                  onClick={() => handleSendMessage()}
                  disabled={inputMessage.trim() === '' || isTyping}
                  icon={<ArrowForwardIcon />}
                  size="sm"
                  _hover={{ transform: 'scale(1.1)' }}
                  transition="all 0.2s"
                />
              </HStack>
            </Box>

            {/* 크기 조절 핸들들 */}
            {/* 우하단 핸들 */}
            <Box
              position="absolute"
              bottom={0}
              right={0}
              w="12px"
              h="12px"
              cursor="nw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
              bg="transparent"
              _hover={{ bg: 'blue.500' }}
              borderRadius="0 0 8px 0"
              zIndex={10}
            />
            
            {/* 좌하단 핸들 */}
            <Box
              position="absolute"
              bottom={0}
              left={0}
              w="12px"
              h="12px"
              cursor="ne-resize"
              onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
              bg="transparent"
              _hover={{ bg: 'blue.500' }}
              borderRadius="0 0 0 8px"
              zIndex={10}
            />
            
            {/* 우상단 핸들 */}
            <Box
              position="absolute"
              top={0}
              right={0}
              w="12px"
              h="12px"
              cursor="sw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'top-right')}
              bg="transparent"
              _hover={{ bg: 'blue.500' }}
              borderRadius="0 8px 0 0"
              zIndex={10}
            />
            
            {/* 좌상단 핸들 */}
            <Box
              position="absolute"
              top={0}
              left={0}
              w="12px"
              h="12px"
              cursor="se-resize"
              onMouseDown={(e) => handleResizeStart(e, 'top-left')}
              bg="transparent"
              _hover={{ bg: 'blue.500' }}
              borderRadius="8px 0 0 0"
              zIndex={10}
            />
          </Box>
        )}
      </SlideFade>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </Box>
  );
};

export default Chatbot; 