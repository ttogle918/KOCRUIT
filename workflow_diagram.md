# 업무 흐름도 다이어그램

## 1. 이력서 분석 업무 흐름도

```mermaid
flowchart TD
    A[📄 이력서 업로드] --> B[📝 텍스트 추출 및 파싱]
    B --> C[🔄 핵심 분석 도구 실행]
    
    C --> D[📋 핵심 분석<br/>comprehensive_analysis_tool.py<br/>- 이력서 요약<br/>- 직무 적합성 점수<br/>- 종합 평가]
    C --> E[🔬 상세 분석<br/>detailed_analysis_tool.py<br/>- 경험 깊이/폭 분석<br/>- 성장 가능성<br/>- 문제해결 능력]
    C --> F[💡 임팩트 포인트<br/>impact_points_tool.py<br/>- 강점 Top3<br/>- 주의사항 Top2<br/>- 면접 포인트 Top2]
    C --> G[👥 지원자 비교<br/>applicant_comparison<br/>- 같은 공고 지원자 비교<br/>- 상대적 경쟁력 분석]
    
    D --> H[📊 핵심 분석 결과]
    E --> H
    F --> H
    G --> H
    
    H --> I[💾 종합 분석 결과 저장]
    I --> J[🔄 다음 단계: 하이라이트 분석]
    
    style A fill:#e3f2fd
    style B fill:#e3f2fd
    style D fill:#fff3e0
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#fff3e0
    style H fill:#e8f5e8
    style I fill:#e8f5e8
```

## 2. 하이라이트 시스템 업무 흐름도

```mermaid
flowchart TD
    A[📊 종합 분석 결과] --> B[🎨 하이라이트 워크플로우 시작]
    
    B --> C[🔍 텍스트 분석]
    C --> D[🏷️ 카테고리 분류]
    
    D --> E[🟡 Value Fit 검출]
    D --> F[🔵 Skill Fit 검출]
    D --> G[🔴 Risk Factors 검출]
    D --> H[🟠 Negative Tone 검출]
    D --> I[🟣 Experience/Results 검출]
    
    E --> J[📝 하이라이트 생성]
    F --> J
    G --> J
    H --> J
    I --> J
    
    J --> K[💾 하이라이트 결과 저장]
    K --> L[📊 다음 단계: 고급 분석]
    
    style A fill:#e8f5e8
    style B fill:#fff3e0
    style J fill:#fff3e0
    style K fill:#e8f5e8
```

## 3. 고급 분석 업무 흐름도

```mermaid
flowchart TD
    A[📊 종합 분석 + 하이라이트 결과] --> B[🔍 고급 분석 시작]
    
    B --> C[🏆 경쟁력 분석<br/>Market Comparison]
    B --> D[🔑 키워드 매칭<br/>keyword_matching_tool.py]
    
    C --> E[📈 경쟁력 점수 계산]
    D --> E
    
    E --> F[📊 고급 분석 결과 저장]
    F --> G[📈 다음 단계: 통계 분석]
    
    style A fill:#e8f5e8
    style B fill:#f3e5f5
    style E fill:#f3e5f5
    style F fill:#e8f5e8
```

## 4. 통계 분석 업무 흐름도

```mermaid
flowchart TD
    A[📊 모든 분석 결과] --> B[📈 통계 분석 시작]
    
    B --> C[👥 지원자 인구통계 수집]
    B --> D[📊 지원 트렌드 분석]
    B --> E[📈 성과 지표 수집]
    
    C --> F[📊 데이터 처리]
    D --> F
    E --> F
    
    F --> G[📊 연령대 분석]
    F --> H[🎓 교육 수준 분석]
    F --> I[🗺️ 지역 분포 분석]
    F --> J[🏆 자격증 분석]
    
    G --> K[📊 시각화 생성]
    H --> K
    I --> K
    J --> K
    
    K --> L[📊 막대 차트]
    K --> M[🥧 파이 차트]
    K --> N[📈 선 차트]
    K --> O[🗺️ 지역별 지도]
    
    L --> P[🤖 AI 분석]
    M --> P
    N --> P
    O --> P
    
    P --> Q[💡 인사이트 생성]
    Q --> R[📊 통계 결과 저장]
    
    style A fill:#e8f5e8
    style B fill:#e8f5e8
    style K fill:#e8f5e8
    style P fill:#e8f5e8
    style R fill:#e8f5e8
```

## 5. 전체 시스템 통합 업무 흐름도

```mermaid
flowchart TD
    A[👤 사용자] --> B[📄 이력서 업로드]
    B --> C[📝 텍스트 파싱]
    C --> D[🔄 핵심 분석 도구 실행]
    
    D --> E[📋 핵심 분석<br/>comprehensive_analysis_tool.py]
    D --> F[🔬 상세 분석<br/>detailed_analysis_tool.py]
    D --> G[💡 임팩트 포인트<br/>impact_points_tool.py]
    D --> H[👥 지원자 비교<br/>applicant_comparison]
    
    E --> I[📊 종합 분석 결과]
    F --> I
    G --> I
    H --> I
    
    I --> J[🎨 하이라이트 분석]
    J --> K[🏷️ 색상별 분류]
    K --> L[📝 하이라이트 생성]
    
    L --> M[🔍 고급 분석]
    M --> N[🏆 경쟁력 분석]
    N --> O[🔑 키워드 매칭]
    
    O --> P[📊 통계 분석]
    P --> Q[👥 인구통계]
    Q --> R[📈 트렌드 분석]
    R --> S[📊 시각화]
    S --> T[🤖 AI 인사이트]
    
    T --> U[💾 결과 저장]
    U --> V[📊 최종 리포트]
    V --> W[👤 사용자에게 전달]
    
    %% 데이터 저장소
    X[(📊 Resume DB)] --> C
    Y[(🔄 Analysis Cache)] --> U
    Z[(🔍 Vector Store)] --> M
    
    %% 스타일링
    style A fill:#ffebee
    style C fill:#e3f2fd
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#fff3e0
    style H fill:#fff3e0
    style I fill:#e8f5e8
    style L fill:#fff3e0
    style O fill:#f3e5f5
    style T fill:#e8f5e8
    style V fill:#ffebee
    style X fill:#ffebee
    style Y fill:#ffebee
    style Z fill:#ffebee
```

## 6. 데이터 흐름 상세 다이어그램

```mermaid
flowchart LR
    subgraph "📥 입력 데이터"
        A[이력서 파일]
        B[채용공고 정보]
        C[회사 정보]
    end
    
    subgraph "🔄 처리 과정"
        D[텍스트 추출]
        E[핵심 분석 도구]
        F[하이라이트]
        G[고급 분석]
        H[통계 처리]
    end
    
    subgraph "💾 데이터 저장소"
        I[(Resume DB)]
        J[(Redis Cache)]
        K[(ChromaDB)]
    end
    
    subgraph "📤 출력 결과"
        L[분석 리포트]
        M[하이라이트 결과]
        N[통계 차트]
        O[AI 인사이트]
    end
    
    A --> D
    B --> E
    C --> E
    D --> E
    E --> F
    F --> G
    G --> H
    
    E --> I
    F --> J
    G --> K
    H --> J
    
    I --> L
    J --> M
    K --> O
    H --> N
    
    style A fill:#e3f2fd
    style D fill:#e3f2fd
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#f3e5f5
    style H fill:#e8f5e8
    style I fill:#ffebee
    style J fill:#ffebee
    style K fill:#ffebee
    style L fill:#e8f5e8
    style M fill:#fff3e0
    style N fill:#e8f5e8
    style O fill:#f3e5f5
```

## 업무 흐름 설명

### 1. 이력서 분석 단계
- **입력**: 이력서 파일 업로드
- **처리**: 텍스트 추출 → **4개 핵심 분석 도구 실행**
  - **핵심 분석**: 이력서 요약, 직무 적합성 점수, 종합 평가
  - **상세 분석**: 경험 깊이/폭 분석, 성장 가능성, 문제해결 능력
  - **임팩트 포인트**: 강점 Top3, 주의사항 Top2, 면접 포인트 Top2
  - **지원자 비교**: 같은 공고 지원자 비교, 상대적 경쟁력 분석
- **출력**: 종합 분석 결과

### 2. 하이라이트 분석 단계
- **입력**: 종합 분석 결과
- **처리**: 텍스트 분석 → 카테고리 분류 → 하이라이트 생성
- **출력**: 색상별 하이라이트 결과

### 3. 고급 분석 단계
- **입력**: 종합 분석 + 하이라이트 결과
- **처리**: 경쟁력 분석 → 키워드 매칭
- **출력**: 고급 분석 결과

### 4. 통계 분석 단계
- **입력**: 모든 분석 결과
- **처리**: 데이터 수집 → 처리 → 시각화 → AI 인사이트
- **출력**: 통계 차트 및 인사이트

### 5. 데이터 저장 및 관리
- **Resume DB**: 구조화된 이력서 데이터
- **Redis Cache**: 분석 결과 캐시
- **ChromaDB**: 벡터 저장소 (고급 분석용)

이 흐름도를 통해 각 단계별로 어떤 데이터가 입력되고, 어떤 처리가 이루어지며, 어떤 결과가 출력되는지 명확하게 파악할 수 있습니다. 