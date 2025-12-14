# 📋 채용공고 및 지원자 관리 시스템 아키텍처

## 전체 채용 관리 시스템 구조

```mermaid
graph TB
    subgraph "👥 사용자 역할"
        HR[HR 담당자]
        MANAGER[부서 관리자]
        APPLICANT[지원자]
        INTERVIEWER[면접관]
    end
    
    subgraph "📝 채용공고 관리"
        JOB_CREATE[공고 작성]
        JOB_EDIT[공고 수정]
        JOB_PUBLISH[공고 게시]
        JOB_CLOSE[공고 마감]
    end
    
    subgraph "👤 지원자 관리"
        APPLY[지원서 제출]
        RESUME_UPLOAD[이력서 업로드]
        APPLICATION_REVIEW[지원서 검토]
        STATUS_UPDATE[상태 업데이트]
    end
    
    subgraph "🤖 AI 자동화"
        AUTO_SCREENING[자동 서류심사]
        AI_ANALYSIS[AI 이력서 분석]
        INTERVIEW_SCHEDULING[면접 일정 자동 배정]
        PANEL_ASSIGNMENT[면접관 자동 배정]
    end
    
    subgraph "📊 데이터 관리"
        APPLICANT_DB[(지원자 DB)]
        JOB_DB[(채용공고 DB)]
        EVALUATION_DB[(평가 결과 DB)]
        SCHEDULE_DB[(일정 관리 DB)]
    end
    
    subgraph "🔔 알림 시스템"
        EMAIL_NOTIFICATION[이메일 알림]
        SMS_NOTIFICATION[SMS 알림]
        IN_APP_NOTIFICATION[앱 내 알림]
        WEBHOOK[Webhook]
    end
    
    %% 연결 관계
    HR --> JOB_CREATE
    MANAGER --> JOB_EDIT
    JOB_CREATE --> JOB_PUBLISH
    JOB_PUBLISH --> JOB_CLOSE
    
    APPLICANT --> APPLY
    APPLY --> RESUME_UPLOAD
    RESUME_UPLOAD --> APPLICATION_REVIEW
    APPLICATION_REVIEW --> STATUS_UPDATE
    
    APPLICATION_REVIEW --> AUTO_SCREENING
    RESUME_UPLOAD --> AI_ANALYSIS
    STATUS_UPDATE --> INTERVIEW_SCHEDULING
    INTERVIEW_SCHEDULING --> PANEL_ASSIGNMENT
    
    AUTO_SCREENING --> APPLICANT_DB
    AI_ANALYSIS --> EVALUATION_DB
    JOB_PUBLISH --> JOB_DB
    INTERVIEW_SCHEDULING --> SCHEDULE_DB
    
    STATUS_UPDATE --> EMAIL_NOTIFICATION
    PANEL_ASSIGNMENT --> SMS_NOTIFICATION
    INTERVIEW_SCHEDULING --> IN_APP_NOTIFICATION
    JOB_PUBLISH --> WEBHOOK
    
    %% 스타일링
    classDef user fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef job fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef applicant fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef ai fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef data fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef notification fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    
    class HR,MANAGER,APPLICANT,INTERVIEWER user
    class JOB_CREATE,JOB_EDIT,JOB_PUBLISH,JOB_CLOSE job
    class APPLY,RESUME_UPLOAD,APPLICATION_REVIEW,STATUS_UPDATE applicant
    class AUTO_SCREENING,AI_ANALYSIS,INTERVIEW_SCHEDULING,PANEL_ASSIGNMENT ai
    class APPLICANT_DB,JOB_DB,EVALUATION_DB,SCHEDULE_DB data
    class EMAIL_NOTIFICATION,SMS_NOTIFICATION,IN_APP_NOTIFICATION,WEBHOOK notification
```

## 채용공고 생성 및 관리 플로우

```mermaid
sequenceDiagram
    participant HR as HR 담당자
    participant FE as Frontend
    participant BE as Backend
    participant AI as AI Agent
    participant DB as Database
    participant NOTIFY as 알림 시스템
    
    Note over HR,NOTIFY: 1. 채용공고 작성
    HR->>FE: 공고 작성 요청
    FE->>BE: POST /api/v2/jobs/
    BE->>DB: 공고 데이터 저장
    DB->>BE: 저장 완료
    BE->>FE: 공고 ID 반환
    FE->>HR: 작성 완료
    
    Note over HR,NOTIFY: 2. AI 최적화 제안
    BE->>AI: 공고 내용 분석 요청
    AI->>AI: 키워드 추출 및 분석
    AI->>BE: 최적화 제안 반환
    BE->>FE: 제안 사항 전달
    FE->>HR: AI 제안 표시
    
    Note over HR,NOTIFY: 3. 공고 게시
    HR->>FE: 공고 게시 승인
    FE->>BE: PUT /api/v2/jobs/{id}/publish
    BE->>DB: 상태 업데이트
    BE->>NOTIFY: 공고 게시 알림
    NOTIFY->>AI: 자동 면접관 배정 요청
    AI->>AI: 면접관 매칭 알고리즘
    AI->>DB: 면접관 배정 저장
    AI->>NOTIFY: 면접관 알림 발송
    NOTIFY->>FE: 게시 완료 알림
    FE->>HR: 게시 성공
```

## 지원자 관리 및 상태 추적 시스템

```mermaid
graph TD
    subgraph "📋 지원 단계"
        APPLIED[지원 완료]
        DOCUMENT_REVIEW[서류 심사]
        AI_INTERVIEW[AI 면접]
        PRACTICAL_INTERVIEW[실무진 면접]
        EXECUTIVE_INTERVIEW[임원진 면접]
        FINAL_DECISION[최종 결정]
    end
    
    subgraph "🔄 상태 관리"
        STATUS_PENDING[대기 중]
        STATUS_PASS[통과]
        STATUS_FAIL[불합격]
        STATUS_HOLD[보류]
        STATUS_WITHDRAW[지원 취소]
    end
    
    subgraph "🤖 자동화 프로세스"
        AUTO_SCREEN[자동 서류심사]
        AI_EVAL[AI 평가]
        SCORE_CALC[점수 계산]
        RANKING[순위 매기기]
    end
    
    subgraph "📊 데이터 추적"
        APPLICANT_PROFILE[지원자 프로필]
        EVALUATION_HISTORY[평가 이력]
        SCORE_TRACKING[점수 추적]
        FEEDBACK_LOG[피드백 로그]
    end
    
    APPLIED --> DOCUMENT_REVIEW
    DOCUMENT_REVIEW --> AI_INTERVIEW
    AI_INTERVIEW --> PRACTICAL_INTERVIEW
    PRACTICAL_INTERVIEW --> EXECUTIVE_INTERVIEW
    EXECUTIVE_INTERVIEW --> FINAL_DECISION
    
    DOCUMENT_REVIEW --> AUTO_SCREEN
    AI_INTERVIEW --> AI_EVAL
    PRACTICAL_INTERVIEW --> AI_EVAL
    EXECUTIVE_INTERVIEW --> AI_EVAL
    
    AUTO_SCREEN --> SCORE_CALC
    AI_EVAL --> SCORE_CALC
    SCORE_CALC --> RANKING
    
    RANKING --> STATUS_PASS
    RANKING --> STATUS_FAIL
    RANKING --> STATUS_HOLD
    
    STATUS_PENDING --> APPLICANT_PROFILE
    STATUS_PASS --> EVALUATION_HISTORY
    STATUS_FAIL --> EVALUATION_HISTORY
    STATUS_HOLD --> EVALUATION_HISTORY
    
    EVALUATION_HISTORY --> SCORE_TRACKING
    SCORE_TRACKING --> FEEDBACK_LOG
    
    %% 스타일링
    classDef stage fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef status fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef automation fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef tracking fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class APPLIED,DOCUMENT_REVIEW,AI_INTERVIEW,PRACTICAL_INTERVIEW,EXECUTIVE_INTERVIEW,FINAL_DECISION stage
    class STATUS_PENDING,STATUS_PASS,STATUS_FAIL,STATUS_HOLD,STATUS_WITHDRAW status
    class AUTO_SCREEN,AI_EVAL,SCORE_CALC,RANKING automation
    class APPLICANT_PROFILE,EVALUATION_HISTORY,SCORE_TRACKING,FEEDBACK_LOG tracking
```

## 면접관 자동 배정 시스템

```mermaid
graph TB
    subgraph "📋 배정 요청"
        JOB_POST[채용공고]
        SCHEDULE[면접 일정]
        REQUIREMENTS[요구사항]
    end
    
    subgraph "👥 면접관 풀"
        HR_INTERVIEWERS[HR 면접관]
        DEPARTMENT_INTERVIEWERS[부서 면접관]
        EXTERNAL_INTERVIEWERS[외부 면접관]
    end
    
    subgraph "🤖 AI 매칭 엔진"
        AVAILABILITY_CHECK[가용성 확인]
        SKILL_MATCHING[스킬 매칭]
        WORKLOAD_BALANCE[업무량 균형]
        PREFERENCE_ANALYSIS[선호도 분석]
    end
    
    subgraph "📊 배정 알고리즘"
        SCORE_CALCULATION[점수 계산]
        RANKING[순위 매기기]
        CONFLICT_RESOLUTION[충돌 해결]
        OPTIMIZATION[최적화]
    end
    
    subgraph "🔔 알림 및 확인"
        ASSIGNMENT_NOTIFICATION[배정 알림]
        CONFIRMATION_REQUEST[확인 요청]
        REJECTION_HANDLING[거부 처리]
        REPLACEMENT_SEARCH[대체자 검색]
    end
    
    JOB_POST --> AVAILABILITY_CHECK
    SCHEDULE --> AVAILABILITY_CHECK
    REQUIREMENTS --> SKILL_MATCHING
    
    HR_INTERVIEWERS --> AVAILABILITY_CHECK
    DEPARTMENT_INTERVIEWERS --> SKILL_MATCHING
    EXTERNAL_INTERVIEWERS --> WORKLOAD_BALANCE
    
    AVAILABILITY_CHECK --> SCORE_CALCULATION
    SKILL_MATCHING --> SCORE_CALCULATION
    WORKLOAD_BALANCE --> SCORE_CALCULATION
    PREFERENCE_ANALYSIS --> SCORE_CALCULATION
    
    SCORE_CALCULATION --> RANKING
    RANKING --> CONFLICT_RESOLUTION
    CONFLICT_RESOLUTION --> OPTIMIZATION
    
    OPTIMIZATION --> ASSIGNMENT_NOTIFICATION
    ASSIGNMENT_NOTIFICATION --> CONFIRMATION_REQUEST
    CONFIRMATION_REQUEST --> REJECTION_HANDLING
    REJECTION_HANDLING --> REPLACEMENT_SEARCH
    
    %% 스타일링
    classDef request fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef interviewers fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef matching fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef algorithm fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef notification fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class JOB_POST,SCHEDULE,REQUIREMENTS request
    class HR_INTERVIEWERS,DEPARTMENT_INTERVIEWERS,EXTERNAL_INTERVIEWERS interviewers
    class AVAILABILITY_CHECK,SKILL_MATCHING,WORKLOAD_BALANCE,PREFERENCE_ANALYSIS matching
    class SCORE_CALCULATION,RANKING,CONFLICT_RESOLUTION,OPTIMIZATION algorithm
    class ASSIGNMENT_NOTIFICATION,CONFIRMATION_REQUEST,REJECTION_HANDLING,REPLACEMENT_SEARCH notification
```

## 데이터베이스 스키마 및 관계

```mermaid
erDiagram
    COMPANY ||--o{ JOB_POST : "has"
    JOB_POST ||--o{ APPLICATION : "receives"
    APPLICATION ||--o{ RESUME : "includes"
    APPLICATION ||--o{ INTERVIEW_EVALUATION : "evaluated_by"
    INTERVIEW_EVALUATION ||--o{ INTERVIEW_PANEL_MEMBER : "conducted_by"
    INTERVIEW_PANEL_MEMBER }o--|| COMPANY_USER : "assigned_to"
    JOB_POST ||--o{ INTERVIEW_SCHEDULE : "scheduled_for"
    INTERVIEW_SCHEDULE ||--o{ INTERVIEW_PANEL_ASSIGNMENT : "assigned_to"
    
    COMPANY {
        int id PK
        string name
        string industry
        string size
        datetime created_at
    }
    
    JOB_POST {
        int id PK
        int company_id FK
        string title
        text description
        string requirements
        string status
        datetime created_at
        datetime published_at
    }
    
    APPLICATION {
        int id PK
        int job_post_id FK
        int applicant_id
        string status
        datetime applied_at
        text cover_letter
    }
    
    RESUME {
        int id PK
        int application_id FK
        text content
        string file_path
        json analysis_result
        datetime uploaded_at
    }
    
    INTERVIEW_EVALUATION {
        int id PK
        int application_id FK
        int panel_member_id FK
        string interview_type
        json scores
        text feedback
        datetime conducted_at
    }
    
    INTERVIEW_PANEL_MEMBER {
        int id PK
        int evaluation_id FK
        int user_id FK
        string role
        string status
    }
    
    COMPANY_USER {
        int id PK
        int company_id FK
        string name
        string email
        string department
        string role
        json skills
    }
    
    INTERVIEW_SCHEDULE {
        int id PK
        int job_post_id FK
        datetime scheduled_at
        string location
        string type
        string status
    }
    
    INTERVIEW_PANEL_ASSIGNMENT {
        int id PK
        int schedule_id FK
        int job_post_id FK
        string assignment_type
        string status
        datetime created_at
    }
```

## 알림 시스템 아키텍처

```mermaid
graph TB
    subgraph "📨 알림 트리거"
        APPLICATION_SUBMITTED[지원서 제출]
        INTERVIEW_SCHEDULED[면접 일정]
        EVALUATION_COMPLETED[평가 완료]
        STATUS_CHANGED[상태 변경]
    end
    
    subgraph "🎯 알림 타겟"
        APPLICANT[지원자]
        HR_TEAM[HR 팀]
        INTERVIEWER[면접관]
        MANAGER[관리자]
    end
    
    subgraph "📱 알림 채널"
        EMAIL[이메일]
        SMS[SMS]
        PUSH[푸시 알림]
        IN_APP[앱 내 알림]
    end
    
    subgraph "⚙️ 알림 엔진"
        TEMPLATE_ENGINE[템플릿 엔진]
        PERSONALIZATION[개인화]
        SCHEDULING[스케줄링]
        RETRY_MECHANISM[재시도 메커니즘]
    end
    
    subgraph "📊 알림 추적"
        DELIVERY_STATUS[전송 상태]
        OPEN_RATE[열람률]
        CLICK_RATE[클릭률]
        RESPONSE_RATE[응답률]
    end
    
    APPLICATION_SUBMITTED --> APPLICANT
    INTERVIEW_SCHEDULED --> INTERVIEWER
    EVALUATION_COMPLETED --> HR_TEAM
    STATUS_CHANGED --> MANAGER
    
    APPLICANT --> EMAIL
    HR_TEAM --> PUSH
    INTERVIEWER --> SMS
    MANAGER --> IN_APP
    
    EMAIL --> TEMPLATE_ENGINE
    SMS --> PERSONALIZATION
    PUSH --> SCHEDULING
    IN_APP --> RETRY_MECHANISM
    
    TEMPLATE_ENGINE --> DELIVERY_STATUS
    PERSONALIZATION --> OPEN_RATE
    SCHEDULING --> CLICK_RATE
    RETRY_MECHANISM --> RESPONSE_RATE
    
    %% 스타일링
    classDef trigger fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef target fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef channel fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef engine fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef tracking fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class APPLICATION_SUBMITTED,INTERVIEW_SCHEDULED,EVALUATION_COMPLETED,STATUS_CHANGED trigger
    class APPLICANT,HR_TEAM,INTERVIEWER,MANAGER target
    class EMAIL,SMS,PUSH,IN_APP channel
    class TEMPLATE_ENGINE,PERSONALIZATION,SCHEDULING,RETRY_MECHANISM engine
    class DELIVERY_STATUS,OPEN_RATE,CLICK_RATE,RESPONSE_RATE tracking
```

## 성능 최적화 및 확장성

### 🚀 성능 최적화
- **데이터베이스 인덱싱**: 자주 조회되는 필드에 인덱스 생성
- **캐싱 전략**: Redis를 활용한 세션 및 자주 조회되는 데이터 캐싱
- **비동기 처리**: 대용량 알림 발송을 위한 비동기 큐 시스템
- **CDN 활용**: 정적 자원 및 파일 배포 최적화

### 📈 확장성 고려사항
- **마이크로서비스 분리**: 채용공고, 지원자, 면접 관리 서비스 분리
- **로드 밸런싱**: 다수의 서버 인스턴스로 트래픽 분산
- **데이터베이스 샤딩**: 대용량 데이터 처리를 위한 수평 확장
- **메시지 큐**: 비동기 작업 처리를 위한 RabbitMQ/Kafka 활용
