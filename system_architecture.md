---
config:
  theme: base
  themeVariables:
    background: '#ffffff'
  flowchart:
    curve: linear
  layout: fixed
---
# 시스템 아키텍처 다이어그램

```mermaid
graph TB
    subgraph "📄 Resume Analysis"
        RESUME_UPLOAD[Resume Upload<br/>File Processing]
        RESUME_PARSING[Resume Parsing<br/>Text Extraction]
        RESUME_ANALYSIS[AI Analysis<br/>- Skills Extraction<br/>- Experience Analysis<br/>- Education Assessment]
        PLAGIARISM_CHECK[Plagiarism Detection<br/>Similarity Analysis]
    end
    
    subgraph "🎨 Highlight System"
        HIGHLIGHT_WORKFLOW[Highlight Workflow<br/>LangGraph Pipeline]
        COLOR_CATEGORIES[Color Categories<br/>- 🟡 Value Fit<br/>- 🔵 Skill Fit<br/>- 🔴 Risk Factors<br/>- 🟠 Negative Tone<br/>- 🟣 Experience/Results]
        HIGHLIGHT_TOOL[Highlight Tool<br/>highlight_tool.py]
    end
    
    subgraph "📈 Statistics & Analytics"
        STATS_COLLECTION[Data Collection<br/>- Applicant Demographics<br/>- Application Trends<br/>- Performance Metrics]
        STATS_PROCESSING[Data Processing<br/>- Age Groups<br/>- Education Levels<br/>- Geographic Distribution<br/>- Certificate Analysis]
        STATS_VISUALIZATION[Visualization<br/>- Bar Charts<br/>- Pie Charts<br/>- Line Charts<br/>- Province Maps]
        AI_ANALYSIS[AI Analysis<br/>- GPT-4o-mini<br/>- Trend Analysis<br/>- Insights Generation<br/>- Recommendations]
    end
    
    subgraph "🔍 Advanced Analysis"
        COMPREHENSIVE_ANALYSIS[Comprehensive Analysis<br/>comprehensive_analysis_tool.py]
        DETAILED_ANALYSIS[Detailed Analysis<br/>detailed_analysis_tool.py]
        IMPACT_POINTS[Impact Points Analysis<br/>impact_points_tool.py]
        COMPETITIVENESS[Competitiveness Analysis<br/>Market Comparison]
        KEYWORD_MATCHING[Keyword Matching<br/>keyword_matching_tool.py]
    end
    
    subgraph "💾 Data Storage"
        RESUME_DB[Resume Database<br/>Structured Data]
        ANALYSIS_CACHE[Analysis Cache<br/>Redis Storage]
        VECTOR_STORE[Vector Store<br/>ChromaDB]
    end
    
    %% Resume Analysis Flow
    RESUME_UPLOAD --> RESUME_PARSING
    RESUME_PARSING --> RESUME_ANALYSIS
    RESUME_ANALYSIS --> PLAGIARISM_CHECK
    
    %% Highlight System Flow
    RESUME_ANALYSIS --> HIGHLIGHT_WORKFLOW
    HIGHLIGHT_WORKFLOW --> COLOR_CATEGORIES
    HIGHLIGHT_WORKFLOW --> HIGHLIGHT_TOOL
    
    %% Statistics Flow
    RESUME_ANALYSIS --> STATS_COLLECTION
    STATS_COLLECTION --> STATS_PROCESSING
    STATS_PROCESSING --> STATS_VISUALIZATION
    STATS_VISUALIZATION --> AI_ANALYSIS
    
    %% Advanced Analysis
    RESUME_ANALYSIS --> COMPREHENSIVE_ANALYSIS
    RESUME_ANALYSIS --> DETAILED_ANALYSIS
    RESUME_ANALYSIS --> IMPACT_POINTS
    RESUME_ANALYSIS --> COMPETITIVENESS
    RESUME_ANALYSIS --> KEYWORD_MATCHING
    
    %% Data Storage
    RESUME_ANALYSIS --> RESUME_DB
    HIGHLIGHT_WORKFLOW --> ANALYSIS_CACHE
    RESUME_ANALYSIS --> VECTOR_STORE
    
    %% Styling
    classDef analysis fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef highlight fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef stats fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef advanced fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef storage fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class RESUME_UPLOAD,RESUME_PARSING,RESUME_ANALYSIS,PLAGIARISM_CHECK analysis
    class HIGHLIGHT_WORKFLOW,COLOR_CATEGORIES,HIGHLIGHT_TOOL highlight
    class STATS_COLLECTION,STATS_PROCESSING,STATS_VISUALIZATION,AI_ANALYSIS stats
    class COMPREHENSIVE_ANALYSIS,DETAILED_ANALYSIS,IMPACT_POINTS,COMPETITIVENESS,KEYWORD_MATCHING advanced
    class RESUME_DB,ANALYSIS_CACHE,VECTOR_STORE storage
```

## 시스템 구성 요소 설명

### 📄 Resume Analysis (이력서 분석)
- **Resume Upload**: 파일 업로드 및 처리
- **Resume Parsing**: 텍스트 추출 및 구조화
- **AI Analysis**: 스킬 추출, 경험 분석, 교육 평가
- **Plagiarism Detection**: 표절 검사 및 유사도 분석

### 🎨 Highlight System (하이라이트 시스템)
- **Highlight Workflow**: LangGraph 기반 하이라이트 파이프라인
- **Color Categories**: 5가지 색상 카테고리로 분류
  - 🟡 Value Fit: 인재상 가치
  - 🔵 Skill Fit: 기술 사용 경험
  - 🔴 Risk Factors: 직무 불일치
  - 🟠 Negative Tone: 부정 태도
  - 🟣 Experience/Results: 경험·성과·이력·경력
- **Highlight Tool**: 핵심 하이라이트 도구

### 📈 Statistics & Analytics (통계 및 분석)
- **Data Collection**: 지원자 인구통계, 지원 트렌드, 성과 지표 수집
- **Data Processing**: 연령대, 교육 수준, 지역 분포, 자격증 분석
- **Visualization**: 막대 차트, 파이 차트, 선 차트, 지역별 지도
- **AI Analysis**: GPT-4o-mini 기반 트렌드 분석 및 인사이트 생성

### 🔍 Advanced Analysis (고급 분석)
- **Comprehensive Analysis**: 종합적인 이력서 분석
- **Detailed Analysis**: 상세한 경험 및 역량 분석
- **Impact Points**: 핵심 임팩트 포인트 분석
- **Competitiveness Analysis**: 시장 경쟁력 비교 분석
- **Keyword Matching**: 키워드 매칭 및 스킬 갭 분석

### 💾 Data Storage (데이터 저장소)
- **Resume Database**: 구조화된 이력서 데이터
- **Analysis Cache**: Redis 기반 분석 결과 캐시
- **Vector Store**: ChromaDB 기반 벡터 저장소 