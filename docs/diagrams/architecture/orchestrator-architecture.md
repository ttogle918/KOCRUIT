# 이력서 분석 시스템 - 상위 오케스트레이터 아키텍처

## 시스템 전체 구조 다이어그램

```mermaid
graph TB
    %% 사용자 인터페이스 레이어
    subgraph "🎨 Frontend Layer"
        UI[사용자 인터페이스<br/>React.js]
        API_CALL[API 호출<br/>Axios]
    end

    %% API 게이트웨이 레이어
    subgraph "🚪 API Gateway Layer"
        FASTAPI[FastAPI 서버<br/>RESTful API]
        AUTH[인증/인가<br/>JWT]
        RATE_LIMIT[Rate Limiting<br/>Redis]
    end

    %% 오케스트레이터 레이어
    subgraph "🎼 Orchestrator Layer"
        ORCH[ResumeOrchestrator<br/>메인 오케스트레이터]
        WORKFLOW[HighlightWorkflow<br/>LangGraph 워크플로우]
        CACHE[Redis Cache<br/>LLM 결과 캐싱]
    end

    %% 분석 툴 레이어
    subgraph "🔧 Analysis Tools Layer"
        subgraph "📊 Core Analysis Tools"
            COMPREHENSIVE[종합 분석 툴<br/>Comprehensive Analysis]
            DETAILED[상세 분석 툴<br/>Detailed Analysis]
            COMPETITIVENESS[경쟁력 비교 툴<br/>Competitiveness Comparison]
            KEYWORD[키워드 매칭 툴<br/>Keyword Matching]
        end
        
        subgraph "🎨 Highlighting Tools"
            HIGHLIGHT[형광펜 하이라이팅<br/>Highlight Tool]
            COLOR_ANALYSIS[색상별 분석<br/>Color-based Analysis]
        end
    end

    %% AI/ML 레이어
    subgraph "🤖 AI/ML Layer"
        LLM[OpenAI GPT-4<br/>Language Model]
        EMBEDDING[Embedding Engine<br/>텍스트 벡터화]
        RAG[RAG System<br/>Retrieval Augmented Generation]
    end

    %% 데이터 레이어
    subgraph "💾 Data Layer"
        DB[(PostgreSQL<br/>메인 데이터베이스)]
        REDIS[(Redis<br/>캐시 & 세션)]
        CHROMA[(ChromaDB<br/>벡터 데이터베이스)]
    end

    %% 외부 서비스 레이어
    subgraph "🌐 External Services"
        EMAIL[이메일 서비스<br/>SMTP]
        FILE_STORAGE[파일 저장소<br/>AWS S3]
        MONITORING[모니터링<br/>Logging & Metrics]
    end

    %% 데이터 흐름 연결
    UI --> API_CALL
    API_CALL --> FASTAPI
    FASTAPI --> AUTH
    AUTH --> RATE_LIMIT
    RATE_LIMIT --> ORCH
    
    ORCH --> WORKFLOW
    ORCH --> CACHE
    ORCH --> COMPREHENSIVE
    ORCH --> DETAILED
    ORCH --> COMPETITIVENESS
    ORCH --> KEYWORD
    ORCH --> HIGHLIGHT
    
    WORKFLOW --> COLOR_ANALYSIS
    HIGHLIGHT --> COLOR_ANALYSIS
    
    COMPREHENSIVE --> LLM
    DETAILED --> LLM
    COMPETITIVENESS --> LLM
    KEYWORD --> LLM
    COLOR_ANALYSIS --> LLM
    
    LLM --> EMBEDDING
    EMBEDDING --> RAG
    RAG --> CHROMA
    
    ORCH --> DB
    CACHE --> REDIS
    WORKFLOW --> REDIS
    
    FASTAPI --> EMAIL
    FASTAPI --> FILE_STORAGE
    FASTAPI --> MONITORING

    %% 스타일링
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef orchestrator fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef tools fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef ai fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef data fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef external fill:#fff8e1,stroke:#f57f17,stroke-width:2px

    class UI,API_CALL frontend
    class FASTAPI,AUTH,RATE_LIMIT api
    class ORCH,WORKFLOW,CACHE orchestrator
    class COMPREHENSIVE,DETAILED,COMPETITIVENESS,KEYWORD,HIGHLIGHT,COLOR_ANALYSIS tools
    class LLM,EMBEDDING,RAG ai
    class DB,REDIS,CHROMA data
    class EMAIL,FILE_STORAGE,MONITORING external
```

## 상세 워크플로우 다이어그램

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as Frontend
    participant A as API Gateway
    participant O as Orchestrator
    participant W as Workflow
    participant T as Tools
    participant L as LLM
    participant D as Database
    participant C as Cache

    U->>F: 이력서 분석 요청
    F->>A: POST /api/v2/resume/analyze
    A->>A: 인증/인가 확인
    A->>O: 분석 요청 전달
    
    O->>C: 캐시 확인
    alt 캐시 히트
        C->>O: 캐시된 결과 반환
        O->>A: 결과 반환
        A->>F: 응답 전송
        F->>U: 분석 결과 표시
    else 캐시 미스
        O->>W: 하이라이팅 워크플로우 시작
        W->>T: 형광펜 분석 요청
        T->>L: LLM 호출
        L->>T: 분석 결과 반환
        T->>W: 하이라이팅 결과 반환
        
        par 병렬 분석 실행
            O->>T: 종합 분석 요청
            T->>L: LLM 호출
            L->>T: 분석 결과 반환
            T->>O: 종합 분석 결과 반환
        and
            O->>T: 상세 분석 요청
            T->>L: LLM 호출
            L->>T: 분석 결과 반환
            T->>O: 상세 분석 결과 반환
        and
            O->>T: 경쟁력 비교 요청
            T->>L: LLM 호출
            L->>T: 분석 결과 반환
            T->>O: 경쟁력 비교 결과 반환
        and
            O->>T: 키워드 매칭 요청
            T->>L: LLM 호출
            L->>T: 분석 결과 반환
            T->>O: 키워드 매칭 결과 반환
        end
        
        O->>O: 결과 통합 및 요약
        O->>C: 결과 캐싱
        O->>D: 분석 결과 저장
        O->>A: 통합 결과 반환
        A->>F: 응답 전송
        F->>U: 분석 결과 표시
    end
```

## 🎨 형광펜 하이라이팅 시스템 상세 다이어그램

```mermaid
flowchart TD
    START([이력서 텍스트 입력]) --> ANALYZE[📊 내용 분석]
    ANALYZE --> CRITERIA[🎯 하이라이팅 기준 생성]
    
    CRITERIA --> COLOR_ANALYSIS{색상별 분석}
    
    COLOR_ANALYSIS --> YELLOW[🟡 인재상 매칭<br/>Value Fit]
    COLOR_ANALYSIS --> BLUE[🔵 기술 매칭<br/>Skill Fit]
    COLOR_ANALYSIS --> RED[🔴 위험 요소<br/>Risk]
    COLOR_ANALYSIS --> GRAY[⚪ 추상표현<br/>Vague]
    COLOR_ANALYSIS --> PURPLE[🟣 경험/성과<br/>Experience]
    
    YELLOW --> LLM_YELLOW[🤖 LLM 분석<br/>인재상 가치 매칭]
    BLUE --> LLM_BLUE[🤖 LLM 분석<br/>기술 스택 매칭]
    RED --> LLM_RED[🤖 LLM 분석<br/>위험 요소 탐지]
    GRAY --> LLM_GRAY[🤖 LLM 분석<br/>추상표현 식별]
    PURPLE --> LLM_PURPLE[🤖 LLM 분석<br/>경험/성과 추출]
    
    LLM_YELLOW --> VALIDATE[✅ 결과 검증]
    LLM_BLUE --> VALIDATE
    LLM_RED --> VALIDATE
    LLM_GRAY --> VALIDATE
    LLM_PURPLE --> VALIDATE
    
    VALIDATE --> FINALIZE[📋 최종 결과 정리]
    FINALIZE --> OUTPUT([🎨 하이라이팅 결과])
    
    %% 스타일링
    classDef start fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef analysis fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef llm fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef output fill:#fce4ec,stroke:#c2185b,stroke-width:3px
    
    class START,OUTPUT start
    class ANALYZE,CRITERIA,VALIDATE,FINALIZE process
    class YELLOW,BLUE,RED,GRAY,PURPLE analysis
    class LLM_YELLOW,LLM_BLUE,LLM_RED,LLM_GRAY,LLM_PURPLE llm
```

## 🔄 데이터 플로우 및 캐싱 전략

```mermaid
graph LR
    subgraph "📥 Input Layer"
        RESUME[이력서 텍스트]
        JOB_INFO[채용공고 정보]
        USER_CONTEXT[사용자 컨텍스트]
    end
    
    subgraph "🔍 Cache Layer"
        CACHE_KEY[캐시 키 생성<br/>resume_hash + job_id + user_id]
        CACHE_CHECK{캐시 존재?}
        CACHE_HIT[✅ 캐시 히트<br/>즉시 반환]
        CACHE_MISS[❌ 캐시 미스<br/>분석 실행]
    end
    
    subgraph "⚙️ Processing Layer"
        ORCH[오케스트레이터<br/>작업 분배]
        PARALLEL[병렬 분석 실행<br/>5개 툴 동시 실행]
        AGGREGATE[결과 통합<br/>요약 생성]
    end
    
    subgraph "💾 Storage Layer"
        DB_STORE[데이터베이스 저장<br/>PostgreSQL]
        CACHE_STORE[캐시 저장<br/>Redis TTL: 24시간]
        VECTOR_STORE[벡터 저장<br/>ChromaDB]
    end
    
    subgraph "📤 Output Layer"
        HIGHLIGHT_RESULT[형광펜 하이라이팅]
        ANALYSIS_RESULT[분석 리포트]
        SUMMARY[요약 정보]
        METRICS[성능 메트릭]
    end
    
    RESUME --> CACHE_KEY
    JOB_INFO --> CACHE_KEY
    USER_CONTEXT --> CACHE_KEY
    
    CACHE_KEY --> CACHE_CHECK
    CACHE_CHECK -->|Yes| CACHE_HIT
    CACHE_CHECK -->|No| CACHE_MISS
    
    CACHE_MISS --> ORCH
    ORCH --> PARALLEL
    PARALLEL --> AGGREGATE
    
    AGGREGATE --> DB_STORE
    AGGREGATE --> CACHE_STORE
    AGGREGATE --> VECTOR_STORE
    
    AGGREGATE --> HIGHLIGHT_RESULT
    AGGREGATE --> ANALYSIS_RESULT
    AGGREGATE --> SUMMARY
    AGGREGATE --> METRICS
    
    CACHE_HIT --> HIGHLIGHT_RESULT
    CACHE_HIT --> ANALYSIS_RESULT
    CACHE_HIT --> SUMMARY
    
    %% 스타일링
    classDef input fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef cache fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef storage fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef output fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class RESUME,JOB_INFO,USER_CONTEXT input
    class CACHE_KEY,CACHE_CHECK,CACHE_HIT,CACHE_MISS cache
    class ORCH,PARALLEL,AGGREGATE process
    class DB_STORE,CACHE_STORE,VECTOR_STORE storage
    class HIGHLIGHT_RESULT,ANALYSIS_RESULT,SUMMARY,METRICS output
```

## 🏗️ 컴포넌트 아키텍처 상세도

```mermaid
graph TB
    subgraph "🎼 ResumeOrchestrator"
        ORCH_MAIN[메인 오케스트레이터<br/>ResumeOrchestrator]
        ORCH_CACHE[캐시 관리<br/>@redis_cache]
        ORCH_TOOLS[툴 관리<br/>tools dictionary]
        ORCH_SUMMARY[결과 요약<br/>_generate_analysis_summary]
    end
    
    subgraph "🔄 HighlightWorkflow"
        WORKFLOW_GRAPH[StateGraph<br/>LangGraph]
        WORKFLOW_NODES[워크플로우 노드들<br/>5개 분석 노드]
        WORKFLOW_EDGES[엣지 연결<br/>순차 실행]
    end
    
    subgraph "🔧 Analysis Tools"
        TOOL_HIGHLIGHT[highlight_resume_content<br/>형광펜 하이라이팅]
        TOOL_COMPREHENSIVE[generate_comprehensive_analysis_report<br/>종합 분석]
        TOOL_DETAILED[generate_detailed_analysis<br/>상세 분석]
        TOOL_COMPETITIVENESS[generate_competitiveness_comparison<br/>경쟁력 비교]
        TOOL_KEYWORD[generate_keyword_matching_analysis<br/>키워드 매칭]
    end
    
    subgraph "🤖 LLM Integration"
        LLM_OPENAI[ChatOpenAI<br/>gpt-4o-mini]
        LLM_PROMPTS[프롬프트 엔지니어링<br/>카테고리별 프롬프트]
        LLM_ASYNC[비동기 처리<br/>asyncio]
        LLM_CACHE[LLM 결과 캐싱<br/>Redis]
    end
    
    subgraph "💾 Data Management"
        DB_POSTGRES[PostgreSQL<br/>메인 데이터]
        DB_REDIS[Redis<br/>캐시 & 세션]
        DB_CHROMA[ChromaDB<br/>벡터 저장소]
    end
    
    ORCH_MAIN --> ORCH_CACHE
    ORCH_MAIN --> ORCH_TOOLS
    ORCH_MAIN --> ORCH_SUMMARY
    
    ORCH_TOOLS --> TOOL_HIGHLIGHT
    ORCH_TOOLS --> TOOL_COMPREHENSIVE
    ORCH_TOOLS --> TOOL_DETAILED
    ORCH_TOOLS --> TOOL_COMPETITIVENESS
    ORCH_TOOLS --> TOOL_KEYWORD
    
    WORKFLOW_GRAPH --> WORKFLOW_NODES
    WORKFLOW_NODES --> WORKFLOW_EDGES
    
    TOOL_HIGHLIGHT --> LLM_OPENAI
    TOOL_COMPREHENSIVE --> LLM_OPENAI
    TOOL_DETAILED --> LLM_OPENAI
    TOOL_COMPETITIVENESS --> LLM_OPENAI
    TOOL_KEYWORD --> LLM_OPENAI
    
    LLM_OPENAI --> LLM_PROMPTS
    LLM_OPENAI --> LLM_ASYNC
    LLM_OPENAI --> LLM_CACHE
    
    ORCH_CACHE --> DB_REDIS
    LLM_CACHE --> DB_REDIS
    ORCH_MAIN --> DB_POSTGRES
    LLM_ASYNC --> DB_CHROMA
    
    %% 스타일링
    classDef orchestrator fill:#fff3e0,stroke:#e65100,stroke-width:3px
    classDef workflow fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef tools fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef llm fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef data fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    
    class ORCH_MAIN,ORCH_CACHE,ORCH_TOOLS,ORCH_SUMMARY orchestrator
    class WORKFLOW_GRAPH,WORKFLOW_NODES,WORKFLOW_EDGES workflow
    class TOOL_HIGHLIGHT,TOOL_COMPREHENSIVE,TOOL_DETAILED,TOOL_COMPETITIVENESS,TOOL_KEYWORD tools
    class LLM_OPENAI,LLM_PROMPTS,LLM_ASYNC,LLM_CACHE llm
    class DB_POSTGRES,DB_REDIS,DB_CHROMA data
```

## 컴포넌트 상세 설명

### 🎼 Orchestrator Layer
- **ResumeOrchestrator**: 전체 분석 프로세스를 조율하는 메인 컴포넌트
- **HighlightWorkflow**: LangGraph 기반의 형광펜 하이라이팅 워크플로우
- **Redis Cache**: LLM 호출 결과를 캐싱하여 성능 최적화

### 🔧 Analysis Tools Layer
- **종합 분석 툴**: 이력서의 전반적인 적합성과 매칭도 평가
- **상세 분석 툴**: 구체적인 역량과 경험을 세부적으로 분석
- **경쟁력 비교 툴**: 시장 평균 대비 경쟁력 분석
- **키워드 매칭 툴**: 채용공고 키워드와 이력서 내용 매칭
- **형광펜 하이라이팅**: 색상별로 의미있는 구절을 하이라이팅

### 🤖 AI/ML Layer
- **OpenAI GPT-4**: 자연어 처리 및 분석을 위한 LLM
- **Embedding Engine**: 텍스트를 벡터로 변환
- **RAG System**: 검색 기반 생성 시스템

### 💾 Data Layer
- **PostgreSQL**: 사용자, 이력서, 분석 결과 등 메인 데이터 저장
- **Redis**: 세션, 캐시, 임시 데이터 저장
- **ChromaDB**: 벡터 데이터베이스로 의미적 검색 지원

## 성능 최적화 전략

1. **캐싱 전략**: Redis를 활용한 LLM 결과 캐싱
2. **병렬 처리**: 여러 분석 툴을 동시에 실행
3. **비동기 처리**: asyncio를 활용한 비동기 워크플로우
4. **워크플로우 최적화**: LangGraph를 통한 효율적인 작업 흐름 관리

## 확장성 고려사항

- **모듈화된 툴 구조**: 새로운 분석 툴을 쉽게 추가 가능
- **마이크로서비스 준비**: 각 컴포넌트를 독립적으로 확장 가능
- **데이터베이스 분리**: 용도별 데이터베이스 분리로 성능 최적화
- **API 버전 관리**: 하위 호환성을 위한 API 버전 관리 