# AI Agent 시스템 도식화

## 🏗️ AI Agent 시스템 전체 아키텍처

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Frontend] --> B[API 요청]
    end
    
    subgraph "Backend API Layer"
        C[FastAPI Backend] --> D[Agent API 호출]
    end
    
    subgraph "AI Agent Layer"
        E[main.py - Agent Server] --> F[Graph Agent]
        E --> G[Chatbot Agent]
        E --> H[Application Evaluation Agent]
        E --> I[AI Interview Workflow]
        E --> J[Interview Question Workflow]
        E --> K[AI Question Generation]
    end
    
    subgraph "Tools Layer"
        L[Form Tools] --> L1[form_fill_tool]
        L --> L2[form_improve_tool]
        L --> L3[form_field_tool]
        L --> L4[spell_check_tool]
        
        M[Evaluation Tools] --> M1[resume_scoring_tool]
        M --> M2[pass_reason_tool]
        M --> M3[fail_reason_tool]
        M --> M4[application_decision_tool]
        
        N[Interview Tools] --> N1[speech_recognition_tool]
        N --> N2[speaker_diarization_tool]
        N --> N3[realtime_interview_evaluation_tool]
        N --> N4[personal_question_tool]
        
        O[Utility Tools] --> O1[highlight_resume_tool]
        O --> O2[weight_extraction_tool]
        O --> O3[job_posting_tool]
        O --> O4[answer_grading_tool]
    end
    
    subgraph "External Services"
        P[OpenAI GPT-4] --> Q[Redis Cache]
        R[ChromaDB] --> S[Vector Store]
    end
    
    B --> C
    D --> E
    F --> L
    F --> M
    F --> N
    F --> O
    G --> R
    H --> M
    I --> N
    J --> N
    K --> N
    L1 --> P
    M1 --> P
    N1 --> P
    O1 --> P
    P --> Q
    G --> S
```

## 🤖 주요 에이전트 구조 및 역할

```mermaid
graph LR
    subgraph "Core Agents"
        A[main.py] --> B[Graph Agent]
        A --> C[Chatbot Agent]
        A --> D[Application Evaluation Agent]
        A --> E[AI Interview Workflow]
        A --> F[Interview Question Workflow]
        A --> G[AI Question Generation]
    end
    
    subgraph "Graph Agent (graph_agent.py)"
        B --> B1[Router]
        B --> B2[Intent Analysis]
        B --> B3[Tool Selection]
        B --> B4[Workflow Execution]
    end
    
    subgraph "Chatbot Agent (chatbot_graph.py)"
        C --> C1[Conversation Memory]
        C --> C2[RAG System]
        C --> C3[Context Processing]
        C --> C4[Response Generation]
    end
    
    subgraph "Application Evaluation Agent"
        D --> D1[resume_scoring_tool]
        D --> D2[pass_reason_tool]
        D --> D3[fail_reason_tool]
        D --> D4[application_decision_tool]
    end
    
    subgraph "AI Interview Workflow"
        E --> E1[Session Initialization]
        E --> E2[Real-time Analysis]
        E --> E3[Audio Processing]
        E --> E4[Behavior Analysis]
        E --> E5[Final Scoring]
    end
    
    subgraph "Interview Question Workflow"
        F --> F1[Requirements Analysis]
        F --> F2[Portfolio Analysis]
        F --> F3[Resume Analysis]
        F --> F4[Question Generation]
        F --> F5[Evaluation Tools]
    end
```

## 🔄 LangGraph 워크플로우 구조

```mermaid
flowchart TD
    subgraph "Graph Agent Workflow"
        A[User Input] --> B[Router]
        B --> C{Intent Analysis}
        C -->|Form Fill| D[form_fill_tool]
        C -->|Form Improve| E[form_improve_tool]
        C -->|Spell Check| F[spell_check_tool]
        C -->|Job Posting| G[job_posting_tool]
        C -->|Interview Questions| H[interview_question_tool]
        C -->|Info Request| I[info_tool]
        
        D --> J[Response]
        E --> J
        F --> J
        G --> J
        H --> J
        I --> J
    end
    
    subgraph "Application Evaluation Workflow"
        K[Application Data] --> L[resume_scoring_tool]
        L --> M[pass_reason_tool]
        M --> N[fail_reason_tool]
        N --> O[application_decision_tool]
        O --> P[Final Decision]
    end
    
    subgraph "AI Interview Workflow"
        Q[Interview Session] --> R[initialize_session]
        R --> S[generate_scenario_questions]
        S --> T[start_real_time_analysis]
        T --> U[process_audio_analysis]
        U --> V[process_behavior_analysis]
        V --> W[calculate_final_score]
    end
    
    subgraph "Interview Question Generation"
        X[Resume & Job Info] --> Y[analyze_requirements]
        Y --> Z[portfolio_analyzer]
        Z --> AA[resume_analyzer]
        AA --> BB[question_generator]
        BB --> CC[evaluation_tools]
    end
```

## 🛠️ 도구(Tools) 시스템 구조

```mermaid
graph TB
    subgraph "Form Management Tools"
        A[form_fill_tool] --> A1[폼 전체 작성]
        A --> A2[자동 필드 채우기]
        A --> A3[템플릿 기반 생성]
        
        B[form_improve_tool] --> B1[폼 개선 제안]
        B --> B2[내용 최적화]
        B --> B3[사용자 경험 개선]
        
        C[form_field_tool] --> C1[필드 상태 확인]
        C --> C2[필드 업데이트]
        C --> C3[필드 검증]
        
        D[spell_check_tool] --> D1[맞춤법 검사]
        D --> D2[문법 수정]
        D --> D3[자동 교정]
    end
    
    subgraph "Evaluation Tools"
        E[resume_scoring_tool] --> E1[이력서 점수 평가]
        E --> E2[항목별 세부 점수]
        E --> E3[가중치 적용]
        
        F[pass_reason_tool] --> F1[합격 이유 생성]
        F --> F2[강점 분석]
        F --> F3[구체적 근거]
        
        G[fail_reason_tool] --> G1[불합격 이유 생성]
        G --> G2[개선점 제시]
        G --> G3[건설적 피드백]
        
        H[application_decision_tool] --> H1[최종 판정]
        H --> H2[신뢰도 계산]
        H --> H3[결정 근거]
    end
    
    subgraph "Interview Tools"
        I[speech_recognition_tool] --> I1[음성 인식]
        I --> I2[텍스트 변환]
        I --> I3[실시간 처리]
        
        J[speaker_diarization_tool] --> J1[화자 분리]
        J --> J2[6명 구분]
        J --> J3[시간별 매핑]
        
        K[realtime_interview_evaluation_tool] --> K1[실시간 평가]
        K --> K2[점수 계산]
        K --> K3[피드백 생성]
        
        L[personal_question_tool] --> L1[개인화 질문]
        L --> L2[이력서 기반]
        L --> L3[맞춤형 생성]
    end
    
    subgraph "Utility Tools"
        M[highlight_resume_tool] --> M1[이력서 하이라이트]
        M --> M2[키워드 강조]
        M --> M3[관련성 표시]
        
        N[weight_extraction_tool] --> N1[가중치 추출]
        N --> N2[채용공고 분석]
        N --> N3[중요도 계산]
        
        O[job_posting_tool] --> O1[채용공고 추천]
        O --> O2[내용 개선]
        O --> O3[최적화 제안]
        
        P[answer_grading_tool] --> P1[답변 채점]
        P --> P2[점수 부여]
        P --> P3[피드백 제공]
    end
```

## 🔗 데이터 흐름 및 통신 구조

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend API
    participant A as Agent Server
    participant G as Graph Agent
    participant T as Tools
    participant O as OpenAI
    participant R as Redis
    participant C as ChromaDB
    
    F->>B: API 요청
    B->>A: Agent API 호출
    A->>G: 요청 전달
    
    G->>G: 의도 분석
    G->>T: 적절한 도구 선택
    
    T->>O: LLM 호출
    O-->>T: 응답 반환
    
    T->>R: 결과 캐싱
    T-->>G: 도구 실행 결과
    G-->>A: 처리 완료
    A-->>B: 응답 반환
    B-->>F: 결과 전달
    
    Note over G,C: RAG 시스템 사용 시
    G->>C: 벡터 검색
    C-->>G: 관련 문서 반환
    G->>O: 컨텍스트 포함 LLM 호출
```

## 🧠 메모리 및 상태 관리 시스템

```mermaid
graph LR
    subgraph "Memory Management"
        A[ConversationMemory] --> A1[Redis Storage]
        A --> A2[Session Management]
        A --> A3[History Tracking]
        
        B[RAG System] --> B1[ChromaDB]
        B --> B2[Vector Embeddings]
        B --> B3[Document Search]
        
        C[State Management] --> C1[Application State]
        C --> C2[Interview State]
        C --> C3[Workflow State]
    end
    
    subgraph "Cache Strategy"
        D[Redis Cache] --> D1[Tool Results]
        D --> D2[LLM Responses]
        D --> D3[Session Data]
        
        E[Cache Keys] --> E1[User ID]
        E --> E2[Session ID]
        E --> E3[Request Hash]
    end
    
    subgraph "Data Persistence"
        F[ChromaDB] --> F1[Document Store]
        F --> F2[Embedding Index]
        F --> F3[Metadata]
        
        G[File System] --> G1[Audio Files]
        G --> G2[Log Files]
        G --> G3[Backup Data]
    end
```

## 📊 시스템 모니터링 및 로깅

```mermaid
graph TB
    subgraph "Monitoring Components"
        A[Redis Monitor] --> A1[Cache Hit Rate]
        A --> A2[Memory Usage]
        A --> A3[Connection Status]
        
        B[Performance Metrics] --> B1[Response Time]
        B --> B2[Throughput]
        B --> B3[Error Rate]
        
        C[Logging System] --> C1[Application Logs]
        C --> C2[Error Logs]
        C --> C3[Access Logs]
    end
    
    subgraph "Health Checks"
        D[Agent Health] --> D1[Tool Availability]
        D --> D2[LLM Connectivity]
        D --> D3[Memory Status]
        
        E[Service Health] --> E1[Redis Connection]
        E --> E2[ChromaDB Status]
        E --> E3[OpenAI API]
    end
    
    subgraph "Alerting"
        F[Error Alerts] --> F1[High Error Rate]
        F --> F2[Service Down]
        F --> F3[Performance Degradation]
        
        G[Performance Alerts] --> G1[Slow Response]
        G --> G2[High Memory Usage]
        G --> G3[Cache Miss Rate]
    end
```

## 🔧 확장성 및 모듈화 구조

```mermaid
graph LR
    subgraph "Modular Architecture"
        A[Core Agent] --> A1[Graph Agent]
        A --> A2[Chatbot Agent]
        A --> A3[Evaluation Agent]
        
        B[Tool Registry] --> B1[Form Tools]
        B --> B2[Evaluation Tools]
        B --> B3[Interview Tools]
        B --> B4[Utility Tools]
        
        C[Workflow Engine] --> C1[LangGraph]
        C --> C2[State Management]
        C --> C3[Conditional Logic]
    end
    
    subgraph "Extension Points"
        D[New Tools] --> D1[Tool Interface]
        D --> D2[Registration]
        D --> D3[Integration]
        
        E[New Agents] --> E1[Agent Interface]
        E --> E2[Workflow Definition]
        E --> E3[State Schema]
        
        F[New Workflows] --> F1[Graph Definition]
        F --> F2[Node Functions]
        F --> F3[Edge Logic]
    end
    
    subgraph "Configuration"
        G[Environment Config] --> G1[API Keys]
        G --> G2[Service URLs]
        G --> G3[Feature Flags]
        
        H[Tool Config] --> H1[Tool Parameters]
        H --> H2[Model Settings]
        H --> H3[Cache Settings]
    end
```

## 📈 성능 최적화 전략

```mermaid
graph TB
    subgraph "Caching Strategy"
        A[Redis Cache] --> A1[Tool Results]
        A --> A2[LLM Responses]
        A --> A3[Session Data]
        A --> A4[Vector Embeddings]
    end
    
    subgraph "Parallel Processing"
        B[Async Operations] --> B1[Tool Execution]
        B --> B2[LLM Calls]
        B --> B3[Data Processing]
        
        C[Batch Processing] --> C1[Multiple Requests]
        C --> C2[Bulk Operations]
        C --> C3[Data Aggregation]
    end
    
    subgraph "Resource Management"
        D[Memory Optimization] --> D1[Connection Pooling]
        D --> D2[Data Streaming]
        D --> D3[Garbage Collection]
        
        E[CPU Optimization] --> E1[Task Scheduling]
        E --> E2[Load Balancing]
        E --> E3[Resource Allocation]
    end
```

이 도식화를 통해 AI Agent 시스템의 전체적인 구조와 각 컴포넌트의 역할, 데이터 흐름, 그리고 확장성을 명확하게 파악할 수 있습니다. 특히 LangGraph를 활용한 워크플로우 기반의 모듈화된 아키텍처가 어떻게 구성되어 있는지 시각적으로 표현했습니다. 