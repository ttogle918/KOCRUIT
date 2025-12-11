# 📂 Frontend Interview Directory Analysis (FRONTEND_INTERVIEW_DEV_README)

이 문서는 **Frontend 인터뷰 시스템**의 디렉토리 구조와 각 파일의 역할을 상세히 기술한 문서입니다. 최근 진행된 도메인 주도 설계(Domain-Driven Design) 기반의 리팩토링 결과를 반영하고 있습니다.

---

## 🏗️ Directory Structure

### 1. Pages (`src/pages/interview/`)
페이지 컴포넌트는 라우팅의 대상이 되며, 각 면접 단계(관리, AI, 실무/임원)의 최상위 레이아웃을 담당합니다.

```bash
src/pages/interview/
├── admin/                  # 👨‍💼 관리자 및 전체 진행 현황
│   ├── InterviewAdminPage.jsx        # 전체 채용 관리 대시보드 (지원자 현황, 단계별 이동)
│   ├── InterviewApplicantList.jsx    # 지원자 목록 조회 및 관리
│   ├── InterviewPanelManagement.jsx  # 면접관/패널 관리 페이지
│   ├── InterviewProgress.jsx         # 면접 진행 현황판 (실무/임원 탭, 필터링, 통계)
│   ├── InterviewProgressExecutive.jsx # 임원 면접 진행 특화 페이지 (Legacy)
│   ├── InterviewProgressPractical.jsx # 실무 면접 진행 특화 페이지 (Legacy)
│   ├── InterviewResults.jsx          # 면접 결과 종합 조회
│   ├── InterviewStatusTest.jsx       # 면접 상태 변경 테스트 페이지
│   └── STTTestPage.jsx               # STT 기능 테스트 페이지
│
├── ai/                     # 🤖 AI 면접 (지원자용/설정용)
│   ├── AiInterviewAIResults.jsx          # AI 면접 결과 AI 분석 상세
│   ├── AiInterviewSetupPage.jsx          # AI 면접 설정 및 데모 체험 페이지
│   ├── AiSessionPage.jsx                 # [핵심] AI 면접 진행 메인 페이지 (화상, STT, 질문 흐름 제어)
│   ├── ApplicantAiInterviewAIResults.jsx # 지원자용 AI 면접 결과 조회
│   └── ApplicantAiInterviewDashboard.jsx # 지원자용 AI 면접 대시보드
│
└── human/                  # 👥 실무/임원 면접 (면접관용)
    ├── ExecutiveInterviewDetail.jsx  # 임원 면접 상세 평가 페이지
    ├── ExecutiveInterviewList.jsx    # 임원 면접 대상자 리스트
    ├── ExecutiveInterviewPage.jsx    # [핵심] 임원 면접 진행 페이지 (화상+평가)
    ├── PracticalInterviewPage.jsx    # [핵심] 실무 면접 진행 페이지 (화상+평가)
    └── InterviewDashboard.jsx        # 인터뷰 대시보드 (Deprecated 가능성 있음)
```

---

### 2. Components (`src/components/interview/`)
컴포넌트는 페이지를 구성하는 재사용 가능한 UI 블록입니다.

```bash
src/components/interview/
├── admin/                  # (Empty - 추후 관리자 전용 컴포넌트 이동 예정)
│
├── ai/                     # 🤖 AI 면접 관련 컴포넌트
│   ├── AiInterviewDemo.jsx           # AI 면접 데모 컴포넌트
│   ├── AiInterviewResultDisplay.jsx  # AI 분석 결과 시각화 (차트 등)
│   ├── AiInterviewResults.jsx        # AI 면접 결과 래퍼
│   ├── ApplicantCard.jsx             # [New] AI 면접 지원자 정보 카드
│   └── InterviewResultDetail.jsx     # [New] AI 면접 결과 상세 뷰
│
├── common/                 # 🔄 공통 사용 컴포넌트
│   ├── InterviewWorkspace.jsx        # [핵심] 면접 작업 공간 (이력서, 질문, 평가폼 통합 래퍼)
│   ├── ResumeViewer.jsx              # [New] 이력서 뷰어 컴포넌트
│   ├── QuestionList.jsx              # [New] 질문 리스트 컴포넌트
│   └── ...
│
├── human/                  # 👥 실무/임원 면접 관련 컴포넌트
│   └── EvaluationForm.jsx            # [New] 평가 입력 폼 (점수, 코멘트)
│
└── (Root)                  # 아직 분류되지 않은 컴포넌트들 (추후 정리 필요)
    ├── ApplicantCardWithInterviewStatus.jsx # 지원자 카드 (상태 배지 포함)
    ├── ApplicantListFull.jsx         # 전체 지원자 리스트
    ├── ApplicantQuestionsPanel.jsx   # 지원자별 질문 패널
    ├── CommonInterviewQuestionsPanel.jsx # 공통 질문 관리 패널
    ├── CommonQuestionsPanel.jsx      # 일반 질문 리스트 패널
    ├── CustomQuestionsPanel.jsx      # 사용자 정의 질문 패널
    ├── DraggablePanel.jsx            # 드래그 가능한 패널 래퍼
    ├── EvaluationPanel.jsx           # [핵심] 평가 패널 (세부 항목, 종합 의견, 가중치 설정)
    ├── EvaluationSlider.jsx          # 평가 점수 슬라이더
    ├── ExecutiveInterviewModal.jsx   # 임원 면접 모달
    ├── InterviewCompletionModal.jsx  # 면접 완료 확인 모달
    ├── InterviewerEvaluationPanel.jsx # 면접관 평가 패널 (Legacy)
    ├── InterviewEvaluationItems.jsx  # 평가 항목 리스트
    ├── InterviewInfoModal.jsx        # 면접 정보 모달
    ├── InterviewLangGraphCard.jsx    # LangGraph 연동 카드
    ├── InterviewPanel.jsx            # [Legacy] 구 면접 패널 (InterviewWorkspace로 대체됨)
    ├── InterviewPanelSelector.jsx    # 면접관 선택기
    ├── InterviewStatistics.jsx       # 면접 통계
    ├── InterviewStatisticsPanel.jsx  # [핵심] 면접 현황 및 일정 통계 패널 (탭 구조)
    ├── InterviewStatusCard.jsx       # 면접 상태 카드
    ├── PracticalInterviewModal.jsx   # 실무 면접 모달
    ├── QuestionRecommendationPanel.jsx # [핵심] 질문 추천 및 실시간 분석 패널 (AI 기능 집약)
    ├── RealtimeSTTResults.jsx        # 실시간 STT 결과 뷰
    ├── ResumePanel.jsx               # 이력서 패널 (Legacy)
    └── TabButton.jsx                 # 탭 버튼 UI
```

---

## 🔑 Key Files & Roles (주요 파일 역할)

### `QuestionRecommendationPanel.jsx` (UI/UX 대폭 개선)
*   **역할:** 면접관에게 **질문을 추천**하고, 면접 중 발생하는 음성을 분석하여 **실시간 피드백**을 제공하는 핵심 패널.
*   **주요 기능:**
    *   **Audio Visualizer:** 녹음 시 반응하는 실시간 파형 애니메이션.
    *   **Timeline Card UI:** 질문과 답변을 채팅형 타임라인으로 시각화.
    *   **AI Smart Badge:** 감정 분석 결과와 답변 적합도를 배지 형태로 표시.
    *   **Keyword Highlighting:** 답변 내 직무 핵심 키워드 자동 강조.
    *   **Filtering:** 질문 유형(공통/직무/인성) 및 난이도(상/중/하)별 필터링.
    *   **Pinning & Custom:** 질문 고정 및 즉석 질문 추가 기능.

### `AiSessionPage.jsx`
*   **역할:** AI 면접이 실제로 이루어지는 페이지.
*   **주요 기능:** 웹캠/마이크 제어, STT 실시간 스트리밍, 질문 제시, 답변 녹화 및 전송.

### `InterviewWorkspace.jsx`
*   **역할:** 실무/임원 면접 시 면접관이 보는 통합 작업 화면.
*   **구조:** 화면을 3분할하여 **이력서 뷰어**, **질문 리스트**, **평가 폼**을 한눈에 볼 수 있도록 구성.

### `InterviewProgress.jsx`
*   **역할:** 면접 진행 현황을 한눈에 파악하는 대시보드.
*   **주요 기능:** 지원자 리스트(합격/불합격 필터링), 전형 통계(진행률, 합격률), 오늘의 면접 일정 확인.

### `EvaluationPanel.jsx`
*   **역할:** 면접관이 지원자를 평가하는 입력 폼.
*   **주요 기능:** 항목별 점수 입력(슬라이더/별점), 평가 가중치 설정 모달, 종합 코멘트 작성, 합불 추천.
