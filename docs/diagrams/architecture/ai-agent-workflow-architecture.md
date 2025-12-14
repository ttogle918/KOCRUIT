# 🤖 AI Agent 워크플로우 상세 아키텍처

## LangGraph 기반 AI Agent 시스템 전체 구조

```mermaid
graph TB
    subgraph "🎯 메인 AI Agent (main.py)"
        GRAPH_AGENT[Graph Agent<br/>라우터 및 오케스트레이터]
        CHATBOT_AGENT[Chatbot Agent<br/>대화형 AI]
        EVALUATION_AGENT[Application Evaluation Agent<br/>지원서 평가]
        INTERVIEW_AGENT[AI Interview Workflow<br/>면접 AI]
        QUESTION_AGENT[Interview Question Workflow<br/>질문 생성 AI]
    end
    
    subgraph "🔄 LangGraph 워크플로우"
        STATE_GRAPH[StateGraph<br/>상태 관리]
        NODES[워크플로우 노드들<br/>각종 처리 단계]
        EDGES[엣지 연결<br/>워크플로우 제어]
        COMPILER[워크플로우 컴파일러<br/>실행 엔진]
    end
    
    subgraph "🔧 AI 도구들 (Tools)"
        RESUME_TOOLS[이력서 분석 도구]
        INTERVIEW_TOOLS[면접 도구]
        EVALUATION_TOOLS[평가 도구]
        QUESTION_TOOLS[질문 생성 도구]
        RAG_TOOLS[RAG 시스템 도구]
    end
    
    subgraph "🧠 AI 모델 및 서비스"
        OPENAI_GPT4[OpenAI GPT-4<br/>메인 LLM]
        EMBEDDING_MODEL[Embedding Model<br/>텍스트 벡터화]
        CHROMA_VECTOR[ChromaDB<br/>벡터 검색]
        MEDIAPIPE[MediaPipe<br/>비디오 분석]
        SPEECH_REC[Speech Recognition<br/>음성 인식]
    end
    
    subgraph "💾 데이터 관리"
        MEMORY_MANAGER[Memory Manager<br/>대화 메모리]
        CACHE_MANAGER[Cache Manager<br/>LLM 결과 캐싱]
        VECTOR_STORE[Vector Store<br/>임베딩 저장]
        SESSION_STORE[Session Store<br/>세션 데이터]
    end
    
    %% 연결 관계
    GRAPH_AGENT --> STATE_GRAPH
    CHATBOT_AGENT --> STATE_GRAPH
    EVALUATION_AGENT --> STATE_GRAPH
    INTERVIEW_AGENT --> STATE_GRAPH
    QUESTION_AGENT --> STATE_GRAPH
    
    STATE_GRAPH --> NODES
    NODES --> EDGES
    EDGES --> COMPILER
    
    COMPILER --> RESUME_TOOLS
    COMPILER --> INTERVIEW_TOOLS
    COMPILER --> EVALUATION_TOOLS
    COMPILER --> QUESTION_TOOLS
    COMPILER --> RAG_TOOLS
    
    RESUME_TOOLS --> OPENAI_GPT4
    INTERVIEW_TOOLS --> MEDIAPIPE
    EVALUATION_TOOLS --> OPENAI_GPT4
    QUESTION_TOOLS --> OPENAI_GPT4
    RAG_TOOLS --> EMBEDDING_MODEL
    
    EMBEDDING_MODEL --> CHROMA_VECTOR
    OPENAI_GPT4 --> MEMORY_MANAGER
    MEDIAPIPE --> CACHE_MANAGER
    SPEECH_REC --> VECTOR_STORE
    CHROMA_VECTOR --> SESSION_STORE
    
    %% 스타일링
    classDef agent fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef workflow fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef tools fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef ai fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef data fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class GRAPH_AGENT,CHATBOT_AGENT,EVALUATION_AGENT,INTERVIEW_AGENT,QUESTION_AGENT agent
    class STATE_GRAPH,NODES,EDGES,COMPILER workflow
    class RESUME_TOOLS,INTERVIEW_TOOLS,EVALUATION_TOOLS,QUESTION_TOOLS,RAG_TOOLS tools
    class OPENAI_GPT4,EMBEDDING_MODEL,CHROMA_VECTOR,MEDIAPIPE,SPEECH_REC ai
    class MEMORY_MANAGER,CACHE_MANAGER,VECTOR_STORE,SESSION_STORE data
```

## 이력서 분석 AI Agent 워크플로우

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as Frontend
    participant B as Backend
    participant O as Orchestrator
    participant W as HighlightWorkflow
    participant T as Tools
    participant L as LLM
    participant C as Cache
    participant D as Database
    
    U->>F: 이력서 분석 요청
    F->>B: POST /api/v2/resume/analyze
    B->>O: 분석 요청 전달
    O->>C: 캐시 확인
    
    alt 캐시 히트
        C->>O: 캐시된 결과 반환
        O->>B: 결과 반환
        B->>F: 응답 전송
        F->>U: 분석 결과 표시
    else 캐시 미스
        O->>W: 하이라이팅 워크플로우 시작
        W->>T: 형광펜 분석 요청
        
        par 병렬 분석 실행
            T->>L: 종합 분석 LLM 호출
            L->>T: 분석 결과 반환
            T->>O: 종합 분석 결과 반환
        and
            T->>L: 상세 분석 LLM 호출
            L->>T: 분석 결과 반환
            T->>O: 상세 분석 결과 반환
        and
            T->>L: 경쟁력 비교 LLM 호출
            L->>T: 분석 결과 반환
            T->>O: 경쟁력 비교 결과 반환
        and
            T->>L: 키워드 매칭 LLM 호출
            L->>T: 분석 결과 반환
            T->>O: 키워드 매칭 결과 반환
        end
        
        O->>O: 결과 통합 및 요약
        O->>C: 결과 캐싱
        O->>D: 분석 결과 저장
        O->>B: 통합 결과 반환
        B->>F: 응답 전송
        F->>U: 분석 결과 표시
    end
```

## 면접 AI Agent 워크플로우

```mermaid
graph TD
    subgraph "🎤 AI 면접 워크플로우"
        INIT_SESSION[세션 초기화<br/>initialize_session]
        GEN_QUESTIONS[시나리오 질문 생성<br/>generate_scenario_questions]
        START_ANALYSIS[실시간 분석 시작<br/>start_real_time_analysis]
        AUDIO_PROCESS[오디오 분석<br/>process_audio_analysis]
        BEHAVIOR_PROCESS[행동 분석<br/>process_behavior_analysis]
        GAME_TEST[게임 테스트<br/>process_game_test]
        CALC_SCORE[최종 점수 계산<br/>calculate_final_score]
    end
    
    subgraph "🔧 면접 도구들"
        VIDEO_ANALYSIS[비디오 분석 도구<br/>MediaPipe]
        AUDIO_ANALYSIS[오디오 분석 도구<br/>Speech Recognition]
        EMOTION_ANALYSIS[감정 분석 도구<br/>OpenAI]
        GAME_ENGINE[게임 엔진<br/>인지능력 테스트]
    end
    
    subgraph "📊 평가 시스템"
        SCORE_CALCULATOR[점수 계산기<br/>가중치 적용]
        RANKING_SYSTEM[순위 시스템<br/>상대적 평가]
        FEEDBACK_GENERATOR[피드백 생성기<br/>개선 제안]
    end
    
    INIT_SESSION --> GEN_QUESTIONS
    GEN_QUESTIONS --> START_ANALYSIS
    START_ANALYSIS --> AUDIO_PROCESS
    AUDIO_PROCESS --> BEHAVIOR_PROCESS
    BEHAVIOR_PROCESS --> GAME_TEST
    GAME_TEST --> CALC_SCORE
    
    AUDIO_PROCESS --> AUDIO_ANALYSIS
    BEHAVIOR_PROCESS --> VIDEO_ANALYSIS
    BEHAVIOR_PROCESS --> EMOTION_ANALYSIS
    GAME_TEST --> GAME_ENGINE
    
    CALC_SCORE --> SCORE_CALCULATOR
    SCORE_CALCULATOR --> RANKING_SYSTEM
    RANKING_SYSTEM --> FEEDBACK_GENERATOR
    
    %% 스타일링
    classDef workflow fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef tools fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef evaluation fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class INIT_SESSION,GEN_QUESTIONS,START_ANALYSIS,AUDIO_PROCESS,BEHAVIOR_PROCESS,GAME_TEST,CALC_SCORE workflow
    class VIDEO_ANALYSIS,AUDIO_ANALYSIS,EMOTION_ANALYSIS,GAME_ENGINE tools
    class SCORE_CALCULATOR,RANKING_SYSTEM,FEEDBACK_GENERATOR evaluation
```

## 질문 생성 AI Agent 워크플로우

```mermaid
graph TD
    subgraph "❓ 질문 생성 워크플로우"
        ANALYZE_REQUIREMENTS[요구사항 분석<br/>analyze_requirements]
        ANALYZE_PORTFOLIO[포트폴리오 분석<br/>analyze_portfolio]
        ANALYZE_RESUME[이력서 분석<br/>analyze_resume]
        GENERATE_QUESTIONS[질문 생성<br/>generate_questions]
        EVALUATE_QUESTIONS[질문 평가<br/>evaluate_questions]
        INTEGRATE_RESULTS[결과 통합<br/>result_integrator]
    end
    
    subgraph "🔍 분석 도구들"
        REQUIREMENT_PARSER[요구사항 파서<br/>채용공고 분석]
        PORTFOLIO_ANALYZER[포트폴리오 분석기<br/>프로젝트 평가]
        RESUME_ANALYZER[이력서 분석기<br/>경험 추출]
        QUESTION_GENERATOR[질문 생성기<br/>AI 질문 생성]
    end
    
    subgraph "📝 질문 타입들"
        TECHNICAL_QUESTIONS[기술 질문<br/>전문성 평가]
        BEHAVIORAL_QUESTIONS[행동 질문<br/>경험 기반]
        SITUATIONAL_QUESTIONS[상황 질문<br/>문제 해결]
        CULTURAL_QUESTIONS[문화 적합성 질문<br/>가치관 평가]
    end
    
    ANALYZE_REQUIREMENTS --> ANALYZE_PORTFOLIO
    ANALYZE_PORTFOLIO --> ANALYZE_RESUME
    ANALYZE_RESUME --> GENERATE_QUESTIONS
    GENERATE_QUESTIONS --> EVALUATE_QUESTIONS
    EVALUATE_QUESTIONS --> INTEGRATE_RESULTS
    
    ANALYZE_REQUIREMENTS --> REQUIREMENT_PARSER
    ANALYZE_PORTFOLIO --> PORTFOLIO_ANALYZER
    ANALYZE_RESUME --> RESUME_ANALYZER
    GENERATE_QUESTIONS --> QUESTION_GENERATOR
    
    QUESTION_GENERATOR --> TECHNICAL_QUESTIONS
    QUESTION_GENERATOR --> BEHAVIORAL_QUESTIONS
    QUESTION_GENERATOR --> SITUATIONAL_QUESTIONS
    QUESTION_GENERATOR --> CULTURAL_QUESTIONS
    
    %% 스타일링
    classDef workflow fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef tools fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef questions fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class ANALYZE_REQUIREMENTS,ANALYZE_PORTFOLIO,ANALYZE_RESUME,GENERATE_QUESTIONS,EVALUATE_QUESTIONS,INTEGRATE_RESULTS workflow
    class REQUIREMENT_PARSER,PORTFOLIO_ANALYZER,RESUME_ANALYZER,QUESTION_GENERATOR tools
    class TECHNICAL_QUESTIONS,BEHAVIORAL_QUESTIONS,SITUATIONAL_QUESTIONS,CULTURAL_QUESTIONS questions
```

## RAG 시스템 및 메모리 관리

```mermaid
graph TB
    subgraph "🧠 RAG 시스템"
        RETRIEVAL[검색 엔진<br/>Relevance Search]
        AUGMENTATION[증강 생성<br/>Context Augmentation]
        GENERATION[응답 생성<br/>Response Generation]
    end
    
    subgraph "💾 벡터 저장소"
        CHROMA_DB[ChromaDB<br/>벡터 데이터베이스]
        EMBEDDING_INDEX[임베딩 인덱스<br/>Fast Similarity Search]
        METADATA_STORE[메타데이터 저장소<br/>문서 정보]
    end
    
    subgraph "🔄 메모리 관리"
        CONVERSATION_MEMORY[대화 메모리<br/>Context Tracking]
        SESSION_MEMORY[세션 메모리<br/>Temporary Storage]
        PERSISTENT_MEMORY[영구 메모리<br/>Long-term Storage]
    end
    
    subgraph "🔍 검색 및 필터링"
        SEMANTIC_SEARCH[의미적 검색<br/>Semantic Search]
        KEYWORD_FILTER[키워드 필터<br/>Keyword Filtering]
        RELEVANCE_RANKING[관련성 순위<br/>Relevance Ranking]
    end
    
    RETRIEVAL --> SEMANTIC_SEARCH
    SEMANTIC_SEARCH --> CHROMA_DB
    CHROMA_DB --> EMBEDDING_INDEX
    EMBEDDING_INDEX --> METADATA_STORE
    
    AUGMENTATION --> KEYWORD_FILTER
    KEYWORD_FILTER --> RELEVANCE_RANKING
    RELEVANCE_RANKING --> GENERATION
    
    CONVERSATION_MEMORY --> SESSION_MEMORY
    SESSION_MEMORY --> PERSISTENT_MEMORY
    PERSISTENT_MEMORY --> CHROMA_DB
    
    %% 스타일링
    classDef rag fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef vector fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef memory fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef search fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class RETRIEVAL,AUGMENTATION,GENERATION rag
    class CHROMA_DB,EMBEDDING_INDEX,METADATA_STORE vector
    class CONVERSATION_MEMORY,SESSION_MEMORY,PERSISTENT_MEMORY memory
    class SEMANTIC_SEARCH,KEYWORD_FILTER,RELEVANCE_RANKING search
```

## AI Agent 성능 최적화 및 모니터링

```mermaid
graph TB
    subgraph "⚡ 성능 최적화"
        CACHING_STRATEGY[캐싱 전략<br/>Redis + LLM Cache]
        PARALLEL_PROCESSING[병렬 처리<br/>asyncio + Threading]
        BATCH_PROCESSING[배치 처리<br/>Bulk Operations]
        LOAD_BALANCING[로드 밸런싱<br/>Request Distribution]
    end
    
    subgraph "📊 모니터링 시스템"
        METRICS_COLLECTION[메트릭 수집<br/>Performance Metrics]
        LOG_ANALYSIS[로그 분석<br/>Error Tracking]
        ALERT_SYSTEM[알림 시스템<br/>Anomaly Detection]
        DASHBOARD[대시보드<br/>Real-time Monitoring]
    end
    
    subgraph "🔧 자동화 관리"
        AUTO_SCALING[자동 스케일링<br/>Dynamic Scaling]
        HEALTH_CHECKS[헬스 체크<br/>Service Health]
        FAILOVER[장애 복구<br/>Failover Mechanism]
        BACKUP_RECOVERY[백업 복구<br/>Data Recovery]
    end
    
    subgraph "🛡️ 보안 및 안정성"
        RATE_LIMITING[속도 제한<br/>API Rate Limiting]
        AUTHENTICATION[인증 시스템<br/>JWT + OAuth]
        ENCRYPTION[암호화<br/>Data Encryption]
        AUDIT_LOGGING[감사 로깅<br/>Audit Trail]
    end
    
    CACHING_STRATEGY --> METRICS_COLLECTION
    PARALLEL_PROCESSING --> LOG_ANALYSIS
    BATCH_PROCESSING --> ALERT_SYSTEM
    LOAD_BALANCING --> DASHBOARD
    
    METRICS_COLLECTION --> AUTO_SCALING
    LOG_ANALYSIS --> HEALTH_CHECKS
    ALERT_SYSTEM --> FAILOVER
    DASHBOARD --> BACKUP_RECOVERY
    
    AUTO_SCALING --> RATE_LIMITING
    HEALTH_CHECKS --> AUTHENTICATION
    FAILOVER --> ENCRYPTION
    BACKUP_RECOVERY --> AUDIT_LOGGING
    
    %% 스타일링
    classDef optimization fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef monitoring fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef automation fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef security fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class CACHING_STRATEGY,PARALLEL_PROCESSING,BATCH_PROCESSING,LOAD_BALANCING optimization
    class METRICS_COLLECTION,LOG_ANALYSIS,ALERT_SYSTEM,DASHBOARD monitoring
    class AUTO_SCALING,HEALTH_CHECKS,FAILOVER,BACKUP_RECOVERY automation
    class RATE_LIMITING,AUTHENTICATION,ENCRYPTION,AUDIT_LOGGING security
```

## AI Agent 확장성 및 마이크로서비스 아키텍처

### 🏗️ 마이크로서비스 분리 전략
- **이력서 분석 서비스**: 독립적인 이력서 분석 전용 서비스
- **면접 AI 서비스**: 면접 관련 AI 처리 전용 서비스
- **질문 생성 서비스**: 면접 질문 생성 전용 서비스
- **평가 서비스**: 지원자 평가 및 점수 계산 전용 서비스

### 🔄 서비스 간 통신
- **RESTful API**: 동기 통신을 위한 REST API
- **Message Queue**: 비동기 통신을 위한 RabbitMQ/Kafka
- **gRPC**: 고성능 서비스 간 통신
- **GraphQL**: 유연한 데이터 쿼리를 위한 GraphQL

### 📈 확장성 고려사항
- **수평 확장**: 다수의 AI Agent 인스턴스 운영
- **수직 확장**: 더 강력한 하드웨어 리소스 활용
- **지역별 배포**: 글로벌 사용자를 위한 지역별 서비스 배포
- **캐싱 계층**: 다층 캐싱으로 성능 최적화
