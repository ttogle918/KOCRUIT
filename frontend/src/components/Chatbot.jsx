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
  Icon,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import {
  ChatIcon,
  CloseIcon,
  ArrowForwardIcon
} from '@chakra-ui/icons';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parseFilterConditions } from '../utils/filterUtils';
import { calculateAge } from '../utils/resumeUtils';
import CommonResumeList from './CommonResumeList';
import api from '../api/api';

// === 학력 레벨 판별 함수 (applicantStats.js 로직 참고) ===
function getEducationLevel(applicant) {
  // 1. degree 필드
  if (applicant.degree) {
    const degreeStr = applicant.degree.toLowerCase();
    if (degreeStr.includes('박사')) return '박사';
    if (degreeStr.includes('석사')) return '석사';
    if (degreeStr.includes('학사')) return '학사';
    if (degreeStr.includes('고등')) return '고등학교졸업';
  }
  // 2. educations 배열
  if (applicant.educations && applicant.educations.length > 0) {
    for (let i = 0; i < applicant.educations.length; i++) {
      const edu = applicant.educations[i];
      const schoolName = (edu.schoolName || '').toLowerCase();
      const degree = (edu.degree || '').toLowerCase();
      if (schoolName.includes('대학원')) {
        if (degree.includes('박사')) return '박사';
        if (degree.includes('석사')) return '석사';
        return '석사';
      } else if (schoolName.includes('대학교') || schoolName.includes('대학')) {
        return '학사';
      } else if (schoolName.includes('고등학교') || schoolName.includes('고등') || schoolName.includes('고졸') || schoolName.includes('high')) {
        return '고등학교졸업';
      }
    }
    return '학사';
  }
  // 3. education 필드
  if (applicant.education) {
    const education = applicant.education.toLowerCase();
    if (education.includes('박사') || education.includes('phd') || education.includes('doctor')) {
      return '박사';
    } else if (education.includes('석사') || education.includes('master')) {
      return '석사';
    } else if (education.includes('학사') || education.includes('bachelor') || education.includes('대학교') || education.includes('대학') || education.includes('university') || education.includes('전문학사') || education.includes('associate') || education.includes('전문대') || education.includes('2년제') || education.includes('대학교졸업') || education.includes('졸업')) {
      return '학사';
    } else if (education.includes('고등학교') || education.includes('고등') || education.includes('고졸') || education.includes('high')) {
      return '고등학교졸업';
    }
  }
  return null;
}

// 챗봇 전용 axios 인스턴스
const chatbotApi = axios.create({
  baseURL: 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const Chatbot = () => {
  console.log('Chatbot component rendering');
  // 모든 훅을 최상단에 배치 (순서 중요!)
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  
  // useState 훅들
  const [isOpen, setIsOpen] = useState(false);
  const [filteredResults, setFilteredResults] = useState(null);
  const [allApplicants, setAllApplicants] = useState([]);
  const [currentJobPostId, setCurrentJobPostId] = useState(null);
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
  const [sessionId, setSessionId] = useState(null);
  
  // useRef 훅들
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);

  // useColorModeValue 훅들
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const userMessageBg = useColorModeValue('blue.500', 'blue.400');
  const botMessageBg = useColorModeValue('gray.100', 'gray.700');
  const messageAreaBg = useColorModeValue('gray.50', 'gray.900');

  const quickReplies = [
    "채용공고 등록 방법",
    "지원자 관리",
    "면접 일정 관리",
    "주요 기능 안내"
  ];

  // 지원자 데이터 로드
  useEffect(() => {
    const loadApplicants = async () => {
      try {
        // URL에서 jobPostId 추출
        const pathParts = location.pathname.split('/');
        const jobPostId = pathParts[pathParts.length - 1];
        
        if (jobPostId && jobPostId !== 'applicantlist') {
          setCurrentJobPostId(jobPostId);
          const response = await api.get(`/applications/job/${jobPostId}/applicants`);
          setAllApplicants(response.data);
        }
      } catch (error) {
        console.error('지원자 데이터 로드 실패:', error);
      }
    };

    if (location.pathname.includes('applicantlist')) {
      loadApplicants();
    }
  }, [location.pathname]);

  // 자연어 필터링 처리
  const processNaturalLanguageFilter = (message) => {
    const conditions = parseFilterConditions(message);
    let filtered = [...allApplicants];
    
    // 연령 필터링
    if (conditions.ageRange) {
      filtered = filtered.filter(applicant => {
        const age = calculateAge(applicant.birthDate || applicant.birthdate || applicant.birthday);
        return age >= conditions.ageRange[0] && age <= conditions.ageRange[1];
      });
    }
    
    // 성별 필터링
    if (conditions.gender) {
      filtered = filtered.filter(applicant => applicant.gender === conditions.gender);
    }
    
    // 지역 필터링
    if (conditions.location) {
      filtered = filtered.filter(applicant => {
        const address = applicant.address || '';
        return address.includes(conditions.location);
      });
    }
    
    // 학력 필터링
    if (conditions.education) {
      filtered = filtered.filter(applicant => {
        const level = getEducationLevel(applicant);
        return level === conditions.education;
      });
    }
    
    // 기술스택 필터링
    if (conditions.skills.length > 0) {
      filtered = filtered.filter(applicant => {
        const skills = applicant.skills || [];
        const skillText = Array.isArray(skills) ? skills.join(' ').toLowerCase() : skills.toLowerCase();
        return conditions.skills.some(skill => skillText.includes(skill));
      });
    }
    
    return filtered;
  };

  // 필터링 결과 요약 생성
  const generateFilterSummary = (filteredApplicants, originalMessage) => {
    if (filteredApplicants.length === 0) {
      return {
        summary: `조건에 맞는 지원자가 없습니다.`,
        applicants: []
      };
    }
    
    const conditions = parseFilterConditions(originalMessage);
    let summary = '';
    
    // 조건별 요약 생성
    const conditionsList = [];
    if (conditions.ageRange) {
      conditionsList.push(`${conditions.ageRange[0]}~${conditions.ageRange[1]}세`);
    }
    if (conditions.gender) {
      const genderText = conditions.gender === 'M' ? '남성' : '여성';
      conditionsList.push(genderText);
    }
    if (conditions.location) {
      conditionsList.push(`${conditions.location} 거주`);
    }
    if (conditions.education) {
      conditionsList.push(`${conditions.education} 학력`);
    }
    if (conditions.skills.length > 0) {
      conditionsList.push(`${conditions.skills.join(', ')} 기술`);
    }
    
    const conditionText = conditionsList.join(' ');
    summary = `${conditionText} 지원자 ${filteredApplicants.length}명이 있습니다.`;
    
    // 상위 3명의 간단한 정보
    const topApplicants = filteredApplicants.slice(0, 3).map(applicant => ({
      name: applicant.name,
      skills: applicant.skills ? (Array.isArray(applicant.skills) ? applicant.skills.slice(0, 2) : [applicant.skills]) : []
    }));
    
    return {
      summary,
      applicants: topApplicants,
      totalCount: filteredApplicants.length
    };
  };

  // 페이지 컨텍스트 수집
  const getPageContext = () => {
    const context = {
      pathname: location.pathname,
      search: location.search,
      pageTitle: document.title,
      timestamp: new Date().toISOString()
    };

    // 주요 DOM 요소들 수집
    try {
      // 페이지의 모든 텍스트 내용 수집
      const pageTextContent = document.body.innerText || document.body.textContent || '';
      context.pageTextContent = pageTextContent.substring(0, 2000); // 최대 2000자로 제한

      // 폼 요소들 수집
      const forms = Array.from(document.querySelectorAll('form')).map(form => ({
        id: form.id || null,
        className: form.className || null,
        action: form.action || null,
        method: form.method || null
      }));

      // 입력 필드들 수집 (더 상세한 정보)
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(input => {
        const inputInfo = {
          id: input.id || null,
          name: input.name || null,
          type: input.type || input.tagName.toLowerCase(),
          placeholder: input.placeholder || null,
          value: input.value || null,
          className: input.className || null,
          required: input.required || false,
          disabled: input.disabled || false
        };

        // 라벨 요소 찾기
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
          inputInfo.label = label.textContent?.trim() || null;
        }

        // 부모 요소에서 라벨 찾기
        if (!inputInfo.label) {
          const parent = input.parentElement;
          if (parent) {
            const parentLabel = parent.querySelector('label');
            if (parentLabel) {
              inputInfo.label = parentLabel.textContent?.trim() || null;
            }
          }
        }

        return inputInfo;
      });

      // 버튼들 수집
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(button => ({
        id: button.id || null,
        text: button.textContent?.trim() || button.value || null,
        className: button.className || null,
        type: button.type || 'button',
        disabled: button.disabled || false
      }));

      // 제목 요소들 수집
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(heading => ({
        level: heading.tagName.toLowerCase(),
        text: heading.textContent?.trim() || null,
        id: heading.id || null,
        className: heading.className || null
      }));

      // 링크들 수집
      const links = Array.from(document.querySelectorAll('a')).map(link => ({
        text: link.textContent?.trim() || null,
        href: link.href || null,
        className: link.className || null
      }));

      // 테이블 데이터 수집
      const tables = Array.from(document.querySelectorAll('table')).map(table => {
        const rows = Array.from(table.querySelectorAll('tr')).map(row => {
          const cells = Array.from(row.querySelectorAll('td, th')).map(cell => ({
            text: cell.textContent?.trim() || null,
            isHeader: cell.tagName.toLowerCase() === 'th'
          }));
          return cells;
        });
        return {
          id: table.id || null,
          className: table.className || null,
          rows: rows.slice(0, 10) // 최대 10행만
        };
      });

      context.domElements = {
        pageTextContent: context.pageTextContent,
        forms: forms.slice(0, 5), // 최대 5개만
        inputs: inputs.slice(0, 15), // 최대 15개만
        buttons: buttons.slice(0, 10), // 최대 10개만
        headings: headings.slice(0, 10), // 최대 10개만
        links: links.slice(0, 10), // 최대 10개만
        tables: tables.slice(0, 3) // 최대 3개만
      };

      // 페이지 구조 분석
      context.pageStructure = {
        hasForms: forms.length > 0,
        hasInputs: inputs.length > 0,
        hasButtons: buttons.length > 0,
        hasTables: tables.length > 0,
        mainHeading: headings.find(h => h.level === 'h1')?.text || null,
        subHeadings: headings.filter(h => h.level !== 'h1').slice(0, 5).map(h => h.text)
      };

    } catch (error) {
      console.warn('DOM 요소 수집 중 오류:', error);
      context.domElements = { 
        forms: [], 
        inputs: [], 
        buttons: [], 
        headings: [],
        links: [],
        tables: []
      };
      context.pageStructure = {
        hasForms: false,
        hasInputs: false,
        hasButtons: false,
        hasTables: false,
        mainHeading: null,
        subHeadings: []
      };
    }

    return context;
  };

  // 페이지별 설명 매핑
  const getPageDescription = (pathname) => {
    const pageMap = {
      '/': '메인 홈페이지',
      '/login': '로그인 페이지',
      '/signup': '회원가입 페이지',
      '/joblist': '채용공고 목록 페이지',
      '/mypage': '마이페이지',
      '/corporatehome': '기업 홈페이지',
      '/applicantlist': '지원자 목록 페이지',
      '/postrecruitment': '채용공고 등록 페이지',
      '/editpost': '채용공고 수정 페이지',
      '/viewpost': '채용공고 상세보기 페이지',
      '/email': '이메일 발송 페이지',
      '/managerschedule': '매니저 일정 관리 페이지',
      '/memberschedule': '멤버 일정 관리 페이지',
      '/passedapplicants': '합격자 목록 페이지',
      '/rejectedapplicants': '불합격자 목록 페이지',
      '/interview-progress': '면접 진행 상황 페이지',
      '/common/company': '파트너사 목록 페이지',
      '/common/company/:id': '파트너사 상세 페이지',
      '/common/jobposts/:id': '공개 채용공고 상세 페이지',
      '/company/jobposts/:id': '기업 채용공고 상세 페이지',
      '/applicantlist/:jobPostId': '특정 채용공고의 지원자 목록 페이지',
      '/role-test': '역할 테스트 페이지',
      '/test-connection': '연결 테스트 페이지'
    };
    
    // 동적 라우트 매칭을 위한 처리
    if (pathname.startsWith('/editpost/')) {
      return '채용공고 수정 페이지';
    }
    if (pathname.startsWith('/viewpost/')) {
      return '채용공고 상세보기 페이지';
    }
    if (pathname.startsWith('/passedapplicants/')) {
      return '합격자 목록 페이지';
    }
    if (pathname.startsWith('/rejectedapplicants/')) {
      return '불합격자 목록 페이지';
    }
    if (pathname.startsWith('/interview-progress/')) {
      return '면접 진행 상황 페이지';
    }
    if (pathname.startsWith('/common/company/') && pathname !== '/common/company') {
      return '파트너사 상세 페이지';
    }
    if (pathname.startsWith('/common/jobposts/')) {
      return '공개 채용공고 상세 페이지';
    }
    if (pathname.startsWith('/company/jobposts/')) {
      return '기업 채용공고 상세 페이지';
    }
    if (pathname.startsWith('/applicantlist/') && pathname !== '/applicantlist') {
      return '특정 채용공고의 지원자 목록 페이지';
    }
    
    return pageMap[pathname] || '알 수 없는 페이지';
  };

  // 세션 초기화
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen, sessionId]);

  const initializeSession = async () => {
    try {
      const response = await chatbotApi.get('/chat/session/new');
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
        console.log('새 세션 생성:', response.data.session_id);
      }
    } catch (error) {
      console.error('세션 생성 실패:', error);
      toast({
        title: "연결 오류",
        description: "챗봇 서버에 연결할 수 없습니다.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

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

  const handleSendMessage = async (customMessage = null) => {
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

    try {
      // 지원자 목록 페이지에서 자연어 필터링 처리
      if (location.pathname.includes('applicantlist') && allApplicants.length > 0) {
        const filteredApplicants = processNaturalLanguageFilter(messageToSend);
        const filterSummary = generateFilterSummary(filteredApplicants, messageToSend);
        
        if (filteredApplicants.length > 0) {
          setFilteredResults({
            applicants: filteredApplicants,
            summary: filterSummary
          });
          
          // 필터링 결과 메시지 생성
          let botResponse = `🧠 **필터링 결과**\n\n${filterSummary.summary}\n\n`;
          
          // 상위 지원자 정보 추가
          filterSummary.applicants.forEach((applicant, index) => {
            const skillsText = applicant.skills.length > 0 ? ` (${applicant.skills.join(', ')})` : '';
            botResponse += `👤 ${applicant.name}${skillsText}\n`;
          });
          
          if (filteredApplicants.length > 3) {
            botResponse += `\n... 외 ${filteredApplicants.length - 3}명\n`;
          }
          
          botResponse += `\n👉 **[결과 전체 보기]** 버튼을 클릭하시면 상세 목록을 확인할 수 있습니다.`;
          
          const botMessage = {
            id: messages.length + 2,
            text: botResponse,
            sender: 'bot',
            timestamp: new Date(),
            hasFilterResults: true,
            filterData: {
              applicants: filteredApplicants,
              summary: filterSummary
            }
          };
          
          setMessages(prev => [...prev, botMessage]);
          setIsTyping(false);
          return;
        } else {
          // 조건에 맞는 지원자가 없는 경우
          const botMessage = {
            id: messages.length + 2,
            text: `조건에 맞는 지원자가 없습니다. 다른 조건으로 검색해보세요.`,
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, botMessage]);
          setIsTyping(false);
          return;
        }
      }

      // 일반 챗봇 응답 처리
      const pageContext = getPageContext();
      console.log('챗봇 요청:', { message: messageToSend, session_id: sessionId });
      
      const response = await chatbotApi.post('/chat/', {
        message: messageToSend,
        session_id: sessionId,
        page_context: pageContext
      });

      console.log('챗봇 응답:', response.data);

      const botMessage = {
        id: messages.length + 2,
        text: response.data.ai_response || response.data.response || '응답을 받지 못했습니다.',
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('챗봇 응답 오류:', error);
      const errorMessage = {
        id: messages.length + 2,
        text: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        sender: 'bot',
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
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
    e.preventDefault();
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

    if (resizeDirection.includes('right')) {
      newWidth = Math.max(300, Math.min(800, resizeStart.width + deltaX));
    } else if (resizeDirection.includes('left')) {
      newWidth = Math.max(300, Math.min(800, resizeStart.width - deltaX));
    }

    if (resizeDirection.includes('bottom')) {
      newHeight = Math.max(400, Math.min(800, resizeStart.height + deltaY));
    } else if (resizeDirection.includes('top')) {
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
    <Box 
      position="fixed" 
      bottom={4} 
      right={4} 
      zIndex={9999}
      style={{ isolation: 'isolate' }}
    >
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
          aria-label="챗봇 열기"
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
            style={{ isolation: 'isolate' }}
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
                    <Text fontSize="sm" opacity={0.8}>
                      {sessionId ? `${getPageDescription(location.pathname)} - AI 연결됨` : '연결 중...'}
                    </Text>
                  </Box>
                </Flex>
                <IconButton
                  icon={<CloseIcon />}
                  onClick={() => setIsOpen(false)}
                  size="sm"
                  variant="ghost"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  aria-label="챗봇 닫기"
                />
              </Flex>
            </Box>

            {/* 메시지 영역 */}
            <VStack
              flex={1}
              overflowY="auto"
              p={4}
              spacing={3}
              bg={messageAreaBg}
            >
              {messages.map((message) => (
                <Box
                  key={message.id}
                  alignSelf={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                  maxW="80%"
                >
                  <Box
                    bg={message.sender === 'user' ? userMessageBg : 
                        message.isError ? 'red.100' : botMessageBg}
                    color={message.sender === 'user' ? 'white' : 
                           message.isError ? 'red.800' : 'inherit'}
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
                    
                    {/* 필터링 결과가 있는 경우 "결과 전체 보기" 버튼 추가 */}
                    {message.hasFilterResults && message.filterData && (
                      <Button
                        size="sm"
                        colorScheme="blue"
                        variant="outline"
                        mt={2}
                        onClick={() => {
                          setFilteredResults(message.filterData);
                          onModalOpen();
                        }}
                        _hover={{ bg: 'blue.50' }}
                      >
                        결과 전체 보기
                      </Button>
                    )}
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
                        sx={{
                          animation: 'bounce 1.4s infinite ease-in-out',
                          animationDelay: '0s'
                        }}
                      />
                      <Box
                        w={2}
                        h={2}
                        bg="gray.400"
                        borderRadius="full"
                        sx={{
                          animation: 'bounce 1.4s infinite ease-in-out',
                          animationDelay: '0.16s'
                        }}
                      />
                      <Box
                        w={2}
                        h={2}
                        bg="gray.400"
                        borderRadius="full"
                        sx={{
                          animation: 'bounce 1.4s infinite ease-in-out',
                          animationDelay: '0.32s'
                        }}
                      />
                    </HStack>
                  </Box>
                </Box>
              )}

              {/* 빠른 응답 버튼들 */}
              {messages.length === 1 && !isTyping && sessionId && (
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
                  placeholder={sessionId ? "메시지를 입력하세요..." : "연결 중..."}
                  disabled={isTyping || !sessionId}
                  size="sm"
                />
                <IconButton
                  colorScheme="blue"
                  onClick={() => handleSendMessage()}
                  disabled={inputMessage.trim() === '' || isTyping || !sessionId}
                  icon={<ArrowForwardIcon />}
                  size="sm"
                  _hover={{ transform: 'scale(1.1)' }}
                  transition="all 0.2s"
                  aria-label="메시지 전송"
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

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
      
      {/* 필터링 결과 모달 */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxW="90vw" maxH="90vh">
          <ModalHeader>
            필터링 결과 - {filteredResults?.summary?.summary || '지원자 목록'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {filteredResults && (
              <CommonResumeList
                jobPostId={currentJobPostId}
                filterConditions={null}
                onFilteredResults={null}
                showResumeDetail={false}
                compact={false}
                onApplicantSelect={null}
                onResumeLoad={null}
                customApplicants={filteredResults.applicants}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Chatbot; 