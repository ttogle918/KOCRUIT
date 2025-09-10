# 형광펜 AI Agent 아키텍처 다이어그램

## 🎨 형광펜 AI Agent 전체 아키텍처

```mermaid
graph TB
    subgraph "🚪 API Gateway Layer"
        HIGHLIGHT_API[highlight_api.py<br/>형광펜 API 엔드포인트]
        AGENT_API[agent/main.py<br/>AI Agent API]
    end
    
    subgraph "🎼 Orchestrator Layer"
        RESUME_ORCH[ResumeOrchestrator<br/>상위 오케스트레이터]
        HIGHLIGHT_TOOL[highlight_tool.py<br/>형광펜 도구]
    end
    
    subgraph "🔄 Workflow Layer"
        HIGHLIGHT_WORKFLOW[highlight_workflow.py<br/>LangGraph 워크플로우]
        STATE_GRAPH[StateGraph<br/>상태 관리 그래프]
    end
    
    subgraph "🎨 색상별 분석 노드들"
        YELLOW_NODE[🟡 인재상 매칭<br/>Value Fit Node]
        BLUE_NODE[🔵 기술 매칭<br/>Skill Fit Node]
        RED_NODE[🔴 위험 요소<br/>Risk Node]
        GRAY_NODE[⚪ 추상표현<br/>Vague Node]
        PURPLE_NODE[🟣 경험/성과<br/>Experience Node]
    end
    
    subgraph "🤖 LLM Processing Layer"
        LLM_ENGINE[OpenAI GPT-4<br/>Language Model]
        PROMPT_ENG[프롬프트 엔지니어링<br/>카테고리별 최적화]
        ASYNC_PROCESSING[비동기 처리<br/>asyncio]
    end
    
    subgraph "💾 Data Management"
        CACHE_SYSTEM[Redis Cache<br/>@redis_cache]
        DB_STORAGE[PostgreSQL<br/>분석 결과 저장]
        VECTOR_STORE[ChromaDB<br/>벡터 저장소]
    end
    
    subgraph "📊 결과 처리"
        VALIDATION[결과 검증<br/>JSON 파싱]
        MERGE[결과 병합<br/>중복 제거]
        FORMAT[형식 변환<br/>프론트엔드 호환]
    end
    
    %% API Gateway 연결
    HIGHLIGHT_API --> RESUME_ORCH
    AGENT_API --> HIGHLIGHT_TOOL
    
    %% Orchestrator 연결
    RESUME_ORCH --> HIGHLIGHT_TOOL
    HIGHLIGHT_TOOL --> HIGHLIGHT_WORKFLOW
    
    %% Workflow 연결
    HIGHLIGHT_WORKFLOW --> STATE_GRAPH
    STATE_GRAPH --> YELLOW_NODE
    STATE_GRAPH --> BLUE_NODE
    STATE_GRAPH --> RED_NODE
    STATE_GRAPH --> GRAY_NODE
    STATE_GRAPH --> PURPLE_NODE
    
    %% 색상별 노드 연결
    YELLOW_NODE --> LLM_ENGINE
    BLUE_NODE --> LLM_ENGINE
    RED_NODE --> LLM_ENGINE
    GRAY_NODE --> LLM_ENGINE
    PURPLE_NODE --> LLM_ENGINE
    
    %% LLM 처리 연결
    LLM_ENGINE --> PROMPT_ENG
    LLM_ENGINE --> ASYNC_PROCESSING
    
    %% 결과 처리 연결
    YELLOW_NODE --> VALIDATION
    BLUE_NODE --> VALIDATION
    RED_NODE --> VALIDATION
    GRAY_NODE --> VALIDATION
    PURPLE_NODE --> VALIDATION
    
    VALIDATION --> MERGE
    MERGE --> FORMAT
    
    %% 데이터 관리 연결
    HIGHLIGHT_TOOL --> CACHE_SYSTEM
    FORMAT --> DB_STORAGE
    LLM_ENGINE --> VECTOR_STORE
    
    %% 스타일링
    classDef api fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef orchestrator fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef workflow fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef nodes fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef llm fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef data fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef process fill:#fff8e1,stroke:#f57f17,stroke-width:2px
    
    class HIGHLIGHT_API,AGENT_API api
    class RESUME_ORCH,HIGHLIGHT_TOOL orchestrator
    class HIGHLIGHT_WORKFLOW,STATE_GRAPH workflow
    class YELLOW_NODE,BLUE_NODE,RED_NODE,GRAY_NODE,PURPLE_NODE nodes
    class LLM_ENGINE,PROMPT_ENG,ASYNC_PROCESSING llm
    class CACHE_SYSTEM,DB_STORAGE,VECTOR_STORE data
    class VALIDATION,MERGE,FORMAT process
```

## 🔄 HighlightWorkflow 상세 구조

```mermaid
graph TB
    subgraph "🔄 HighlightWorkflow - LangGraph StateGraph"
        START[시작<br/>resume_content 입력]
        
        subgraph "📊 분석 단계"
            ANALYZE_CONTENT[analyze_resume_content<br/>이력서 내용 분석]
            GENERATE_CRITERIA[generate_highlight_criteria<br/>하이라이팅 기준 생성]
        end
        
        subgraph "🎨 하이라이팅 단계"
            ADVANCED_HIGHLIGHT[perform_advanced_highlighting<br/>고급 하이라이팅]
            BASIC_HIGHLIGHT[perform_basic_highlighting<br/>기본 하이라이팅]
        end
        
        subgraph "✅ 검증 및 완료"
            VALIDATE_HIGHLIGHTS[validate_highlights<br/>결과 검증]
            FINALIZE_RESULTS[finalize_results<br/>최종 결과 정리]
        end
        
        END[완료<br/>하이라이팅 결과]
    end
    
    subgraph "🎨 색상별 분석 함수들"
        YELLOW_FUNC[get_yellow_prompt<br/>인재상 매칭 프롬프트]
        BLUE_FUNC[get_blue_prompt<br/>기술 매칭 프롬프트]
        RED_FUNC[get_red_prompt<br/>위험 요소 프롬프트]
        GRAY_FUNC[get_gray_prompt<br/>추상표현 프롬프트]
        PURPLE_FUNC[get_purple_prompt<br/>경험/성과 프롬프트]
    end
    
    subgraph "🤖 LLM 처리 함수"
        LLM_ANALYSIS[analyze_category_with_llm<br/>카테고리별 LLM 분석]
        ASYNC_RUN[run_all_analyses<br/>비동기 병렬 분석]
    end
    
    %% 워크플로우 연결
    START --> ANALYZE_CONTENT
    ANALYZE_CONTENT --> GENERATE_CRITERIA
    GENERATE_CRITERIA --> ADVANCED_HIGHLIGHT
    ADVANCED_HIGHLIGHT --> BASIC_HIGHLIGHT
    BASIC_HIGHLIGHT --> VALIDATE_HIGHLIGHTS
    VALIDATE_HIGHLIGHTS --> FINALIZE_RESULTS
    FINALIZE_RESULTS --> END
    
    %% 색상별 함수 연결
    ADVANCED_HIGHLIGHT --> YELLOW_FUNC
    ADVANCED_HIGHLIGHT --> BLUE_FUNC
    ADVANCED_HIGHLIGHT --> RED_FUNC
    ADVANCED_HIGHLIGHT --> GRAY_FUNC
    ADVANCED_HIGHLIGHT --> PURPLE_FUNC
    
    %% LLM 처리 연결
    YELLOW_FUNC --> LLM_ANALYSIS
    BLUE_FUNC --> LLM_ANALYSIS
    RED_FUNC --> LLM_ANALYSIS
    GRAY_FUNC --> LLM_ANALYSIS
    PURPLE_FUNC --> LLM_ANALYSIS
    
    LLM_ANALYSIS --> ASYNC_RUN
    
    %% 스타일링
    classDef workflow fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef analysis fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef functions fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef llm fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class START,END workflow
    class ANALYZE_CONTENT,GENERATE_CRITERIA,ADVANCED_HIGHLIGHT,BASIC_HIGHLIGHT,VALIDATE_HIGHLIGHTS,FINALIZE_RESULTS analysis
    class YELLOW_FUNC,BLUE_FUNC,RED_FUNC,GRAY_FUNC,PURPLE_FUNC functions
    class LLM_ANALYSIS,ASYNC_RUN llm
```

## 🎨 색상별 분석 노드 상세 구조

```mermaid
graph TB
    subgraph "🟡 Yellow Node - 인재상 매칭 (Value Fit)"
        YELLOW_INPUT[이력서 텍스트<br/>회사 인재상 키워드]
        YELLOW_PROMPT[get_yellow_prompt<br/>인재상 매칭 프롬프트]
        YELLOW_LLM[LLM 분석<br/>인재상 가치 매칭]
        YELLOW_OUTPUT[노란색 하이라이트<br/>인재상 매칭 결과]
    end
    
    subgraph "🔵 Blue Node - 기술 매칭 (Skill Fit)"
        BLUE_INPUT[이력서 텍스트<br/>채용공고 기술 키워드]
        BLUE_PROMPT[get_blue_prompt<br/>기술 매칭 프롬프트]
        BLUE_LLM[LLM 분석<br/>기술 스택 매칭]
        BLUE_OUTPUT[파란색 하이라이트<br/>기술 매칭 결과]
    end
    
    subgraph "🔴 Red Node - 위험 요소 (Risk)"
        RED_INPUT[이력서 텍스트<br/>위험 키워드]
        RED_PROMPT[get_red_prompt<br/>위험 요소 프롬프트]
        RED_LLM[LLM 분석<br/>위험 요소 탐지]
        RED_OUTPUT[빨간색 하이라이트<br/>위험 요소 결과]
    end
    
    subgraph "⚪ Gray Node - 추상표현 (Vague)"
        GRAY_INPUT[이력서 텍스트<br/>추상 키워드]
        GRAY_PROMPT[get_gray_prompt<br/>추상표현 프롬프트]
        GRAY_LLM[LLM 분석<br/>추상표현 식별]
        GRAY_OUTPUT[회색 하이라이트<br/>추상표현 결과]
    end
    
    subgraph "🟣 Purple Node - 경험/성과 (Experience)"
        PURPLE_INPUT[이력서 텍스트<br/>경험 키워드]
        PURPLE_PROMPT[get_purple_prompt<br/>경험/성과 프롬프트]
        PURPLE_LLM[LLM 분석<br/>경험/성과 추출]
        PURPLE_OUTPUT[보라색 하이라이트<br/>경험/성과 결과]
    end
    
    %% 각 노드 내부 연결
    YELLOW_INPUT --> YELLOW_PROMPT
    YELLOW_PROMPT --> YELLOW_LLM
    YELLOW_LLM --> YELLOW_OUTPUT
    
    BLUE_INPUT --> BLUE_PROMPT
    BLUE_PROMPT --> BLUE_LLM
    BLUE_LLM --> BLUE_OUTPUT
    
    RED_INPUT --> RED_PROMPT
    RED_PROMPT --> RED_LLM
    RED_LLM --> RED_OUTPUT
    
    GRAY_INPUT --> GRAY_PROMPT
    GRAY_PROMPT --> GRAY_LLM
    GRAY_LLM --> GRAY_OUTPUT
    
    PURPLE_INPUT --> PURPLE_PROMPT
    PURPLE_PROMPT --> PURPLE_LLM
    PURPLE_LLM --> PURPLE_OUTPUT
    
    %% 스타일링
    classDef yellow fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef blue fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef red fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    classDef gray fill:#f5f5f5,stroke:#757575,stroke-width:2px
    classDef purple fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class YELLOW_INPUT,YELLOW_PROMPT,YELLOW_LLM,YELLOW_OUTPUT yellow
    class BLUE_INPUT,BLUE_PROMPT,BLUE_LLM,BLUE_OUTPUT blue
    class RED_INPUT,RED_PROMPT,RED_LLM,RED_OUTPUT red
    class GRAY_INPUT,GRAY_PROMPT,GRAY_LLM,GRAY_OUTPUT gray
    class PURPLE_INPUT,PURPLE_PROMPT,PURPLE_LLM,PURPLE_OUTPUT purple
```

## 🤖 LLM 처리 및 프롬프트 엔지니어링

```mermaid
graph TB
    subgraph "🤖 LLM Engine"
        OPENAI_GPT4[OpenAI GPT-4<br/>gpt-4o-mini]
        TEMPERATURE[Temperature: 0.1<br/>일관성 있는 결과]
        MODEL_CONFIG[모델 설정<br/>최적화된 파라미터]
    end
    
    subgraph "📝 프롬프트 엔지니어링"
        PROMPT_TEMPLATES[프롬프트 템플릿<br/>카테고리별 최적화]
        
        subgraph "🎯 프롬프트 구조"
            ROLE_DEF[역할 정의<br/>전문가 역할 명시]
            CRITERIA[분석 기준<br/>구체적 매칭 기준]
            EXAMPLES[예시 제공<br/>실제 매칭 사례]
            OUTPUT_FORMAT[출력 형식<br/>JSON 구조 정의]
        end
    end
    
    subgraph "⚡ 비동기 처리"
        ASYNC_ENGINE[asyncio<br/>비동기 처리 엔진]
        PARALLEL_EXEC[병렬 실행<br/>5개 카테고리 동시 처리]
        CONCURRENCY[동시성 관리<br/>LLM 호출 최적화]
    end
    
    subgraph "🔍 분석 프로세스"
        TEXT_PREP[텍스트 전처리<br/>문장 분리 및 정규화]
        KEYWORD_EXTRACT[키워드 추출<br/>카테고리별 키워드]
        CONTEXT_BUILD[컨텍스트 구축<br/>이력서 + 채용공고 정보]
        LLM_CALL[LLM 호출<br/>프롬프트 전송 및 응답]
        RESPONSE_PARSE[응답 파싱<br/>JSON 구조 검증]
    end
    
    %% LLM Engine 연결
    OPENAI_GPT4 --> TEMPERATURE
    TEMPERATURE --> MODEL_CONFIG
    
    %% 프롬프트 엔지니어링 연결
    PROMPT_TEMPLATES --> ROLE_DEF
    ROLE_DEF --> CRITERIA
    CRITERIA --> EXAMPLES
    EXAMPLES --> OUTPUT_FORMAT
    
    %% 비동기 처리 연결
    ASYNC_ENGINE --> PARALLEL_EXEC
    PARALLEL_EXEC --> CONCURRENCY
    
    %% 분석 프로세스 연결
    TEXT_PREP --> KEYWORD_EXTRACT
    KEYWORD_EXTRACT --> CONTEXT_BUILD
    CONTEXT_BUILD --> LLM_CALL
    LLM_CALL --> RESPONSE_PARSE
    
    %% 전체 연결
    MODEL_CONFIG --> PROMPT_TEMPLATES
    OUTPUT_FORMAT --> ASYNC_ENGINE
    CONCURRENCY --> TEXT_PREP
    RESPONSE_PARSE --> OPENAI_GPT4
    
    %% 스타일링
    classDef llm fill:#fce4ec,stroke:#c2185b,stroke-width:3px
    classDef prompt fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef async fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class OPENAI_GPT4,TEMPERATURE,MODEL_CONFIG llm
    class PROMPT_TEMPLATES,ROLE_DEF,CRITERIA,EXAMPLES,OUTPUT_FORMAT prompt
    class ASYNC_ENGINE,PARALLEL_EXEC,CONCURRENCY async
    class TEXT_PREP,KEYWORD_EXTRACT,CONTEXT_BUILD,LLM_CALL,RESPONSE_PARSE process
```

## 💾 데이터 플로우 및 캐싱 전략

```mermaid
graph LR
    subgraph "📥 Input Layer"
        RESUME_TEXT[이력서 텍스트]
        JOBPOST_ID[채용공고 ID]
        COMPANY_ID[회사 ID]
        APPLICATION_ID[지원서 ID]
    end
    
    subgraph "🔍 Cache Layer"
        CACHE_KEY[캐시 키 생성<br/>resume_hash + jobpost_id + company_id]
        CACHE_CHECK{캐시 존재?}
        CACHE_HIT[✅ 캐시 히트<br/>즉시 반환]
        CACHE_MISS[❌ 캐시 미스<br/>분석 실행]
    end
    
    subgraph "⚙️ Processing Layer"
        WORKFLOW_EXEC[워크플로우 실행<br/>LangGraph StateGraph]
        COLOR_ANALYSIS[색상별 분석<br/>5개 카테고리 병렬 처리]
        LLM_CALLS[LLM 호출<br/>OpenAI GPT-4]
        RESULT_AGG[결과 집계<br/>통합 및 정리]
    end
    
    subgraph "💾 Storage Layer"
        REDIS_CACHE[Redis Cache<br/>TTL: 24시간]
        POSTGRES_DB[PostgreSQL<br/>분석 결과 저장]
        CHROMA_VECTOR[ChromaDB<br/>벡터 저장]
    end
    
    subgraph "📤 Output Layer"
        HIGHLIGHT_RESULT[하이라이팅 결과<br/>색상별 배열]
        METADATA[메타데이터<br/>통계 정보]
        QUALITY_SCORE[품질 점수<br/>하이라이팅 품질]
    end
    
    %% Input Layer 연결
    RESUME_TEXT --> CACHE_KEY
    JOBPOST_ID --> CACHE_KEY
    COMPANY_ID --> CACHE_KEY
    APPLICATION_ID --> CACHE_KEY
    
    %% Cache Layer 연결
    CACHE_KEY --> CACHE_CHECK
    CACHE_CHECK -->|Yes| CACHE_HIT
    CACHE_CHECK -->|No| CACHE_MISS
    
    %% Processing Layer 연결
    CACHE_MISS --> WORKFLOW_EXEC
    WORKFLOW_EXEC --> COLOR_ANALYSIS
    COLOR_ANALYSIS --> LLM_CALLS
    LLM_CALLS --> RESULT_AGG
    
    %% Storage Layer 연결
    RESULT_AGG --> REDIS_CACHE
    RESULT_AGG --> POSTGRES_DB
    LLM_CALLS --> CHROMA_VECTOR
    
    %% Output Layer 연결
    RESULT_AGG --> HIGHLIGHT_RESULT
    RESULT_AGG --> METADATA
    RESULT_AGG --> QUALITY_SCORE
    
    CACHE_HIT --> HIGHLIGHT_RESULT
    CACHE_HIT --> METADATA
    
    %% 스타일링
    classDef input fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef cache fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef storage fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef output fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class RESUME_TEXT,JOBPOST_ID,COMPANY_ID,APPLICATION_ID input
    class CACHE_KEY,CACHE_CHECK,CACHE_HIT,CACHE_MISS cache
    class WORKFLOW_EXEC,COLOR_ANALYSIS,LLM_CALLS,RESULT_AGG process
    class REDIS_CACHE,POSTGRES_DB,CHROMA_VECTOR storage
    class HIGHLIGHT_RESULT,METADATA,QUALITY_SCORE output
```

## 🔄 형광펜 AI Agent 시퀀스 다이어그램

```mermaid
sequenceDiagram
    participant Client as 클라이언트
    participant API as Highlight API
    participant Tool as Highlight Tool
    participant Workflow as Highlight Workflow
    participant LLM as OpenAI GPT-4
    participant Cache as Redis Cache
    participant DB as PostgreSQL
    participant Vector as ChromaDB
    
    Client->>API: 형광펜 분석 요청
    API->>Tool: 분석 요청 전달
    
    Tool->>Cache: 캐시 확인
    alt 캐시 히트
        Cache->>Tool: 캐시된 결과 반환
        Tool->>API: 결과 반환
        API->>Client: 응답 전송
    else 캐시 미스
        Tool->>Workflow: 워크플로우 시작
        
        Workflow->>Workflow: 이력서 내용 분석
        Workflow->>Workflow: 하이라이팅 기준 생성
        
        par 병렬 색상별 분석
            Workflow->>LLM: 노란색 (인재상) 분석
            LLM->>Workflow: 인재상 매칭 결과
        and
            Workflow->>LLM: 파란색 (기술) 분석
            LLM->>Workflow: 기술 매칭 결과
        and
            Workflow->>LLM: 빨간색 (위험) 분석
            LLM->>Workflow: 위험 요소 결과
        and
            Workflow->>LLM: 회색 (추상) 분석
            LLM->>Workflow: 추상표현 결과
        and
            Workflow->>LLM: 보라색 (경험) 분석
            LLM->>Workflow: 경험/성과 결과
        end
        
        Workflow->>Workflow: 결과 검증 및 병합
        Workflow->>Workflow: 최종 결과 정리
        
        Workflow->>Vector: 벡터 저장
        Workflow->>Tool: 하이라이팅 결과 반환
        
        Tool->>Cache: 결과 캐싱
        Tool->>DB: 분석 결과 저장
        Tool->>API: 통합 결과 반환
        API->>Client: 응답 전송
    end
```

## 📋 형광펜 AI Agent 컴포넌트 상세 설명

### 🎼 Orchestrator Layer
- **ResumeOrchestrator**: 전체 분석 프로세스를 조율하는 상위 오케스트레이터
- **highlight_tool.py**: 형광펜 분석의 메인 도구, 캐싱 및 결과 관리

### 🔄 Workflow Layer
- **highlight_workflow.py**: LangGraph 기반의 상태 관리 워크플로우
- **StateGraph**: 각 분석 단계를 순차적으로 처리하는 상태 그래프

### 🎨 색상별 분석 노드
- **🟡 Yellow (인재상 매칭)**: 회사 인재상 가치가 실제 행동/사례로 구현된 구절
- **🔵 Blue (기술 매칭)**: 채용공고의 핵심 기술과 직접적으로 매칭되는 표현
- **🔴 Red (위험 요소)**: 직무 적합성 우려, 인재상 충돌, 부정적 태도 등
- **⚪ Gray (추상표현)**: 구체성 부족, 검증 필요, 추가 질문이 필요한 표현
- **🟣 Purple (경험/성과)**: 구체적이고 의미 있는 경험, 성과, 문제 해결 등

### 🤖 LLM Processing Layer
- **OpenAI GPT-4**: 자연어 처리 및 분석을 위한 LLM
- **프롬프트 엔지니어링**: 각 카테고리별로 최적화된 프롬프트 템플릿
- **비동기 처리**: asyncio를 활용한 병렬 분석 처리

### 💾 Data Management
- **Redis Cache**: LLM 호출 결과를 캐싱하여 성능 최적화
- **PostgreSQL**: 분석 결과를 영구 저장
- **ChromaDB**: 벡터 데이터베이스로 의미적 검색 지원

## 성능 최적화 전략

1. **캐싱 전략**: Redis를 활용한 LLM 결과 캐싱 (TTL: 24시간)
2. **병렬 처리**: 5개 색상별 분석을 동시에 실행
3. **비동기 처리**: asyncio를 활용한 비동기 워크플로우
4. **워크플로우 최적화**: LangGraph를 통한 효율적인 상태 관리

## 확장성 고려사항

- **모듈화된 노드 구조**: 새로운 색상 카테고리를 쉽게 추가 가능
- **프롬프트 템플릿**: 카테고리별 프롬프트를 독립적으로 최적화
- **캐싱 전략**: 다양한 캐싱 레벨로 성능 최적화
- **벡터 저장**: 의미적 검색을 위한 벡터 데이터베이스 활용 