// Mock Data for Offline/Development Mode

export const mockApplicants = [
  {
    id: 1,
    name: "김철수",
    email: "chulsoo@example.com",
    phone: "010-1234-5678",
    applied_at: "2023-10-01T10:00:00",
    status: "DOCUMENT_PASSED",
    practical_interview_status: "PENDING",
    executive_interview_status: "PENDING",
    resume_score: 85,
    ai_interview_score: 78,
    practical_interview_score: 0,
    executive_interview_score: 0,
    job_post_id: 1,
    application_id: 101
  },
  {
    id: 2,
    name: "이영희",
    email: "younghee@example.com",
    phone: "010-9876-5432",
    applied_at: "2023-10-02T11:30:00",
    status: "PRACTICAL_PASSED",
    practical_interview_status: "PASSED",
    executive_interview_status: "PENDING",
    resume_score: 92,
    ai_interview_score: 88,
    practical_interview_score: 90,
    executive_interview_score: 0,
    job_post_id: 1,
    application_id: 102
  },
  {
    id: 3,
    name: "박지성",
    email: "jisung@example.com",
    phone: "010-5555-4444",
    applied_at: "2023-10-03T09:15:00",
    status: "EXECUTIVE_PASSED",
    practical_interview_status: "PASSED",
    executive_interview_status: "PASSED",
    resume_score: 80,
    ai_interview_score: 82,
    practical_interview_score: 85,
    executive_interview_score: 95,
    job_post_id: 1,
    application_id: 103
  },
  {
    id: 4,
    name: "최민아",
    email: "mina@example.com",
    phone: "010-1111-2222",
    applied_at: "2023-10-04T14:20:00",
    status: "DOCUMENT_PASSED",
    practical_interview_status: "FAILED",
    executive_interview_status: "PENDING",
    resume_score: 88,
    ai_interview_score: 75,
    practical_interview_score: 60,
    executive_interview_score: 0,
    job_post_id: 1,
    application_id: 104
  }
];

export const mockJobPost = {
  id: 1,
  title: "[2023 하반기] 백엔드 개발자 신입 공개 채용",
  company_name: "테크 스타트업",
  status: "IN_PROGRESS",
  start_date: "2023-09-01",
  end_date: "2023-10-31",
  job_description: "백엔드 개발 및 시스템 운영",
  requirements: "Java, Spring Boot, MySQL, AWS 경험자"
};

export const mockInterviewStatistics = {
  total_applicants: 45,
  document_passed: 30,
  practical_passed: 15,
  executive_passed: 5,
  final_passed: 3,
  practical_avg_score: 78.5,
  executive_avg_score: 82.1,
  ai_avg_score: 76.4
};

export const mockQuestions = {
  practical: [
    { id: 1, question_text: "RESTful API란 무엇인가요?", type: "JOB", difficulty: "MEDIUM" },
    { id: 2, question_text: "Spring Boot의 장점은 무엇인가요?", type: "JOB", difficulty: "EASY" },
    { id: 3, question_text: "데이터베이스 인덱싱의 원리에 대해 설명해주세요.", type: "JOB", difficulty: "HARD" },
    { id: 4, question_text: "가장 어려웠던 기술적 챌린지는 무엇이었나요?", type: "PERSONAL", difficulty: "MEDIUM" },
    { id: 5, question_text: "팀 프로젝트에서 갈등을 해결한 경험이 있나요?", type: "COMMON", difficulty: "MEDIUM" }
  ],
  executive: [
    { id: 101, question_text: "우리 회사의 비전이 무엇이라고 생각하나요?", type: "EXECUTIVE", difficulty: "MEDIUM" },
    { id: 102, question_text: "5년 후 본인의 모습을 어떻게 그리고 있나요?", type: "EXECUTIVE", difficulty: "EASY" },
    { id: 103, question_text: "실패했던 경험과 그를 통해 배운 점은 무엇인가요?", type: "PERSONAL", difficulty: "HARD" },
    { id: 104, question_text: "동료들과 의견 차이가 있을 때 어떻게 대처하나요?", type: "COMMON", difficulty: "MEDIUM" }
  ]
};

export const mockSttLogs = [
  {
    id: 1,
    question_text: "자기소개를 간단히 해주세요.",
    answer_text: "안녕하세요, 저는 백엔드 개발자 김철수입니다. 주로 Java와 Spring Boot를 사용하여 웹 애플리케이션을 개발해왔으며, 최근에는 MSA 아키텍처에 관심을 가지고 공부하고 있습니다. 이전 프로젝트에서는 팀장 역할을 맡아 프로젝트를 성공적으로 이끈 경험이 있습니다.",
    interview_type: "PRACTICAL_INTERVIEW",
    created_at: "2023-10-25T10:05:00",
    emotion: "POSITIVE",
    answer_score: 85,
    answer_feedback: "자신감 있는 목소리와 명확한 발음이 인상적입니다. 핵심 역량을 잘 요약했습니다."
  },
  {
    id: 2,
    question_text: "RESTful API란 무엇인가요?",
    answer_text: "RESTful API는 HTTP 프로토콜을 기반으로 하는 웹 아키텍처 스타일입니다. 자원을 URI로 표현하고, 행위를 HTTP Method로 정의하여 상호작용합니다. 이를 통해 클라이언트와 서버 간의 통신을 명확하고 효율적으로 할 수 있습니다.",
    interview_type: "PRACTICAL_INTERVIEW",
    created_at: "2023-10-25T10:10:00",
    emotion: "NEUTRAL",
    answer_score: 90,
    answer_feedback: "개념을 정확하게 이해하고 있으며, 핵심적인 내용을 잘 설명했습니다."
  },
  {
    id: 3,
    question_text: "가장 어려웠던 프로젝트 경험은 무엇인가요?",
    answer_text: "지난 학기 캡스톤 디자인 프로젝트에서 대용량 트래픽 처리를 담당했을 때가 가장 기억에 남습니다. 당시 서버가 다운되는 문제가 발생했는데, 로드 밸런싱과 캐싱 전략을 도입하여 문제를 해결했습니다. 이 과정에서 시스템 아키텍처에 대한 이해가 깊어졌습니다.",
    interview_type: "PRACTICAL_INTERVIEW",
    created_at: "2023-10-25T10:15:00",
    emotion: "NERVOUS",
    answer_score: 88,
    answer_feedback: "구체적인 문제 상황과 해결 과정을 논리적으로 설명했습니다. 다만, 약간 긴장한 듯한 목소리가 느껴졌습니다."
  }
];

export const mockResume = {
  education: [
    { school_name: "서울대학교", major: "컴퓨터공학과", graduation_date: "2023-02", status: "GRADUATED" }
  ],
  careers: [
    { company_name: "(주)테크", department: "개발팀", position: "인턴", start_date: "2022-06", end_date: "2022-12", description: "백엔드 API 개발 보조" }
  ],
  projects: [
    { project_name: "쇼핑몰 프로젝트", description: "Spring Boot를 이용한 쇼핑몰 백엔드 구축", role: "백엔드 개발", start_date: "2022-09", end_date: "2022-12" }
  ],
  awards: [
    { award_name: "교내 해커톤 대상", organization: "서울대학교", date: "2022-10" }
  ],
  certificates: [
    { name: "정보처리기사", issuer: "한국산업인력공단", date: "2022-11" }
  ],
  languages: [
    { language: "영어", level: "AL", test_name: "OPIc", score: "AL" }
  ]
};

