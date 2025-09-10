# 이력서 분석 시스템 - 백엔드 아키텍처 다이어그램

## 🚪 백엔드 API 라우터 구조

```mermaid
graph TB
    subgraph "🌐 FastAPI Main Server"
        MAIN[main.py<br/>FastAPI 애플리케이션]
        API_ROUTER[api.py<br/>메인 API 라우터]
    end
    
    subgraph "🔗 API 라우터들"
        AUTH[auth.py<br/>인증/인가]
        APPLICATIONS[applications.py<br/>지원자 관리]
        RESUMES[resumes.py<br/>이력서 관리]
        HIGHLIGHT[highlight_api.py<br/>형광펜 분석]
        STATISTICS[statistics_analysis.py<br/>통계 분석]
        AI_EVALUATE[ai_evaluate.py<br/>AI 평가]
        INTERVIEW[interview_question.py<br/>면접 질문]
        REALTIME[realtime_interview.py<br/>실시간 면접]
        COMPANIES[companies.py<br/>회사 관리]
        JOBS[company_jobs.py<br/>채용공고]
        SCHEDULES[schedules.py<br/>일정 관리]
        NOTIFICATIONS[notifications.py<br/>알림]
    end
    
    subgraph "🎼 Agent Layer"
        ORCH[resume_orchestrator.py<br/>상위 오케스트레이터]
        WORKFLOW[highlight_workflow.py<br/>하이라이팅 워크플로우]
    end
    
    subgraph "🔧 Analysis Tools"
        HIGHLIGHT_TOOL[highlight_tool.py<br/>형광펜 도구]
        COMPREHENSIVE[comprehensive_analysis_tool.py<br/>종합 분석]
        DETAILED[detailed_analysis_tool.py<br/>상세 분석]
        COMPETITIVENESS[competitiveness_comparison_tool.py<br/>경쟁력 비교]
        KEYWORD[keyword_matching_tool.py<br/>키워드 매칭]
    end
    
    subgraph "💾 Data Layer"
        DB[(PostgreSQL<br/>메인 DB)]
        REDIS[(Redis<br/>캐시)]
        CHROMA[(ChromaDB<br/>벡터 DB)]
    end
    
    MAIN --> API_ROUTER
    API_ROUTER --> AUTH
    API_ROUTER --> APPLICATIONS
    API_ROUTER --> RESUMES
    API_ROUTER --> HIGHLIGHT
    API_ROUTER --> STATISTICS
    API_ROUTER --> AI_EVALUATE
    API_ROUTER --> INTERVIEW
    API_ROUTER --> REALTIME
    API_ROUTER --> COMPANIES
    API_ROUTER --> JOBS
    API_ROUTER --> SCHEDULES
    API_ROUTER --> NOTIFICATIONS
    
    HIGHLIGHT --> ORCH
    STATISTICS --> ORCH
    AI_EVALUATE --> ORCH
    
    ORCH --> WORKFLOW
    ORCH --> HIGHLIGHT_TOOL
    ORCH --> COMPREHENSIVE
    ORCH --> DETAILED
    ORCH --> COMPETITIVENESS
    ORCH --> KEYWORD
    
    WORKFLOW --> HIGHLIGHT_TOOL
    
    ORCH --> DB
    ORCH --> REDIS
    HIGHLIGHT_TOOL --> CHROMA
    
    %% 스타일링
    classDef main fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef router fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef agent fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef tools fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    
    class MAIN,API_ROUTER main
    class AUTH,APPLICATIONS,RESUMES,HIGHLIGHT,STATISTICS,AI_EVALUATE,INTERVIEW,REALTIME,COMPANIES,JOBS,SCHEDULES,NOTIFICATIONS router
    class ORCH,WORKFLOW agent
    class HIGHLIGHT_TOOL,COMPREHENSIVE,DETAILED,COMPETITIVENESS,KEYWORD tools
    class DB,REDIS,CHROMA data
```

## 🎼 ResumeOrchestrator 상위 오케스트레이터 아키텍처

```mermaid
graph TB
    subgraph "🎼 ResumeOrchestrator"
        ORCH_MAIN[ResumeOrchestrator<br/>메인 클래스]
        ORCH_CACHE[Redis Cache<br/>@redis_cache 데코레이터]
        ORCH_TOOLS[Tools Dictionary<br/>분석 도구 매핑]
        ORCH_SUMMARY[_generate_analysis_summary<br/>결과 요약 생성]
    end
    
    subgraph "📊 분석 메서드들"
        ANALYZE_COMPLETE[analyze_resume_complete<br/>완전한 분석]
        ANALYZE_SELECTIVE[analyze_resume_selective<br/>선택적 분석]
    end
    
    subgraph "🔧 분석 도구들"
        TOOL_HIGHLIGHT[highlight_resume_content<br/>형광펜 하이라이팅]
        TOOL_COMPREHENSIVE[generate_comprehensive_analysis_report<br/>종합 분석]
        TOOL_DETAILED[generate_detailed_analysis<br/>상세 분석]
        TOOL_COMPETITIVENESS[generate_competitiveness_comparison<br/>경쟁력 비교]
        TOOL_KEYWORD[generate_keyword_matching_analysis<br/>키워드 매칭]
    end
    
    subgraph "💾 데이터 관리"
        CACHE_MANAGER[Redis Cache Manager<br/>LLM 결과 캐싱]
        DB_CONNECTOR[Database Connector<br/>분석 결과 저장]
    end
    
    subgraph "📤 결과 구조"
        METADATA[metadata<br/>분석 메타데이터]
        RESULTS[results<br/>분석 결과]
        ERRORS[errors<br/>오류 정보]
        SUMMARY[summary<br/>요약 정보]
    end
    
    ORCH_MAIN --> ORCH_CACHE
    ORCH_MAIN --> ORCH_TOOLS
    ORCH_MAIN --> ORCH_SUMMARY
    
    ORCH_MAIN --> ANALYZE_COMPLETE
    ORCH_MAIN --> ANALYZE_SELECTIVE
    
    ANALYZE_COMPLETE --> TOOL_HIGHLIGHT
    ANALYZE_COMPLETE --> TOOL_COMPREHENSIVE
    ANALYZE_COMPLETE --> TOOL_DETAILED
    ANALYZE_COMPLETE --> TOOL_COMPETITIVENESS
    ANALYZE_COMPLETE --> TOOL_KEYWORD
    
    ANALYZE_SELECTIVE --> TOOL_HIGHLIGHT
    ANALYZE_SELECTIVE --> TOOL_COMPREHENSIVE
    ANALYZE_SELECTIVE --> TOOL_DETAILED
    ANALYZE_SELECTIVE --> TOOL_COMPETITIVENESS
    ANALYZE_SELECTIVE --> TOOL_KEYWORD
    
    ORCH_CACHE --> CACHE_MANAGER
    ORCH_SUMMARY --> DB_CONNECTOR
    
    ANALYZE_COMPLETE --> METADATA
    ANALYZE_COMPLETE --> RESULTS
    ANALYZE_COMPLETE --> ERRORS
    ANALYZE_COMPLETE --> SUMMARY
    
    %% 스타일링
    classDef orchestrator fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef methods fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef tools fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef results fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class ORCH_MAIN,ORCH_CACHE,ORCH_TOOLS,ORCH_SUMMARY orchestrator
    class ANALYZE_COMPLETE,ANALYZE_SELECTIVE methods
    class TOOL_HIGHLIGHT,TOOL_COMPREHENSIVE,TOOL_DETAILED,TOOL_COMPETITIVENESS,TOOL_KEYWORD tools
    class CACHE_MANAGER,DB_CONNECTOR data
    class METADATA,RESULTS,ERRORS,SUMMARY results
```

## 🎨 형광펜 하이라이팅 시스템 워크플로우

```mermaid
flowchart TD
    START([이력서 분석 요청]) --> API[highlight_api.py<br/>API 엔드포인트]
    API --> ORCH[ResumeOrchestrator<br/>오케스트레이터]
    ORCH --> WORKFLOW[HighlightWorkflow<br/>LangGraph 워크플로우]
    
    subgraph "🎨 색상별 분석 노드들"
        YELLOW_NODE[🟡 인재상 매칭<br/>Value Fit Node]
        BLUE_NODE[🔵 기술 매칭<br/>Skill Fit Node]
        RED_NODE[🔴 위험 요소<br/>Risk Node]
        GRAY_NODE[⚪ 추상표현<br/>Vague Node]
        PURPLE_NODE[🟣 경험/성과<br/>Experience Node]
    end
    
    subgraph "🤖 LLM 처리"
        LLM_CALL[OpenAI GPT-4<br/>LLM 호출]
        PROMPT_ENG[프롬프트 엔지니어링<br/>카테고리별 프롬프트]
        CACHE[Redis Cache<br/>결과 캐싱]
    end
    
    subgraph "📊 결과 처리"
        VALIDATE[결과 검증<br/>JSON 파싱]
        MERGE[결과 병합<br/>중복 제거]
        FORMAT[형식 변환<br/>프론트엔드 호환]
    end
    
    subgraph "💾 데이터 저장"
        DB_SAVE[PostgreSQL<br/>분석 결과 저장]
        VECTOR_SAVE[ChromaDB<br/>벡터 저장]
        CACHE_SAVE[Redis<br/>캐시 저장]
    end
    
    WORKFLOW --> YELLOW_NODE
    WORKFLOW --> BLUE_NODE
    WORKFLOW --> RED_NODE
    WORKFLOW --> GRAY_NODE
    WORKFLOW --> PURPLE_NODE
    
    YELLOW_NODE --> LLM_CALL
    BLUE_NODE --> LLM_CALL
    RED_NODE --> LLM_CALL
    GRAY_NODE --> LLM_CALL
    PURPLE_NODE --> LLM_CALL
    
    LLM_CALL --> PROMPT_ENG
    LLM_CALL --> CACHE
    
    YELLOW_NODE --> VALIDATE
    BLUE_NODE --> VALIDATE
    RED_NODE --> VALIDATE
    GRAY_NODE --> VALIDATE
    PURPLE_NODE --> VALIDATE
    
    VALIDATE --> MERGE
    MERGE --> FORMAT
    
    FORMAT --> DB_SAVE
    FORMAT --> VECTOR_SAVE
    FORMAT --> CACHE_SAVE
    
    %% 스타일링
    classDef start fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef workflow fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef nodes fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef llm fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef storage fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    
    class START start
    class API,ORCH,WORKFLOW workflow
    class YELLOW_NODE,BLUE_NODE,RED_NODE,GRAY_NODE,PURPLE_NODE nodes
    class LLM_CALL,PROMPT_ENG,CACHE llm
    class VALIDATE,MERGE,FORMAT process
    class DB_SAVE,VECTOR_SAVE,CACHE_SAVE storage
```

## 📊 지원자 통계시각화 시스템

```mermaid
graph TB
    subgraph "📊 Statistics Analysis API"
        STATS_API[statistics_analysis.py<br/>통계 분석 API]
        STATS_ENDPOINTS[통계 엔드포인트들<br/>- 지원자 통계<br/>- 교육 수준<br/>- 연령대별<br/>- 지역별]
    end
    
    subgraph "📈 통계 계산 유틸리티"
        APPLICANT_STATS[applicantStats.js<br/>지원자 통계 유틸리티]
        EDUCATION_STATS[getEducationStats<br/>교육 수준 통계]
        AGE_STATS[getAgeGroupStats<br/>연령대별 통계]
        GENDER_STATS[getGenderStats<br/>성별 통계]
        PROVINCE_STATS[getProvinceStats<br/>지역별 통계]
        CERT_STATS[getCertificateCountStats<br/>자격증 통계]
        TREND_STATS[getApplicationTrendStats<br/>지원 트렌드]
    end
    
    subgraph "🎨 시각화 컴포넌트"
        CHART_COMPONENTS[차트 컴포넌트들<br/>- BarChart<br/>- PieChart<br/>- LineChart<br/>- ProvinceMapChart]
        STATS_ANALYSIS[StatisticsAnalysis<br/>통계 분석 컴포넌트]
        PROVINCE_MAP[ProvinceMapChart<br/>지역별 지도]
    end
    
    subgraph "📋 데이터 소스"
        APPLICATIONS_DB[applications 테이블<br/>지원자 데이터]
        RESUME_DB[resume 테이블<br/>이력서 데이터]
        SPEC_DB[spec 테이블<br/>상세 정보]
    end
    
    subgraph "🔄 데이터 처리"
        DATA_EXTRACT[데이터 추출<br/>SQL 쿼리]
        DATA_TRANSFORM[데이터 변환<br/>통계 계산]
        DATA_AGGREGATE[데이터 집계<br/>카테고리별 분류]
    end
    
    STATS_API --> STATS_ENDPOINTS
    STATS_ENDPOINTS --> APPLICANT_STATS
    
    APPLICANT_STATS --> EDUCATION_STATS
    APPLICANT_STATS --> AGE_STATS
    APPLICANT_STATS --> GENDER_STATS
    APPLICANT_STATS --> PROVINCE_STATS
    APPLICANT_STATS --> CERT_STATS
    APPLICANT_STATS --> TREND_STATS
    
    EDUCATION_STATS --> CHART_COMPONENTS
    AGE_STATS --> CHART_COMPONENTS
    GENDER_STATS --> CHART_COMPONENTS
    PROVINCE_STATS --> PROVINCE_MAP
    CERT_STATS --> CHART_COMPONENTS
    TREND_STATS --> CHART_COMPONENTS
    
    CHART_COMPONENTS --> STATS_ANALYSIS
    PROVINCE_MAP --> STATS_ANALYSIS
    
    APPLICATIONS_DB --> DATA_EXTRACT
    RESUME_DB --> DATA_EXTRACT
    SPEC_DB --> DATA_EXTRACT
    
    DATA_EXTRACT --> DATA_TRANSFORM
    DATA_TRANSFORM --> DATA_AGGREGATE
    DATA_AGGREGATE --> APPLICANT_STATS
    
    %% 스타일링
    classDef api fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef utils fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef components fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class STATS_API,STATS_ENDPOINTS api
    class APPLICANT_STATS,EDUCATION_STATS,AGE_STATS,GENDER_STATS,PROVINCE_STATS,CERT_STATS,TREND_STATS utils
    class CHART_COMPONENTS,STATS_ANALYSIS,PROVINCE_MAP components
    class APPLICATIONS_DB,RESUME_DB,SPEC_DB data
    class DATA_EXTRACT,DATA_TRANSFORM,DATA_AGGREGATE process
```

## 🔧 이력서 분석도구들 상세 구조

```mermaid
graph TB
    subgraph "🔧 Analysis Tools Layer"
        subgraph "🎨 Highlight Tool"
            HIGHLIGHT_MAIN[highlight_resume_content<br/>메인 함수]
            HIGHLIGHT_CATEGORIES[색상별 카테고리<br/>- Yellow: 인재상<br/>- Blue: 기술<br/>- Red: 위험<br/>- Gray: 추상<br/>- Purple: 경험]
            HIGHLIGHT_LLM[LLM 호출<br/>OpenAI GPT-4]
            HIGHLIGHT_CACHE[Redis 캐싱<br/>@redis_cache]
        end
        
        subgraph "📊 Comprehensive Analysis"
            COMP_MAIN[generate_comprehensive_analysis_report<br/>종합 분석]
            COMP_SCORING[직무 매칭 점수<br/>0-100 점수]
            COMP_SUMMARY[이력서 요약<br/>핵심 내용 추출]
            COMP_RECOMMEND[추천사항<br/>개선 방향]
        end
        
        subgraph "🔍 Detailed Analysis"
            DETAIL_MAIN[generate_detailed_analysis<br/>상세 분석]
            DETAIL_SKILLS[기술 스택 분석<br/>기술별 평가]
            DETAIL_EXPERIENCE[경험 분석<br/>프로젝트별 평가]
            DETAIL_ASSESSMENT[전체 평가<br/>job_fit_score]
        end
        
        subgraph "⚔️ Competitiveness Comparison"
            COMPETE_MAIN[generate_competitiveness_comparison<br/>경쟁력 비교]
            COMPETE_MARKET[시장 평균 대비<br/>경쟁력 분석]
            COMPETE_SCORE[경쟁력 점수<br/>competitiveness_score]
            COMPETE_BENCHMARK[벤치마크<br/>동종 업계 비교]
        end
        
        subgraph "🔑 Keyword Matching"
            KEYWORD_MAIN[generate_keyword_matching_analysis<br/>키워드 매칭]
            KEYWORD_EXTRACT[키워드 추출<br/>채용공고 분석]
            KEYWORD_MATCH[매칭도 계산<br/>overall_match_score]
            KEYWORD_MISSING[부족한 키워드<br/>개선 제안]
        end
    end
    
    subgraph "🤖 LLM Integration"
        LLM_ENGINE[OpenAI GPT-4<br/>Language Model]
        PROMPT_TEMPLATES[프롬프트 템플릿<br/>도구별 최적화]
        ASYNC_PROCESSING[비동기 처리<br/>asyncio]
        ERROR_HANDLING[오류 처리<br/>예외 관리]
    end
    
    subgraph "💾 Data Management"
        CACHE_SYSTEM[Redis Cache<br/>결과 캐싱]
        DB_STORAGE[PostgreSQL<br/>분석 결과 저장]
        VECTOR_STORE[ChromaDB<br/>벡터 저장소]
    end
    
    HIGHLIGHT_MAIN --> HIGHLIGHT_CATEGORIES
    HIGHLIGHT_CATEGORIES --> HIGHLIGHT_LLM
    HIGHLIGHT_LLM --> HIGHLIGHT_CACHE
    
    COMP_MAIN --> COMP_SCORING
    COMP_MAIN --> COMP_SUMMARY
    COMP_MAIN --> COMP_RECOMMEND
    
    DETAIL_MAIN --> DETAIL_SKILLS
    DETAIL_MAIN --> DETAIL_EXPERIENCE
    DETAIL_MAIN --> DETAIL_ASSESSMENT
    
    COMPETE_MAIN --> COMPETE_MARKET
    COMPETE_MAIN --> COMPETE_SCORE
    COMPETE_MAIN --> COMPETE_BENCHMARK
    
    KEYWORD_MAIN --> KEYWORD_EXTRACT
    KEYWORD_MAIN --> KEYWORD_MATCH
    KEYWORD_MAIN --> KEYWORD_MISSING
    
    HIGHLIGHT_LLM --> LLM_ENGINE
    COMP_MAIN --> LLM_ENGINE
    DETAIL_MAIN --> LLM_ENGINE
    COMPETE_MAIN --> LLM_ENGINE
    KEYWORD_MAIN --> LLM_ENGINE
    
    LLM_ENGINE --> PROMPT_TEMPLATES
    LLM_ENGINE --> ASYNC_PROCESSING
    LLM_ENGINE --> ERROR_HANDLING
    
    HIGHLIGHT_CACHE --> CACHE_SYSTEM
    COMP_MAIN --> DB_STORAGE
    DETAIL_MAIN --> DB_STORAGE
    COMPETE_MAIN --> DB_STORAGE
    KEYWORD_MAIN --> DB_STORAGE
    
    HIGHLIGHT_LLM --> VECTOR_STORE
    
    %% 스타일링
    classDef tools fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef llm fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef data fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    
    class HIGHLIGHT_MAIN,HIGHLIGHT_CATEGORIES,HIGHLIGHT_LLM,HIGHLIGHT_CACHE,COMP_MAIN,COMP_SCORING,COMP_SUMMARY,COMP_RECOMMEND,DETAIL_MAIN,DETAIL_SKILLS,DETAIL_EXPERIENCE,DETAIL_ASSESSMENT,COMPETE_MAIN,COMPETE_MARKET,COMPETE_SCORE,COMPETE_BENCHMARK,KEYWORD_MAIN,KEYWORD_EXTRACT,KEYWORD_MATCH,KEYWORD_MISSING tools
    class LLM_ENGINE,PROMPT_TEMPLATES,ASYNC_PROCESSING,ERROR_HANDLING llm
    class CACHE_SYSTEM,DB_STORAGE,VECTOR_STORE data
```

## 🔄 전체 시스템 통합 아키텍처

```mermaid
graph TB
    subgraph "🚪 API Gateway Layer"
        FASTAPI[FastAPI 서버<br/>main.py]
        API_ROUTER[API 라우터<br/>api.py]
        AUTH[auth.py<br/>인증/인가]
        APPLICATIONS[applications.py<br/>지원자 관리]
        HIGHLIGHT_API[highlight_api.py<br/>형광펜 API]
        STATS_API[statistics_analysis.py<br/>통계 API]
    end
    
    subgraph "🎼 Orchestrator Layer"
        RESUME_ORCH[ResumeOrchestrator<br/>상위 오케스트레이터]
        HIGHLIGHT_WORKFLOW[HighlightWorkflow<br/>하이라이팅 워크플로우]
        CACHE_MANAGER[Redis Cache Manager<br/>캐시 관리]
    end
    
    subgraph "🔧 Analysis Tools Layer"
        HIGHLIGHT_TOOL[highlight_tool.py<br/>형광펜 도구]
        COMPREHENSIVE_TOOL[comprehensive_analysis_tool.py<br/>종합 분석]
        DETAILED_TOOL[detailed_analysis_tool.py<br/>상세 분석]
        COMPETITIVENESS_TOOL[competitiveness_comparison_tool.py<br/>경쟁력 비교]
        KEYWORD_TOOL[keyword_matching_tool.py<br/>키워드 매칭]
    end
    
    subgraph "📊 Statistics Layer"
        APPLICANT_STATS[applicantStats.js<br/>지원자 통계]
        CHART_COMPONENTS[차트 컴포넌트들<br/>BarChart, PieChart, LineChart]
        PROVINCE_MAP[ProvinceMapChart<br/>지역별 지도]
        STATS_ANALYSIS[StatisticsAnalysis<br/>통계 분석]
    end
    
    subgraph "🤖 AI/ML Layer"
        LLM_ENGINE[OpenAI GPT-4<br/>Language Model]
        EMBEDDING_ENGINE[Embedding Engine<br/>텍스트 벡터화]
        RAG_SYSTEM[RAG System<br/>Retrieval Augmented Generation]
    end
    
    subgraph "💾 Data Layer"
        POSTGRESQL[(PostgreSQL<br/>메인 데이터베이스)]
        REDIS[(Redis<br/>캐시 & 세션)]
        CHROMADB[(ChromaDB<br/>벡터 데이터베이스)]
    end
    
    subgraph "📤 Output Layer"
        HIGHLIGHT_RESULT[형광펜 하이라이팅 결과]
        ANALYSIS_RESULT[이력서 분석 결과]
        STATS_RESULT[통계 시각화 결과]
        CACHE_RESULT[캐시된 결과]
    end
    
    %% API Gateway 연결
    FASTAPI --> API_ROUTER
    API_ROUTER --> AUTH
    API_ROUTER --> APPLICATIONS
    API_ROUTER --> HIGHLIGHT_API
    API_ROUTER --> STATS_API
    
    %% Orchestrator 연결
    HIGHLIGHT_API --> RESUME_ORCH
    STATS_API --> APPLICANT_STATS
    
    RESUME_ORCH --> HIGHLIGHT_WORKFLOW
    RESUME_ORCH --> CACHE_MANAGER
    
    %% Analysis Tools 연결
    HIGHLIGHT_WORKFLOW --> HIGHLIGHT_TOOL
    RESUME_ORCH --> COMPREHENSIVE_TOOL
    RESUME_ORCH --> DETAILED_TOOL
    RESUME_ORCH --> COMPETITIVENESS_TOOL
    RESUME_ORCH --> KEYWORD_TOOL
    
    %% Statistics 연결
    APPLICANT_STATS --> CHART_COMPONENTS
    APPLICANT_STATS --> PROVINCE_MAP
    CHART_COMPONENTS --> STATS_ANALYSIS
    PROVINCE_MAP --> STATS_ANALYSIS
    
    %% AI/ML 연결
    HIGHLIGHT_TOOL --> LLM_ENGINE
    COMPREHENSIVE_TOOL --> LLM_ENGINE
    DETAILED_TOOL --> LLM_ENGINE
    COMPETITIVENESS_TOOL --> LLM_ENGINE
    KEYWORD_TOOL --> LLM_ENGINE
    
    LLM_ENGINE --> EMBEDDING_ENGINE
    EMBEDDING_ENGINE --> RAG_SYSTEM
    
    %% Data Layer 연결
    RESUME_ORCH --> POSTGRESQL
    CACHE_MANAGER --> REDIS
    HIGHLIGHT_TOOL --> CHROMADB
    RAG_SYSTEM --> CHROMADB
    
    %% Output Layer 연결
    HIGHLIGHT_TOOL --> HIGHLIGHT_RESULT
    RESUME_ORCH --> ANALYSIS_RESULT
    STATS_ANALYSIS --> STATS_RESULT
    CACHE_MANAGER --> CACHE_RESULT
    
    %% 스타일링
    classDef gateway fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef orchestrator fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef tools fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef stats fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef ai fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef data fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef output fill:#fff8e1,stroke:#f57f17,stroke-width:2px
    
    class FASTAPI,API_ROUTER,AUTH,APPLICATIONS,HIGHLIGHT_API,STATS_API gateway
    class RESUME_ORCH,HIGHLIGHT_WORKFLOW,CACHE_MANAGER orchestrator
    class HIGHLIGHT_TOOL,COMPREHENSIVE_TOOL,DETAILED_TOOL,COMPETITIVENESS_TOOL,KEYWORD_TOOL tools
    class APPLICANT_STATS,CHART_COMPONENTS,PROVINCE_MAP,STATS_ANALYSIS stats
    class LLM_ENGINE,EMBEDDING_ENGINE,RAG_SYSTEM ai
    class POSTGRESQL,REDIS,CHROMADB data
    class HIGHLIGHT_RESULT,ANALYSIS_RESULT,STATS_RESULT,CACHE_RESULT output
```

## 🔄 데이터 플로우 시퀀스 다이어그램

```mermaid
sequenceDiagram
    participant Client as 클라이언트
    participant API as API Gateway
    participant Orch as ResumeOrchestrator
    participant Tools as Analysis Tools
    participant LLM as OpenAI GPT-4
    participant Cache as Redis Cache
    participant DB as PostgreSQL
    participant Vector as ChromaDB
    
    Client->>API: 이력서 분석 요청
    API->>Orch: 분석 요청 전달
    
    Orch->>Cache: 캐시 확인
    alt 캐시 히트
        Cache->>Orch: 캐시된 결과 반환
        Orch->>API: 결과 반환
        API->>Client: 응답 전송
    else 캐시 미스
        Orch->>Tools: 형광펜 분석 요청
        Tools->>LLM: LLM 호출
        LLM->>Tools: 분석 결과 반환
        Tools->>Vector: 벡터 저장
        Tools->>Orch: 하이라이팅 결과 반환
        
        par 병렬 분석 실행
            Orch->>Tools: 종합 분석 요청
            Tools->>LLM: LLM 호출
            LLM->>Tools: 분석 결과 반환
            Tools->>Orch: 종합 분석 결과 반환
        and
            Orch->>Tools: 상세 분석 요청
            Tools->>LLM: LLM 호출
            LLM->>Tools: 분석 결과 반환
            Tools->>Orch: 상세 분석 결과 반환
        and
            Orch->>Tools: 경쟁력 비교 요청
            Tools->>LLM: LLM 호출
            LLM->>Tools: 분석 결과 반환
            Tools->>Orch: 경쟁력 비교 결과 반환
        and
            Orch->>Tools: 키워드 매칭 요청
            Tools->>LLM: LLM 호출
            LLM->>Tools: 분석 결과 반환
            Tools->>Orch: 키워드 매칭 결과 반환
        end
        
        Orch->>Orch: 결과 통합 및 요약
        Orch->>Cache: 결과 캐싱
        Orch->>DB: 분석 결과 저장
        Orch->>API: 통합 결과 반환
        API->>Client: 응답 전송
    end
```

## 📋 컴포넌트 상세 설명

### 🎼 Orchestrator Layer
- **ResumeOrchestrator**: 전체 분석 프로세스를 조율하는 메인 컴포넌트
- **HighlightWorkflow**: LangGraph 기반의 형광펜 하이라이팅 워크플로우
- **Redis Cache**: LLM 호출 결과를 캐싱하여 성능 최적화

### 🔧 Analysis Tools Layer
- **형광펜 하이라이팅**: 색상별로 의미있는 구절을 하이라이팅
- **종합 분석**: 이력서의 전반적인 적합성과 매칭도 평가
- **상세 분석**: 구체적인 역량과 경험을 세부적으로 분석
- **경쟁력 비교**: 시장 평균 대비 경쟁력 분석
- **키워드 매칭**: 채용공고 키워드와 이력서 내용 매칭

### 📊 Statistics Layer
- **지원자 통계**: 교육 수준, 연령대별, 성별, 지역별 통계
- **차트 컴포넌트**: BarChart, PieChart, LineChart 등 시각화
- **지역별 지도**: ProvinceMapChart로 지역별 지원자 분포
- **통계 분석**: StatisticsAnalysis 컴포넌트로 통합 분석

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