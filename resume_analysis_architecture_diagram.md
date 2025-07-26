# 이력서 분석 도구 아키텍처 다이어그램

## 시스템 아키텍처 개요

이 다이어그램은 이력서 분석 시스템에서 사용자 명령을 분석하고 여러 전문 도구로 분배하는 워크플로우를 보여줍니다.

```mermaid
graph TD
    A[사용자 입력] --> B[router state]
    B --> C[사용자 입력 분석]
    C --> D[graph_agent]
    D --> E[analyze_complex_command message]
    
    E --> F{명령 유형 분석}
    
    F -->|이력서 분석| G[highlight_tool]
    F -->|이력서 분석| H[comprehensive_analysis_tool]
    F -->|이력서 분석| I[detailed_analysis_tool]
    F -->|이력서 분석| J[competitiveness_comparison_tool]
    F -->|이력서 분석| K[keyword_matching_tool]
    
    F -->|폼 작성/수정| L[form_fill_tool]
    F -->|폼 작성/수정| M[form_field_tool]
    F -->|폼 작성/수정| N[form_field_improve_tool]
    F -->|폼 작성/수정| O[spell_check_tool]
    F -->|폼 작성/수정| P[weight_extraction_tool]
    
    G --> Q[END]
    H --> Q
    I --> Q
    J --> Q
    K --> Q
    L --> Q
    M --> Q
    N --> Q
    O --> Q
    P --> Q
    
    %% 스타일 정의
    classDef router fill:#9B59B6,stroke:#8E44AD,stroke-width:2px,color:#fff
    classDef analysis fill:#E67E22,stroke:#D35400,stroke-width:2px,color:#fff
    classDef command fill:#3498DB,stroke:#2980B9,stroke-width:2px,color:#fff
    classDef tool fill:#27AE60,stroke:#229954,stroke-width:2px,color:#fff
    classDef end fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff
    
    class B router
    class C,D analysis
    class E,F command
    class G,H,I,J,K,L,M,N,O,P tool
    class Q end
```

## 상세 구성 요소 설명

### 1. 라우터 (Router)
- **역할**: 사용자 입력을 받아 시스템의 초기 진입점 역할
- **기능**: 입력 상태를 분석하고 적절한 처리 경로로 라우팅

### 2. 사용자 입력 분석 (User Input Analysis)
- **역할**: 사용자의 자연어 명령을 구조화된 형태로 변환
- **기능**: 의도 파악 및 필요한 도구 식별

### 3. 그래프 에이전트 (Graph Agent)
- **역할**: 분석 결과를 바탕으로 다음 처리 단계 결정
- **기능**: 워크플로우 제어 및 도구 선택 로직

### 4. 복합 명령 분석기 (Analyze Complex Command)
- **역할**: 복잡한 사용자 명령을 심층 분석
- **기능**: 명령을 세분화하여 적절한 도구로 분배

### 5. 이력서 분석 도구들

#### 핵심 분석 도구
- **highlight_tool**: 이력서 내용 형광펜 하이라이팅
- **comprehensive_analysis_tool**: 이력서 종합 분석 리포트
- **detailed_analysis_tool**: 이력서 상세 분석
- **competitiveness_comparison_tool**: 경쟁력 비교 분석
- **keyword_matching_tool**: 키워드 매칭 분석

#### 폼 관련 도구
- **form_fill_tool**: 채용공고 폼 자동 작성
- **form_field_tool**: 폼 필드 수정
- **form_field_improve_tool**: 폼 필드 개선
- **spell_check_tool**: 맞춤법 검사
- **weight_extraction_tool**: 가중치 추출

## 데이터 흐름

1. **입력 단계**: 사용자가 자연어로 이력서 분석 요청
2. **분석 단계**: 시스템이 명령을 분석하고 의도 파악
3. **라우팅 단계**: 적절한 도구 또는 도구 조합 선택
4. **실행 단계**: 선택된 도구들이 병렬 또는 순차 실행
5. **종료 단계**: 모든 도구의 결과를 통합하여 최종 응답

## 기술적 특징

- **모듈화**: 각 도구는 독립적으로 개발 및 테스트 가능
- **캐싱**: Redis를 통한 성능 최적화
- **확장성**: 새로운 도구 추가 용이
- **에러 처리**: 각 단계별 예외 처리 및 복구 메커니즘
- **비동기 처리**: 대용량 데이터 처리 시 성능 향상 