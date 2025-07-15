import React, { createContext, useContext, useState, useCallback } from 'react';

const FormContext = createContext();

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

export const FormProvider = ({ children }) => {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    qualifications: '',
    conditions: '',
    job_details: '',
    procedures: '',
    headcount: '',
    start_date: null,
    end_date: null,
    location: '',
    employment_type: '',
    deadline: null,
    teamMembers: [],
    schedules: [],
    weights: []
  });

  const [isFormActive, setIsFormActive] = useState(false);
  const [currentFormType, setCurrentFormType] = useState(null); // 'create' or 'edit'

  // 폼 데이터 업데이트 함수
  const updateFormData = useCallback((newData) => {
    setFormData(prev => ({
      ...prev,
      ...newData
    }));
  }, []);

  // 특정 필드 업데이트 함수
  const updateFormField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 팀 멤버 업데이트 함수
  const updateTeamMembers = useCallback((members) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: members
    }));
  }, []);

  // 면접 일정 업데이트 함수
  const updateSchedules = useCallback((schedules) => {
    setFormData(prev => ({
      ...prev,
      schedules: schedules
    }));
  }, []);

  // 가중치 업데이트 함수
  const updateWeights = useCallback((weights) => {
    setFormData(prev => ({
      ...prev,
      weights: weights
    }));
  }, []);

  // 폼 활성화/비활성화 함수
  const activateForm = useCallback((type) => {
    setIsFormActive(true);
    setCurrentFormType(type);
  }, []);

  const deactivateForm = useCallback(() => {
    setIsFormActive(false);
    setCurrentFormType(null);
  }, []);

  // 폼 데이터 초기화 함수
  const resetFormData = useCallback(() => {
    setFormData({
      title: '',
      department: '',
      qualifications: '',
      conditions: '',
      job_details: '',
      procedures: '',
      headcount: '',
      start_date: null,
      end_date: null,
      location: '',
      employment_type: '',
      deadline: null,
      teamMembers: [],
      schedules: [],
      weights: []
    });
  }, []);

  // AI를 통한 폼 자동 채우기 함수
  const fillFormWithAI = useCallback(async (description) => {
    try {
      // 현재 폼 데이터를 함수 내에서 가져오기
      const currentFormData = formData;
      
      // 실제 AI 서버 호출
      const response = await fetch('http://localhost:8001/ai/form-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description,
          current_form_data: currentFormData
        })
      });

      if (response.ok) {
        const result = await response.json();
        const aiGeneratedData = result.form_data || {};
        
        // 날짜 문자열을 Date 객체로 변환하는 함수
        const parseDateString = (dateString) => {
          if (!dateString) return null;
          try {
            return new Date(dateString);
          } catch (error) {
            console.error('날짜 파싱 오류:', error);
            return null;
          }
        };
        
        // 폼 데이터 업데이트 (날짜 필드 처리 포함)
        const updatedFormData = {
          ...currentFormData,
          ...aiGeneratedData,
          // 날짜 필드들을 Date 객체로 변환
          start_date: aiGeneratedData.start_date ? parseDateString(aiGeneratedData.start_date) : currentFormData.start_date,
          end_date: aiGeneratedData.end_date ? parseDateString(aiGeneratedData.end_date) : currentFormData.end_date
        };
        
        setFormData(updatedFormData);
        
        // 팀 멤버, 스케줄, 가중치 별도 업데이트
        if (aiGeneratedData.teamMembers) {
          updateTeamMembers(aiGeneratedData.teamMembers);
        }
        if (aiGeneratedData.schedules) {
          // 날짜 문자열을 Date 객체로 변환
          const processedSchedules = aiGeneratedData.schedules.map(schedule => ({
            ...schedule,
            date: schedule.date ? new Date(schedule.date) : null
          }));
          updateSchedules(processedSchedules);
        }
        if (aiGeneratedData.weights) {
          updateWeights(aiGeneratedData.weights);
        }
        
        return { success: true, message: result.message || 'AI가 폼을 자동으로 채웠습니다.' };
      } else {
        throw new Error('AI 서버 응답 오류');
      }
    } catch (error) {
      console.error('AI 폼 채우기 오류:', error);
      return { success: false, message: 'AI 폼 채우기에 실패했습니다.' };
    }
  }, [updateTeamMembers, updateSchedules, updateWeights]);

  // 설명으로부터 폼 데이터 생성하는 로컬 함수
  const generateFormDataFromDescription = useCallback((description) => {
    // 현재 날짜 기준으로 날짜 설정
    const currentDate = new Date();
    const baseDate = new Date('2025-08-01');
    const referenceDate = new Date(Math.max(currentDate.getTime(), baseDate.getTime()));
    
    // 모집 기간 설정
    const startDate = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000); // +1일
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // +14일
    
    // 면접 일정 (기본값) - 별도 업데이트
    const defaultSchedules = [
      { date: new Date(endDate.getTime() + 3 * 24 * 60 * 60 * 1000), time: '14:00', place: '회사 3층 회의실' }
    ];

    // 가중치 (기본값) - 별도 업데이트
    const defaultWeights = [
      { item: '학력', score: '0.3' },
      { item: '경력', score: '0.4' },
      { item: '기술스택', score: '0.5' },
      { item: '프로젝트경험', score: '0.6' },
      { item: '커뮤니케이션', score: '0.4' }
    ];

    // 별도로 업데이트
    setTimeout(() => {
      updateSchedules(defaultSchedules);
      updateWeights(defaultWeights);
    }, 100);
    const lowerDesc = description.toLowerCase();
    const generatedData = {};

    // 개발자 관련 키워드 감지
    if (lowerDesc.includes('프론트엔드') || lowerDesc.includes('frontend')) {
      generatedData.title = '프론트엔드 개발자 채용';
      generatedData.department = '개발팀';
      generatedData.qualifications = '• React, Vue.js, Angular 등 프론트엔드 프레임워크 경험\n• HTML, CSS, JavaScript/TypeScript 능숙\n• 반응형 웹 디자인 경험\n• Git 버전 관리 시스템 사용 경험';
      generatedData.job_details = '• 웹 애플리케이션 개발 및 유지보수\n• 사용자 인터페이스 설계 및 구현\n• 프론트엔드 성능 최적화\n• 백엔드 API와의 연동';
      generatedData.employment_type = '정규직';
    } else if (lowerDesc.includes('백엔드') || lowerDesc.includes('backend')) {
      generatedData.title = '백엔드 개발자 채용';
      generatedData.department = '개발팀';
      generatedData.qualifications = '• Java, Python, Node.js 등 백엔드 언어 경험\n• Spring Boot, Django, Express.js 등 프레임워크 경험\n• 데이터베이스 설계 및 관리 경험\n• RESTful API 설계 경험';
      generatedData.job_details = '• 서버 애플리케이션 개발 및 유지보수\n• 데이터베이스 설계 및 최적화\n• API 설계 및 구현\n• 시스템 아키텍처 설계';
      generatedData.employment_type = '정규직';
    } else if (lowerDesc.includes('풀스택') || lowerDesc.includes('fullstack')) {
      generatedData.title = '풀스택 개발자 채용';
      generatedData.department = '개발팀';
      generatedData.qualifications = '• 프론트엔드 및 백엔드 개발 경험\n• React, Node.js, Python 등 다양한 기술 스택 경험\n• 데이터베이스 설계 및 관리 경험\n• 클라우드 서비스 경험 (AWS, Azure 등)';
      generatedData.job_details = '• 전체 웹 애플리케이션 개발\n• 프론트엔드 및 백엔드 통합 개발\n• 데이터베이스 설계 및 구현\n• 배포 및 인프라 관리';
      generatedData.employment_type = '정규직';
    } else if (lowerDesc.includes('디자이너') || lowerDesc.includes('designer')) {
      generatedData.title = 'UI/UX 디자이너 채용';
      generatedData.department = '디자인팀';
      generatedData.qualifications = '• Figma, Sketch, Adobe XD 등 디자인 도구 능숙\n• 사용자 중심 디자인 경험\n• 프로토타이핑 및 와이어프레임 작성 경험\n• 디자인 시스템 구축 경험';
      generatedData.job_details = '• 사용자 인터페이스 디자인\n• 사용자 경험 설계\n• 프로토타입 제작\n• 디자인 가이드라인 작성';
      generatedData.employment_type = '정규직';
    } else if (lowerDesc.includes('마케팅') || lowerDesc.includes('marketing')) {
      generatedData.title = '마케팅 매니저 채용';
      generatedData.department = '마케팅팀';
      generatedData.qualifications = '• 디지털 마케팅 경험\n• SNS 마케팅 및 콘텐츠 마케팅 경험\n• 데이터 분석 및 성과 측정 경험\n• 브랜드 전략 수립 경험';
      generatedData.job_details = '• 마케팅 전략 수립 및 실행\n• 브랜드 관리 및 홍보\n• 고객 분석 및 타겟팅\n• 마케팅 성과 분석 및 개선';
      generatedData.employment_type = '정규직';
    } else if (lowerDesc.includes('인사') || lowerDesc.includes('hr')) {
      generatedData.title = '인사팀 채용';
      generatedData.department = '인사팀';
      generatedData.qualifications = '• 인사 관련 업무 경험\n• 채용 및 면접 진행 경험\n• 노동법 및 인사 제도 이해\n• 조직 문화 조성 경험';
      generatedData.job_details = '• 채용 및 인력 관리\n• 인사 제도 운영\n• 조직 문화 조성\n• 직원 복지 관리';
      generatedData.employment_type = '정규직';
    } else {
      // 기본값
      generatedData.title = '신입/경력 채용';
      generatedData.department = '일반';
      generatedData.qualifications = '• 관련 분야 학사 이상\n• 관련 업무 경험 우대\n• 적극적이고 책임감 있는 자세\n• 팀워크 능력';
      generatedData.job_details = '• 업무 수행 및 프로젝트 참여\n• 팀 협업 및 커뮤니케이션\n• 지속적인 학습 및 자기계발';
      generatedData.employment_type = '정규직';
    }

    // 모집 인원 추출
    const headcountMatch = description.match(/(\d+)명/);
    if (headcountMatch) {
      generatedData.headcount = headcountMatch[1];
    } else {
      generatedData.headcount = '1';
    }

    // 근무지역 기본값
    generatedData.location = '서울시 강남구';

    // 근무조건
    generatedData.conditions = '• 근무시간: 09:00 ~ 18:00 (주 5일)\n• 급여: 협의\n• 복리후생: 4대보험, 퇴직연금, 점심식대, 교통비\n• 연차: 법정연차, 반차, 반반차';

    // 전형절차
    generatedData.procedures = '1차 서류전형 → 2차 면접 → 최종합격';

    // 모집 기간 설정
    generatedData.start_date = startDate;
    generatedData.end_date = endDate;

    return generatedData;
  }, [updateSchedules, updateWeights]);

  // 폼 개선 제안 함수
  const suggestFormImprovements = useCallback(async () => {
    try {
      // 현재 폼 데이터를 함수 내에서 가져오기
      const currentFormData = formData;
      
      // 실제 AI 서버 호출
      const response = await fetch('http://localhost:8001/ai/form-improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_form_data: currentFormData
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, suggestions: result.suggestions || [] };
      } else {
        throw new Error('AI 서버 응답 오류');
      }
    } catch (error) {
      console.error('폼 개선 제안 오류:', error);
      return { success: false, message: '폼 개선 제안을 받지 못했습니다.' };
    }
  }, []);

  // 폼 개선 제안 생성 로컬 함수
  const generateFormSuggestions = (currentFormData) => {
    const suggestions = [];

    // 제목 검사
    if (!currentFormData.title || currentFormData.title.trim() === '') {
      suggestions.push('채용공고 제목을 입력해주세요. 명확하고 구체적인 제목이 좋습니다.');
    } else if (currentFormData.title.length < 10) {
      suggestions.push('채용공고 제목을 더 구체적으로 작성해보세요. (예: "React 프론트엔드 개발자 채용")');
    }

    // 부서 검사
    if (!currentFormData.department || currentFormData.department.trim() === '') {
      suggestions.push('부서명을 입력해주세요. (예: 개발팀, 인사팀, 마케팅팀)');
    }

    // 지원자격 검사
    if (!currentFormData.qualifications || currentFormData.qualifications.trim() === '') {
      suggestions.push('지원자격을 구체적으로 작성해주세요. 학력, 경력, 기술스택 등을 포함하세요.');
    } else if (currentFormData.qualifications.length < 50) {
      suggestions.push('지원자격을 더 상세하게 작성해보세요. 구체적인 기술이나 경험을 명시하세요.');
    }

    // 모집분야 검사
    if (!currentFormData.job_details || currentFormData.job_details.trim() === '') {
      suggestions.push('모집분야 및 자격요건을 상세히 작성해주세요. 담당업무와 필요한 역량을 명시하세요.');
    } else if (currentFormData.job_details.length < 100) {
      suggestions.push('모집분야를 더 구체적으로 작성해보세요. 담당업무, 프로젝트, 성장 기회 등을 포함하세요.');
    }

    // 근무조건 검사
    if (!currentFormData.conditions || currentFormData.conditions.trim() === '') {
      suggestions.push('근무조건을 명시해주세요. 근무시간, 급여, 복리후생 등을 포함하세요.');
    }

    // 전형절차 검사
    if (!currentFormData.procedures || currentFormData.procedures.trim() === '') {
      suggestions.push('전형절차를 명시해주세요. (예: 서류전형 → 1차면접 → 2차면접 → 최종합격)');
    }

    // 모집인원 검사
    if (!currentFormData.headcount || currentFormData.headcount === '') {
      suggestions.push('모집인원을 입력해주세요.');
    }

    // 근무지역 검사
    if (!currentFormData.location || currentFormData.location.trim() === '') {
      suggestions.push('근무지역을 입력해주세요. (예: 서울시 강남구)');
    }

    // 고용형태 검사
    if (!currentFormData.employment_type || currentFormData.employment_type === '') {
      suggestions.push('고용형태를 선택해주세요. (정규직, 계약직, 인턴, 프리랜서)');
    }

    // 팀 멤버 검사
    if (!currentFormData.teamMembers || currentFormData.teamMembers.length === 0) {
      suggestions.push('채용팀 멤버를 추가해주세요. 최소 1명 이상 필요합니다.');
    }

    // 면접 일정 검사
    if (!currentFormData.schedules || currentFormData.schedules.length === 0) {
      suggestions.push('면접 일정을 추가해주세요. 최소 1개 이상의 면접 일정이 필요합니다.');
    }

    // 가중치 검사
    if (!currentFormData.weights || currentFormData.weights.length < 5) {
      suggestions.push('가중치 항목을 5개 이상 추가해주세요. 이력서 평가에 사용됩니다.');
    }

    // 일반적인 개선 제안
    if (suggestions.length === 0) {
      suggestions.push('전반적으로 잘 작성되었습니다! 다음 사항들을 고려해보세요:');
      suggestions.push('• 지원자에게 매력적인 복리후생 정보를 추가해보세요.');
      suggestions.push('• 회사의 문화나 비전을 간단히 소개해보세요.');
      suggestions.push('• 성장 기회나 교육 지원 프로그램을 명시해보세요.');
    }

    return suggestions;
  };

  const value = {
    formData,
    isFormActive,
    currentFormType,
    updateFormData,
    updateFormField,
    updateTeamMembers,
    updateSchedules,
    updateWeights,
    activateForm,
    deactivateForm,
    resetFormData,
    fillFormWithAI,
    suggestFormImprovements,
    setFormData // 추가: 직접 formData를 설정할 수 있도록
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
}; 