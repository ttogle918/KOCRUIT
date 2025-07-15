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
import { useFormContext } from '../context/FormContext';
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
  const { 
    formData, 
    isFormActive, 
    currentFormType, 
    updateFormField, 
    updateTeamMembers, 
    updateSchedules, 
    updateWeights, 
    fillFormWithAI, 
    suggestFormImprovements,
    setFormData // 추가: formData를 직접 반영하기 위해 필요
  } = useFormContext();
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

  // 폼 관련 빠른 응답
  const formQuickReplies = [
    "프론트엔드 개발자 2명 뽑는 공고 작성해줘",
    "현재 폼 상태 확인",
    "폼 개선 제안",
    "부서명을 개발팀으로 변경"
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

  // 폼 명령 처리 함수
  // AI 기반 필드 개선 함수
  const improveFieldWithAI = async (fieldName, currentContent, userRequest) => {
    try {
      const response = await fetch('http://localhost:8001/ai/field-improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field_name: fieldName,
          current_content: currentContent,
          user_request: userRequest,
          form_context: formData
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.improved_content || currentContent;
      } else {
        throw new Error('AI 서버 응답 오류');
      }
    } catch (error) {
      console.error('AI 필드 개선 오류:', error);
      // 로컬 폴백 로직
      return improveFieldLocally(fieldName, currentContent, userRequest);
    }
  };

  // 로컬 폴백 개선 로직
  const improveFieldLocally = (fieldName, currentContent, userRequest) => {
    const improvements = {
      title: {
        '더 구체적으로': 'React 프론트엔드 개발자 2명 채용',
        '더 상세하게': '[신입/경력] React 프론트엔드 개발자 2명 모집',
        '간단하게': '프론트엔드 개발자 채용'
      },
      department: {
        '더 구체적으로': 'IT개발팀',
        '더 상세하게': '소프트웨어개발팀',
        '간단하게': '개발팀'
      },
      qualifications: {
        '더 구체적으로': '• 관련 분야 학사 이상\n• 관련 업무 경험 2년 이상\n• HTML, CSS, JavaScript 숙련자\n• React 또는 Vue.js 경험 필수\n• Git 버전 관리 시스템 경험\n• 팀워크 및 커뮤니케이션 능력',
        '더 상세하게': '• 컴퓨터 공학 또는 관련 전공 학사 이상\n• 프론트엔드 개발 경력 2년 이상\n• HTML5, CSS3, JavaScript ES6+ 숙련자\n• React.js 또는 Vue.js 1년 이상 경험\n• Git, GitHub 등 버전 관리 시스템 경험\n• RESTful API 연동 경험\n• 반응형 웹 디자인 경험\n• 팀워크 및 커뮤니케이션 능력 우대',
        '간단하게': '• 관련 분야 학사 이상\n• 프론트엔드 개발 경험\n• React/Vue.js 경험'
      },
      conditions: {
        '더 구체적으로': '• 근무시간: 09:00 ~ 18:00 (주 5일)\n• 급여: 연봉 3,500만원 ~ 5,000만원\n• 복리후생: 4대보험, 퇴직연금, 점심식대, 교통비\n• 연차: 법정연차, 반차, 반반차\n• 교육비 지원, 자기계발 지원',
        '더 상세하게': '• 근무시간: 09:00 ~ 18:00 (월~금, 주 40시간)\n• 급여: 연봉 3,500만원 ~ 5,000만원 (경력에 따라 협의)\n• 복리후생: 4대보험, 퇴직연금, 점심식대 1만원, 교통비 월 10만원\n• 연차: 법정연차, 반차, 반반차, 경조사 휴가\n• 교육비 지원: 연간 100만원, 자기계발 지원\n• 건강검진: 연 1회 무료',
        '간단하게': '• 주 5일 근무, 09:00~18:00\n• 연봉 협의\n• 4대보험, 복리후생'
      },
      job_details: {
        '더 구체적으로': '• 프론트엔드 애플리케이션 개발 및 유지보수\n• UI/UX 개선 및 사용자 경험 최적화\n• API 연동 및 백엔드와의 협업\n• 최신 웹 기술 트렌드 반영\n• 팀과의 협업을 통한 프로젝트 진행',
        '더 상세하게': '• React.js 기반 프론트엔드 애플리케이션 개발\n• 사용자 인터페이스 설계 및 구현\n• RESTful API 연동 및 데이터 처리\n• 성능 최적화 및 코드 리팩토링\n• 크로스 브라우저 호환성 확보\n• 반응형 웹 디자인 구현\n• Git을 통한 버전 관리 및 협업\n• 코드 리뷰 및 기술 문서 작성',
        '간단하게': '• 웹 애플리케이션 개발\n• UI/UX 구현\n• 팀 협업'
      },
      procedures: {
        '더 구체적으로': '1차 서류전형 → 2차 1차면접(온라인) → 3차 2차면접(대면) → 최종합격',
        '더 상세하게': '• 서류전형: 지원서 접수 후 1주일 내 결과 통보\n• 1차면접: 온라인 화상면접 (30분)\n• 2차면접: 대면면접 (1시간)\n• 최종합격: 2차면접 후 1주일 내 개별 통보',
        '간단하게': '서류 → 면접 → 합격'
      },
      location: {
        '더 구체적으로': '서울특별시 강남구 테헤란로 123',
        '더 상세하게': '서울특별시 강남구 테헤란로 123, 코리아타워 15층',
        '간단하게': '서울시 강남구'
      }
    };

    const fieldImprovements = improvements[fieldName];
    if (!fieldImprovements) return currentContent;

    // 사용자 요청에서 키워드 찾기
    for (const [keyword, improvedContent] of Object.entries(fieldImprovements)) {
      if (userRequest.includes(keyword)) {
        return improvedContent;
      }
    }

    // 기본 개선
    return fieldImprovements['더 구체적으로'] || currentContent;
  };

  const handleFormCommands = async (message) => {
    const lowerMessage = message.toLowerCase();
    
    // 백엔드의 LLM 기반 라우팅을 사용하기 위해 API 호출
    try {
      const response = await fetch('http://localhost:8001/ai/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          current_form_data: formData,
          user_intent: ""
        })
      });

      if (response.ok) {
        const result = await response.json();
        // === form_data가 있으면 폼에 반영 ===
        if (result.form_data && Object.keys(result.form_data).length > 0) {
          setFormData(result.form_data);
        }
        return result.response || result.message || '요청을 처리했습니다.';
      } else {
        throw new Error('라우팅 서버 응답 오류');
      }
    } catch (error) {
      console.error('라우팅 오류:', error);
      // 백엔드 라우팅이 실패하면 기존 로직으로 폴백
      return handleFormCommandsFallback(message);
    }
  };

  const handleFormCommandsFallback = async (message) => {
    const lowerMessage = message.toLowerCase();
    
    // 명령어 의도 파악 함수
    const parseFieldUpdateCommand = (fieldName, fieldPattern, message) => {
      // 일반적인 수정 요청 패턴들 (실제 값 변경이 아닌 경우)
      const generalModifyPatterns = [
        /수정해줘/,
        /바꿔줘/,
        /고쳐줘/,
        /개선해줘/,
        /조정해줘/,
        /업데이트해줘/,
        /변경해줘/
      ];
      
      // AI 기반 개선 요청 패턴들
      const aiImprovePatterns = [
        /더\s+구체적으로/,
        /더\s+상세하게/,
        /더\s+자세하게/,
        /개선해줘/,
        /보완해줘/,
        /완성해줘/,
        /작성해줘/
      ];
      
      // 구체적인 값 변경 패턴들
      const specificValuePatterns = [
        new RegExp(`${fieldPattern}\\s*(?:을|를)?\\s*(.+?)\\s*(?:으로|로)\\s*(?:변경|바꿔|수정|설정)`, 'i'),
        new RegExp(`${fieldPattern}\\s*(?:을|를)?\\s*(.+?)(?:\\s|$|으로|로)`, 'i'),
        new RegExp(`${fieldPattern}\\s*:\\s*(.+)`, 'i'),
        new RegExp(`${fieldPattern}\\s*=\\s*(.+)`, 'i')
      ];
      
      // AI 기반 개선 요청인지 확인
      const isAIImproveRequest = aiImprovePatterns.some(pattern => 
        pattern.test(message) && !specificValuePatterns.some(specificPattern => specificPattern.test(message))
      );
      
      if (isAIImproveRequest) {
        return {
          isAIRequest: true,
          fieldName: fieldName,
          message: `${fieldName}을 AI가 개선해드리겠습니다. 잠시만 기다려주세요...`
        };
      }
      
      // 일반적인 수정 요청인지 확인
      const isGeneralModifyRequest = generalModifyPatterns.some(pattern => 
        pattern.test(message) && !specificValuePatterns.some(specificPattern => specificPattern.test(message))
      );
      
      if (isGeneralModifyRequest) {
        return {
          isGeneralRequest: true,
          fieldName: fieldName,
          message: `${fieldName}을 어떻게 수정하고 싶으신가요? 구체적으로 말씀해 주세요.\n\n예시:\n• "${fieldName}을 더 구체적으로 작성해줘"\n• "${fieldName}에 경력 요건을 추가해줘"\n• "${fieldName}을 간단하게 줄여줘"`
        };
      }
      
      // 구체적인 값 변경 요청인지 확인
      for (const pattern of specificValuePatterns) {
        const match = message.match(pattern);
        if (match) {
          const newValue = match[1].trim();
          // 너무 짧거나 의미 없는 값인지 확인
          if (newValue.length < 2 || ['조금', '약간', '좀', '그냥', '일반'].includes(newValue)) {
            return {
              isGeneralRequest: true,
              fieldName: fieldName,
              message: `${fieldName}을 어떻게 수정하고 싶으신가요? 더 구체적으로 말씀해 주세요.\n\n예시:\n• "${fieldName}을 더 구체적으로 작성해줘"\n• "${fieldName}에 경력 요건을 추가해줘"\n• "${fieldName}을 간단하게 줄여줘"`
            };
          }
          return {
            isGeneralRequest: false,
            fieldName: fieldName,
            newValue: newValue
          };
        }
      }
      
      return null;
    };
    
    // 특정 필드 수정 명령
    if (lowerMessage.includes('부서') || lowerMessage.includes('department')) {
      const result = parseFieldUpdateCommand('부서명', '부서[명]*', message);
      if (result) {
        if (result.isAIRequest) {
          // AI 기반 개선 요청
          try {
            const improvedContent = await improveFieldWithAI('department', formData.department, message);
            updateFormField('department', improvedContent);
            return `부서명을 AI가 개선했습니다:\n\n${improvedContent}`;
          } catch (error) {
            return `AI 개선 중 오류가 발생했습니다: ${error.message}`;
          }
        } else if (result.isGeneralRequest) {
          return result.message;
        } else {
          updateFormField('department', result.newValue);
          return `부서명을 "${result.newValue}"로 변경했습니다.`;
        }
      }
    }
    
    if (lowerMessage.includes('제목') || lowerMessage.includes('title')) {
      const result = parseFieldUpdateCommand('제목', '제목', message);
      if (result) {
        if (result.isAIRequest) {
          // AI 기반 개선 요청
          try {
            const improvedContent = await improveFieldWithAI('title', formData.title, message);
            updateFormField('title', improvedContent);
            return `채용공고 제목을 AI가 개선했습니다:\n\n${improvedContent}`;
          } catch (error) {
            return `AI 개선 중 오류가 발생했습니다: ${error.message}`;
          }
        } else if (result.isGeneralRequest) {
          return result.message;
        } else {
          updateFormField('title', result.newValue);
          return `채용공고 제목을 "${result.newValue}"로 변경했습니다.`;
        }
      }
    }
    
    if (lowerMessage.includes('지원자격') || lowerMessage.includes('qualifications')) {
      const result = parseFieldUpdateCommand('지원자격', '지원자격', message);
      if (result) {
        if (result.isAIRequest) {
          // AI 기반 개선 요청
          try {
            const improvedContent = await improveFieldWithAI('qualifications', formData.qualifications, message);
            updateFormField('qualifications', improvedContent);
            return `지원자격을 AI가 개선했습니다:\n\n${improvedContent}`;
          } catch (error) {
            return `AI 개선 중 오류가 발생했습니다: ${error.message}`;
          }
        } else if (result.isGeneralRequest) {
          return result.message;
        } else {
          updateFormField('qualifications', result.newValue);
          return `지원자격을 "${result.newValue}"로 변경했습니다.`;
        }
      }
    }
    
    if (lowerMessage.includes('근무조건') || lowerMessage.includes('conditions')) {
      const result = parseFieldUpdateCommand('근무조건', '근무조건', message);
      if (result) {
        if (result.isAIRequest) {
          // AI 기반 개선 요청
          try {
            const improvedContent = await improveFieldWithAI('conditions', formData.conditions, message);
            updateFormField('conditions', improvedContent);
            return `근무조건을 AI가 개선했습니다:\n\n${improvedContent}`;
          } catch (error) {
            return `AI 개선 중 오류가 발생했습니다: ${error.message}`;
          }
        } else if (result.isGeneralRequest) {
          return result.message;
        } else {
          updateFormField('conditions', result.newValue);
          return `근무조건을 "${result.newValue}"로 변경했습니다.`;
        }
      }
    }
    
    if (lowerMessage.includes('모집분야') || lowerMessage.includes('job_details')) {
      const result = parseFieldUpdateCommand('모집분야', '모집분야', message);
      if (result) {
        if (result.isAIRequest) {
          // AI 기반 개선 요청
          try {
            const improvedContent = await improveFieldWithAI('job_details', formData.job_details, message);
            updateFormField('job_details', improvedContent);
            return `모집분야를 AI가 개선했습니다:\n\n${improvedContent}`;
          } catch (error) {
            return `AI 개선 중 오류가 발생했습니다: ${error.message}`;
          }
        } else if (result.isGeneralRequest) {
          return result.message;
        } else {
          updateFormField('job_details', result.newValue);
          return `모집분야를 "${result.newValue}"로 변경했습니다.`;
        }
      }
    }
    
    if (lowerMessage.includes('전형절차') || lowerMessage.includes('procedures')) {
      const result = parseFieldUpdateCommand('전형절차', '전형절차', message);
      if (result) {
        if (result.isAIRequest) {
          // AI 기반 개선 요청
          try {
            const improvedContent = await improveFieldWithAI('procedures', formData.procedures, message);
            updateFormField('procedures', improvedContent);
            return `전형절차를 AI가 개선했습니다:\n\n${improvedContent}`;
          } catch (error) {
            return `AI 개선 중 오류가 발생했습니다: ${error.message}`;
          }
        } else if (result.isGeneralRequest) {
          return result.message;
        } else {
          updateFormField('procedures', result.newValue);
          return `전형절차를 "${result.newValue}"로 변경했습니다.`;
        }
      }
    }
    
    if (lowerMessage.includes('모집인원') || lowerMessage.includes('headcount')) {
      const headMatch = message.match(/모집인원\s*(?:을|를)?\s*(\d+)/);
      if (headMatch) {
        const newHeadcount = headMatch[1];
        updateFormField('headcount', newHeadcount);
        return `모집인원을 ${newHeadcount}명으로 변경했습니다.`;
      }
    }
    
    if (lowerMessage.includes('근무지역') || lowerMessage.includes('location')) {
      const result = parseFieldUpdateCommand('근무지역', '근무지역', message);
      if (result) {
        if (result.isAIRequest) {
          // AI 기반 개선 요청
          try {
            const improvedContent = await improveFieldWithAI('location', formData.location, message);
            updateFormField('location', improvedContent);
            return `근무지역을 AI가 개선했습니다:\n\n${improvedContent}`;
          } catch (error) {
            return `AI 개선 중 오류가 발생했습니다: ${error.message}`;
          }
        } else if (result.isGeneralRequest) {
          return result.message;
        } else {
          updateFormField('location', result.newValue);
          return `근무지역을 "${result.newValue}"로 변경했습니다.`;
        }
      }
    }
    
    if (lowerMessage.includes('고용형태') || lowerMessage.includes('employment_type')) {
      const empMatch = message.match(/고용형태\s*(?:을|를)?\s*(정규직|계약직|인턴|프리랜서)/);
      if (empMatch) {
        const newEmploymentType = empMatch[1];
        updateFormField('employment_type', newEmploymentType);
        return `고용형태를 "${newEmploymentType}"로 변경했습니다.`;
      }
    }
    
    // 기존 하드코딩된 로직은 백엔드 라우팅으로 대체되었으므로 제거
    // 모든 폼 관련 요청은 백엔드의 LLM 기반 라우터가 처리
    
    // 폼 개선 제안
    if (lowerMessage.includes('개선') || lowerMessage.includes('조언') || lowerMessage.includes('제안')) {
      try {
        const result = await suggestFormImprovements();
        if (result.success) {
          let response = '**폼 개선 제안**\n\n';
          result.suggestions.forEach((suggestion, index) => {
            response += `${index + 1}. ${suggestion}\n`;
          });
          return response;
        } else {
          return `${result.message}`;
        }
      } catch (error) {
        return '폼 개선 제안 중 오류가 발생했습니다.';
      }
    }
    
    // 현재 폼 상태 확인
    if (lowerMessage.includes('현재') || lowerMessage.includes('상태') || lowerMessage.includes('확인')) {
      let response = '**현재 폼 상태**\n\n';
      if (formData.title) response += `제목: ${formData.title}\n`;
      if (formData.department) response += `부서: ${formData.department}\n`;
      if (formData.headcount) response += `모집인원: ${formData.headcount}명\n`;
      if (formData.location) response += `근무지역: ${formData.location}\n`;
      if (formData.employment_type) response += `고용형태: ${formData.employment_type}\n`;
      if (formData.teamMembers && formData.teamMembers.length > 0) {
        response += `팀멤버: ${formData.teamMembers.length}명\n`;
      }
      if (formData.schedules && formData.schedules.length > 0) {
        response += `면접일정: ${formData.schedules.length}개\n`;
      }
      if (formData.weights && formData.weights.length > 0) {
        response += `가중치: ${formData.weights.length}개\n`;
      }
      return response;
    }
    
    return null; // 폼 명령이 아닌 경우
  };

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

      // 폼 관련 명령 처리
      if (isFormActive && (location.pathname.includes('postrecruitment') || location.pathname.includes('editpost'))) {
        console.log('폼 명령 처리 시작:', { isFormActive, pathname: location.pathname, message: messageToSend });
        const formResponse = await handleFormCommands(messageToSend);
        console.log('폼 명령 처리 결과:', formResponse);
        if (formResponse) {
          const botMessage = {
            id: messages.length + 2,
            text: formResponse,
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
                  {(isFormActive ? formQuickReplies : quickReplies).map((reply, index) => (
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