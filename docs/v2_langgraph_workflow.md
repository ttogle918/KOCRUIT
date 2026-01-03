# LangGraph Agent Workflows

이 문서는 `agent/agents` 디렉토리 내의 실제 코드를 기반으로 LangGraph 워크플로우를 시각화했습니다.

## 1. Interview Question Generation Workflow
**참조 파일:** `agent/agents/interview_question_workflow.py`
면접 질문 생성 에이전트의 상태 전이도입니다. 지원자의 포트폴리오 유무, 면접 유형에 따라 흐름이 분기됩니다.

```mermaid
stateDiagram-v2
    direction TB
    
    [*] --> AnalyzeReqs: Start (Input Resume/Job Info)
    
    state "Requirement Analysis" as AnalyzeReqs
    state "Portfolio Analysis" as Portfolio
    state "Resume Analysis" as Resume
    state "Question Generation" as QGen
    state "Evaluation Tools" as Tools
    state "Result Integration" as Integrator

    AnalyzeReqs --> Portfolio: Needs Portfolio Analysis
    AnalyzeReqs --> Resume: No Portfolio / Resume Only
    
    Portfolio --> Resume: Extract Projects & Skills
    
    Resume --> QGen: Analyzed Profile
    
    state QGen {
        state "Common Questions" as Common
        state "Personal Questions" as Personal
        state "Job-Specific" as Job
        state "Company-Specific" as Company
        
        [*] --> Common
        Common --> Personal
        Personal --> Job
        Job --> Company
    }

    QGen --> Tools: Generated Questions
    
    state Tools {
        state "Checklist" as Check
        state "Guideline" as Guide
        state "Criteria" as Crit
        
        [*] --> Check
        Check --> Guide
        Guide --> Crit
    }

    Tools --> Integrator: Evaluation Kit
    Integrator --> [*]: Final JSON Output
```

## 2. AI Interview Real-time Workflow
**참조 파일:** `agent/agents/ai_interview_workflow.py`
AI 면접 진행 시 실시간 데이터 처리 및 평가 파이프라인입니다.

```mermaid
stateDiagram-v2
    direction TB

    [*] --> InitSession: Start Session
    
    state "Session Initialization" as InitSession
    state "Scenario Generation" as Scenario
    state "Real-time Processing" as RealTime {
        state "Audio Analysis" as Audio
        state "Behavior Analysis" as Behavior
        state "Game/Test Analysis" as Game
        
        [*] --> Audio
        Audio --> Behavior
        Behavior --> Game
    }
    state "Final Scoring" as Scoring

    InitSession --> Scenario: Load Job Info
    Scenario --> RealTime: Ready for Interview
    
    RealTime --> Scoring: Session Ended
    Scoring --> [*]: Interview Report & Score
```

## 3. AI Insights Analysis Workflow
**참조 파일:** `agent/agents/ai_insights_workflow.py`
채용 데이터로부터 심층적인 인사이트를 도출하는 분석 파이프라인입니다.

```mermaid
stateDiagram-v2
    direction TB
    
    [*] --> AnalyzePatterns: Start (Input Interview Data)
    
    state "Pattern Analysis" as AnalyzePatterns
    state "Advanced Insights" as Advanced
    state "Generate Recommendations" as Recommend
    state "Create Report" as Report
    state "Error Handler" as Error

    AnalyzePatterns --> Advanced: Success
    AnalyzePatterns --> Error: Fail
    
    Advanced --> Recommend: Success
    Advanced --> Error: Fail
    
    Recommend --> Report: Success
    Recommend --> Error: Fail
    
    Report --> [*]: Final Report
    Error --> [*]: Error Log
```

## 4. Resume Highlight Workflow
**참조 파일:** `agent/agents/highlight_workflow.py`
이력서의 핵심 내용을 색상별로 하이라이팅하는 워크플로우입니다.

```mermaid
stateDiagram-v2
    direction TB
    
    [*] --> AnalyzeContent: Start (Resume Text)
    
    state "Content Analysis" as AnalyzeContent
    state "Generate Criteria" as Criteria
    state "Perform Highlighting" as Highlight
    state "Validate Results" as Validate
    state "Finalize Results" as Finalize
    
    AnalyzeContent --> Criteria: Structure Analysis
    Criteria --> Highlight: Define Color Rules
    
    state Highlight {
        state "Yellow (Value Fit)" as Yellow
        state "Red (Mismatch)" as Red
        state "Orange (Negative)" as Orange
        state "Purple (Experience)" as Purple
        state "Blue (Tech Skill)" as Blue
        
        [*] --> Yellow
        Yellow --> Red
        Red --> Orange
        Orange --> Purple
        Purple --> Blue
    }
    
    Highlight --> Validate: Raw Highlights
    Validate --> Finalize: Quality Check
    Finalize --> [*]: Final JSON
```



