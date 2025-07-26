# 서류합격자 선발 AI 시스템 도식화

## 🏗️ 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[지원자 목록 페이지] --> B[AI 평가 요청]
        B --> C[평가 결과 표시]
    end
    
    subgraph "Backend API Layer"
        D[applications.py] --> E[AI 평가 API]
        E --> F[데이터 전처리]
        F --> G[Agent API 호출]
    end
    
    subgraph "AI Agent Layer"
        H[LangGraph 워크플로우] --> I[resume_scoring_tool]
        I --> J[pass_reason_tool]
        J --> K[fail_reason_tool]
        K --> L[application_decision_tool]
    end
    
    subgraph "Database Layer"
        M[Application Table] --> N[Resume Table]
        N --> O[Spec Table]
        P[Weight Table] --> Q[JobPost Table]
    end
    
    subgraph "External Services"
        R[OpenAI GPT-4] --> S[Redis Cache]
    end
    
    A --> D
    G --> H
    H --> R
    R --> S
    F --> M
    F --> N
    F --> O
    F --> P
    F --> Q
    L --> D
```

## 🔄 AI 평가 워크플로우 상세 플로우차트

```mermaid
flowchart TD
    A[지원자 서류 평가 시작] --> B{데이터 수집}
    B --> C[채용공고 정보]
    B --> D[지원자 스펙 데이터]
    B --> E[이력서 데이터]
    B --> F[가중치 데이터]
    
    C --> G[데이터 전처리]
    D --> G
    E --> G
    F --> G
    
    G --> H[LangGraph 워크플로우 시작]
    H --> I[resume_scoring_tool]
    
    I --> J{스펙 데이터 분석}
    J --> K[학력 평가]
    J --> L[경력/프로젝트 평가]
    J --> M[기술스택/자격증 평가]
    J --> N[포트폴리오/수상 평가]
    J --> O[기타 항목 평가]
    
    K --> P[총점 계산]
    L --> P
    M --> P
    N --> P
    O --> P
    
    P --> Q[pass_reason_tool]
    Q --> R{점수 >= 70?}
    R -->|Yes| S[합격 이유 생성]
    R -->|No| T[fail_reason_tool]
    
    S --> U[application_decision_tool]
    T --> U
    
    U --> V{최종 판정}
    V -->|PASSED| W[서류 합격]
    V -->|REJECTED| X[서류 불합격]
    
    W --> Y[데이터베이스 업데이트]
    X --> Y
    Y --> Z[결과 반환]
```

## 📊 평가 기준 및 점수 산정 프로세스

```mermaid
graph LR
    subgraph "평가 항목별 점수 배분"
        A[학력: 20점] --> A1[대학/전공: 10점]
        A --> A2[성적: 5점]
        A --> A3[학위: 5점]
        
        B[경력/프로젝트: 30점] --> B1[경력년수: 15점]
        B --> B2[회사규모: 10점]
        B --> B3[프로젝트규모: 5점]
        
        C[기술스택/자격증: 25점] --> C1[요구기술일치: 15점]
        C --> C2[자격증: 10점]
        
        D[포트폴리오/수상: 15점] --> D1[포트폴리오: 10점]
        D --> D2[수상경력: 5점]
        
        E[기타: 10점] --> E1[추가강점: 10점]
    end
    
    subgraph "가중치 적용"
        F[채용공고 분석] --> G[가중치 추출]
        G --> H[항목별 중요도]
        H --> I[최종 점수 계산]
    end
    
    A1 --> I
    A2 --> I
    A3 --> I
    B1 --> I
    B2 --> I
    B3 --> I
    C1 --> I
    C2 --> I
    D1 --> I
    D2 --> I
    E1 --> I
```

## 🎯 합격/불합격 판정 로직

```mermaid
flowchart TD
    A[AI 점수 입력] --> B{점수 >= 70?}
    B -->|Yes| C[합격 후보]
    B -->|No| D[불합격 후보]
    
    C --> E[pass_reason_tool 실행]
    E --> F[주요 강점 분석]
    F --> G[채용공고 일치도 분석]
    G --> H[구체적 근거 작성]
    H --> I[합격 이유 생성]
    
    D --> J[fail_reason_tool 실행]
    J --> K[주요 부족점 분석]
    K --> L[개선점 제시]
    L --> M[불합격 이유 생성]
    
    I --> N[application_decision_tool]
    M --> N
    
    N --> O{최종 검증}
    O -->|PASSED| P[document_status: PASSED]
    O -->|REJECTED| Q[document_status: REJECTED]
    
    P --> R[status: IN_PROGRESS]
    Q --> S[status: REJECTED]
    
    R --> T[데이터베이스 저장]
    S --> T
```

## 🔗 데이터 흐름 및 API 연동 구조

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend API
    participant A as AI Agent
    participant O as OpenAI
    participant R as Redis Cache
    participant D as Database
    
    F->>B: POST /applications/{id}/ai-evaluate
    B->>D: 지원자/이력서/스펙 데이터 조회
    D-->>B: 데이터 반환
    B->>B: 데이터 전처리
    B->>A: POST /evaluate-application/
    
    A->>R: 캐시 확인
    alt 캐시 히트
        R-->>A: 캐시된 결과 반환
    else 캐시 미스
        A->>O: resume_scoring_tool 호출
        O-->>A: 점수 및 세부사항 반환
        A->>O: pass_reason_tool 호출
        O-->>A: 합격 이유 생성
        A->>O: fail_reason_tool 호출
        O-->>A: 불합격 이유 생성
        A->>O: application_decision_tool 호출
        O-->>A: 최종 판정
        A->>R: 결과 캐싱
    end
    
    A-->>B: 평가 결과 반환
    B->>D: 데이터베이스 업데이트
    D-->>B: 업데이트 완료
    B-->>F: 평가 결과 반환
```

## 🛠️ 기술적 구현 세부사항

### LangGraph 워크플로우 구조
```python
# 워크플로우 노드 구성
workflow = StateGraph(ApplicationState)

# 노드 추가
workflow.add_node("score_resume", resume_scoring_tool)
workflow.add_node("generate_pass_reason", pass_reason_tool)
workflow.add_node("generate_fail_reason", fail_reason_tool)
workflow.add_node("make_decision", application_decision_tool)

# 엣지 연결
workflow.set_entry_point("score_resume")
workflow.add_edge("score_resume", "generate_pass_reason")
workflow.add_edge("generate_pass_reason", "generate_fail_reason")
workflow.add_edge("generate_fail_reason", "make_decision")
workflow.add_edge("make_decision", END)
```

### 평가 기준 상세
| 항목 | 배점 | 세부 평가 내용 |
|------|------|----------------|
| 학력 | 20점 | 대학/전공(10점), 성적(5점), 학위(5점) |
| 경력/프로젝트 | 30점 | 경력년수(15점), 회사규모(10점), 프로젝트규모(5점) |
| 기술스택/자격증 | 25점 | 요구기술일치(15점), 자격증(10점) |
| 포트폴리오/수상 | 15점 | 포트폴리오(10점), 수상경력(5점) |
| 기타 | 10점 | 추가강점(10점) |

### 합격 기준
- **합격 기준**: 70점 이상
- **불합격 기준**: 70점 미만
- **자동 판정**: AI 점수 기반 자동 합격/불합격 결정

### 캐싱 전략
- **Redis 캐싱**: 동일한 입력에 대한 중복 평가 방지
- **캐시 키**: 지원자 ID + 채용공고 ID + 평가 타임스탬프
- **TTL**: 24시간 (평가 결과의 일관성 보장)

## 📈 시스템 성능 및 확장성

### 성능 최적화
1. **Redis 캐싱**: 중복 평가 방지로 응답 시간 단축
2. **배치 처리**: 다수 지원자 동시 평가 지원
3. **비동기 처리**: 대용량 데이터 처리 시 비동기 워크플로우

### 확장성 고려사항
1. **모듈화된 도구**: 새로운 평가 기준 추가 용이
2. **가중치 시스템**: 채용공고별 맞춤 평가 가능
3. **LangGraph 워크플로우**: 복잡한 평가 로직 확장 가능

### 모니터링 및 로깅
- 각 도구별 실행 시간 측정
- 평가 정확도 추적
- 에러율 및 복구율 모니터링
- 사용자 피드백 기반 시스템 개선 