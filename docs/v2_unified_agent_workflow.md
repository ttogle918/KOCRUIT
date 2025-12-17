# Unified AI Agent Orchestration Workflow

현재 시스템의 Agent들은 모듈화되어 독립적으로 실행되지만, 논리적으로는 하나의 채용 프로세스 흐름을 따릅니다.
이 다이어그램은 모든 Sub-Graph(하위 워크플로우)를 **'Recruitment Supervisor (채용 감독관)'**라는 상위 Agent가 제어한다고 가정했을 때의 **통합 연결 그래프(SuperGraph)**입니다.

```mermaid
stateDiagram-v2
    direction TB

    [*] --> Supervisor: New Application Event

    state "👮 Recruitment Supervisor Agent<br/>(Main Router & Orchestrator)" as Supervisor

    state "📄 Document Processing Phase" as Phase1 {
        state "Resume Highlight Workflow" as Highlight
        state "Resume Analysis" as Analysis
        
        [*] --> Highlight
        Highlight --> Analysis
        Analysis --> [*]
    }

    state "📝 Interview Prep Phase" as Phase2 {
        state "Question Gen Workflow" as QGen
        state "Evaluation Criteria Gen" as Criteria
        
        [*] --> QGen
        QGen --> Criteria
        Criteria --> [*]
    }

    state "🎤 Active Interview Phase<br/>(Real-time Audio/Video Processing)" as Phase3 {
        state "AI Interview Workflow" as AIInterview
        
        [*] --> AIInterview
    }

    state "📊 Post-Hiring Phase" as Phase4 {
        state "Insights Workflow" as Insights
        state "Final Report Gen" as Report
        
        [*] --> Insights
        Insights --> Report
        Report --> [*]
    }

    %% Main Flow Connections
    Supervisor --> Phase1: 1. 서류 접수 시
    Phase1 --> Supervisor: 분석 데이터 반환

    Supervisor --> Phase2: 2. 서류 합격 시
    Phase2 --> Supervisor: 질문지 및 평가표 반환

    Supervisor --> Phase3: 3. 면접 일정 도래 시
    Phase3 --> Supervisor: 면접 로그 및 점수 반환

    Supervisor --> Phase4: 4. 채용 시즌 종료 시
    Phase4 --> Supervisor: 전체 통계 및 인사이트

    Supervisor --> [*]: Process Complete
```

## 워크플로우 연결 설명

1.  **Supervisor (Router Node)**
    *   FastAPI 백엔드 또는 상위 LangGraph 노드가 이 역할을 수행합니다.
    *   지원자의 현재 상태(서류 접수, 면접 대기, 면접 완료 등)를 판단하여 적절한 하위 그래프(Sub-graph)를 호출합니다.

2.  **Phase 1: Document Processing**
    *   **Input:** 이력서 텍스트
    *   **Workflow:** `highlight_workflow.py` 실행 -> 이력서 핵심 하이라이팅 및 결격 사유 필터링.

3.  **Phase 2: Interview Prep**
    *   **Input:** Phase 1의 분석 결과 + 채용 공고
    *   **Workflow:** `interview_question_workflow.py` 실행 -> 맞춤형 질문 및 체크리스트 생성.

4.  **Phase 3: Active Interview**
    *   **Input:** Phase 2의 질문지 + 실시간 오디오 스트림
    *   **Workflow:** `ai_interview_workflow.py` 실행 -> 실시간 상호작용 및 채점.

5.  **Phase 4: Post-Hiring**
    *   **Input:** Phase 3의 누적 데이터
    *   **Workflow:** `ai_insights_workflow.py` 실행 -> 채용 프로세스 개선점 및 통계 도출.


