# 🎤 면접 시스템 상세 아키텍처

## 3단계 면접 시스템 전체 구조

```mermaid
graph TB
    subgraph "🎯 면접 시스템 진입점"
        APPLICANT[지원자]
        HR[HR 담당자]
        INTERVIEWER[면접관]
    end
    
    subgraph "1️⃣ AI 면접 (비디오 업로드)"
        AI_VIDEO[비디오 업로드]
        AI_ANALYSIS[MediaPipe 분석]
        AI_EVALUATION[종합 평가]
        AI_SCORE[점수 산출]
    end
    
    subgraph "2️⃣ 실무진 면접 (실시간 STT)"
        REALTIME_WS[WebSocket 연결]
        REALTIME_STT[실시간 음성인식]
        REALTIME_DIARIZATION[화자 분리]
        REALTIME_FEEDBACK[실시간 피드백]
    end
    
    subgraph "3️⃣ 임원진 면접 (고급 분석)"
        EXECUTIVE_WS[WebSocket 연결]
        EXECUTIVE_ANALYSIS[고급 음성 분석]
        EXECUTIVE_AI[AI 질문 생성]
        EXECUTIVE_INSIGHT[심층 인사이트]
    end
    
    subgraph "🤖 AI 처리 레이어"
        MEDIAPIPE[MediaPipe<br/>비디오 분석]
        OPENAI[OpenAI GPT-4<br/>자연어 처리]
        SPEECH_REC[Speech Recognition<br/>음성 인식]
        SPEAKER_DIAR[Speaker Diarization<br/>화자 분리]
        EMOTION_ANALYSIS[감정 분석]
    end
    
    subgraph "💾 데이터 저장소"
        MYSQL[(MySQL<br/>면접 결과)]
        REDIS[(Redis<br/>실시간 세션)]
        CHROMA[(ChromaDB<br/>벡터 데이터)]
    end
    
    subgraph "📊 평가 시스템"
        SCORING[점수 계산]
        RANKING[순위 매기기]
        REPORT[리포트 생성]
    end
    
    %% 연결 관계
    APPLICANT --> AI_VIDEO
    HR --> AI_ANALYSIS
    INTERVIEWER --> REALTIME_WS
    INTERVIEWER --> EXECUTIVE_WS
    
    AI_VIDEO --> AI_ANALYSIS
    AI_ANALYSIS --> AI_EVALUATION
    AI_EVALUATION --> AI_SCORE
    
    REALTIME_WS --> REALTIME_STT
    REALTIME_STT --> REALTIME_DIARIZATION
    REALTIME_DIARIZATION --> REALTIME_FEEDBACK
    
    EXECUTIVE_WS --> EXECUTIVE_ANALYSIS
    EXECUTIVE_ANALYSIS --> EXECUTIVE_AI
    EXECUTIVE_AI --> EXECUTIVE_INSIGHT
    
    AI_ANALYSIS --> MEDIAPIPE
    REALTIME_STT --> SPEECH_REC
    REALTIME_DIARIZATION --> SPEAKER_DIAR
    EXECUTIVE_ANALYSIS --> EMOTION_ANALYSIS
    
    MEDIAPIPE --> OPENAI
    SPEECH_REC --> OPENAI
    SPEAKER_DIAR --> OPENAI
    EMOTION_ANALYSIS --> OPENAI
    
    AI_SCORE --> MYSQL
    REALTIME_FEEDBACK --> REDIS
    EXECUTIVE_INSIGHT --> CHROMA
    
    MYSQL --> SCORING
    REDIS --> SCORING
    CHROMA --> SCORING
    SCORING --> RANKING
    RANKING --> REPORT
    
    %% 스타일링
    classDef interview fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef ai fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef data fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef evaluation fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class APPLICANT,HR,INTERVIEWER,AI_VIDEO,REALTIME_WS,EXECUTIVE_WS interview
    class MEDIAPIPE,OPENAI,SPEECH_REC,SPEAKER_DIAR,EMOTION_ANALYSIS ai
    class MYSQL,REDIS,CHROMA data
    class SCORING,RANKING,REPORT evaluation
```

## AI 면접 상세 워크플로우

```mermaid
sequenceDiagram
    participant U as 지원자
    participant F as Frontend
    participant B as Backend
    participant A as AI Agent
    participant M as MediaPipe
    participant O as OpenAI
    participant D as Database
    
    U->>F: 비디오 업로드
    F->>B: POST /api/v1/ai-interview/upload
    B->>A: 비디오 분석 요청
    A->>M: 비디오 프레임 분석
    M->>A: 표정/자세 데이터
    A->>M: 음성 추출
    M->>A: 오디오 데이터
    A->>O: 텍스트 변환 요청
    O->>A: 전사 텍스트
    A->>O: 종합 분석 요청
    O->>A: 분석 결과
    A->>D: 결과 저장
    A->>B: 분석 완료
    B->>F: 결과 반환
    F->>U: 평가 결과 표시
```

## 실시간 면접 WebSocket 통신 플로우

```mermaid
sequenceDiagram
    participant I as 면접관
    participant A as 지원자
    participant F as Frontend
    participant B as Backend
    participant WS as WebSocket
    participant STT as STT Engine
    participant AI as AI Agent
    
    I->>F: 면접 시작
    F->>WS: WebSocket 연결
    WS->>B: /ws/realtime-interview/{session_id}
    B->>WS: 연결 확인
    
    loop 면접 진행
        A->>F: 음성 입력
        F->>WS: audio_chunk 전송
        WS->>B: 실시간 오디오 처리
        B->>STT: 음성 인식
        STT->>B: 텍스트 변환
        B->>AI: 화자 분리 + 분석
        AI->>B: 실시간 평가
        B->>WS: 피드백 전송
        WS->>F: 실시간 결과
        F->>I: 면접관 화면 업데이트
        F->>A: 지원자 피드백
    end
    
    I->>F: 면접 종료
    F->>WS: session_end 전송
    WS->>B: 최종 평가 요청
    B->>AI: 종합 분석
    AI->>B: 최종 결과
    B->>WS: 최종 결과 전송
    WS->>F: 완료 알림
```

## 면접 평가 기준 및 점수 체계

```mermaid
graph TD
    subgraph "📊 AI 면접 평가 (100점 만점)"
        AI_LANG[언어능력<br/>30점]
        AI_NONVERBAL[비언어적 행동<br/>25점]
        AI_PSYCH[심리적 특성<br/>20점]
        AI_COGNITIVE[인지능력<br/>15점]
        AI_JOB[직무 적합성<br/>10점]
    end
    
    subgraph "🎙️ 실시간 면접 평가"
        REALTIME_QUALITY[답변 품질<br/>40점]
        REALTIME_KEYWORD[키워드 매칭<br/>30점]
        REALTIME_EMOTION[감정 분석<br/>20점]
        REALTIME_FLOW[답변 흐름<br/>10점]
    end
    
    subgraph "👔 임원진 면접 평가"
        EXEC_LEADERSHIP[리더십<br/>25점]
        EXEC_STRATEGY[전략적 사고<br/>25점]
        EXEC_EXPERIENCE[경험 분석<br/>25점]
        EXEC_CULTURE[문화 적합성<br/>25점]
    end
    
    subgraph "🤖 AI 분석 도구"
        MEDIAPIPE_TOOLS[MediaPipe<br/>- 표정 분석<br/>- 자세 분석<br/>- 손동작 분석]
        OPENAI_TOOLS[OpenAI GPT-4<br/>- 텍스트 분석<br/>- 감정 분석<br/>- 키워드 추출]
        SPEECH_TOOLS[Speech Recognition<br/>- 음성 인식<br/>- 화자 분리<br/>- 톤 분석]
    end
    
    AI_LANG --> MEDIAPIPE_TOOLS
    AI_NONVERBAL --> MEDIAPIPE_TOOLS
    AI_PSYCH --> OPENAI_TOOLS
    AI_COGNITIVE --> OPENAI_TOOLS
    AI_JOB --> OPENAI_TOOLS
    
    REALTIME_QUALITY --> SPEECH_TOOLS
    REALTIME_KEYWORD --> OPENAI_TOOLS
    REALTIME_EMOTION --> OPENAI_TOOLS
    REALTIME_FLOW --> SPEECH_TOOLS
    
    EXEC_LEADERSHIP --> OPENAI_TOOLS
    EXEC_STRATEGY --> OPENAI_TOOLS
    EXEC_EXPERIENCE --> OPENAI_TOOLS
    EXEC_CULTURE --> OPENAI_TOOLS
    
    %% 스타일링
    classDef ai fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef realtime fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef executive fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef tools fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class AI_LANG,AI_NONVERBAL,AI_PSYCH,AI_COGNITIVE,AI_JOB ai
    class REALTIME_QUALITY,REALTIME_KEYWORD,REALTIME_EMOTION,REALTIME_FLOW realtime
    class EXEC_LEADERSHIP,EXEC_STRATEGY,EXEC_EXPERIENCE,EXEC_CULTURE executive
    class MEDIAPIPE_TOOLS,OPENAI_TOOLS,SPEECH_TOOLS tools
```

## 면접 데이터 플로우 및 저장 구조

```mermaid
graph LR
    subgraph "📥 입력 데이터"
        VIDEO[비디오 파일]
        AUDIO[오디오 스트림]
        TEXT[텍스트 입력]
    end
    
    subgraph "🔄 처리 파이프라인"
        PREPROCESS[전처리]
        FEATURE_EXTRACT[특징 추출]
        AI_ANALYSIS[AI 분석]
        SCORE_CALC[점수 계산]
    end
    
    subgraph "💾 데이터 저장"
        MYSQL_RAW[(MySQL<br/>원본 데이터)]
        MYSQL_RESULT[(MySQL<br/>분석 결과)]
        REDIS_SESSION[(Redis<br/>세션 데이터)]
        CHROMA_VECTOR[(ChromaDB<br/>벡터 임베딩)]
    end
    
    subgraph "📊 출력 데이터"
        SCORES[점수 리포트]
        INSIGHTS[인사이트]
        RECOMMENDATIONS[추천사항]
    end
    
    VIDEO --> PREPROCESS
    AUDIO --> PREPROCESS
    TEXT --> PREPROCESS
    
    PREPROCESS --> FEATURE_EXTRACT
    FEATURE_EXTRACT --> AI_ANALYSIS
    AI_ANALYSIS --> SCORE_CALC
    
    VIDEO --> MYSQL_RAW
    AUDIO --> MYSQL_RAW
    TEXT --> MYSQL_RAW
    
    SCORE_CALC --> MYSQL_RESULT
    AI_ANALYSIS --> REDIS_SESSION
    FEATURE_EXTRACT --> CHROMA_VECTOR
    
    MYSQL_RESULT --> SCORES
    REDIS_SESSION --> INSIGHTS
    CHROMA_VECTOR --> RECOMMENDATIONS
    
    %% 스타일링
    classDef input fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef storage fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef output fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class VIDEO,AUDIO,TEXT input
    class PREPROCESS,FEATURE_EXTRACT,AI_ANALYSIS,SCORE_CALC process
    class MYSQL_RAW,MYSQL_RESULT,REDIS_SESSION,CHROMA_VECTOR storage
    class SCORES,INSIGHTS,RECOMMENDATIONS output
```

## 면접 시스템 확장성 고려사항

### 🔧 기술적 확장성
- **마이크로서비스 아키텍처**: 각 면접 단계를 독립적인 서비스로 분리
- **로드 밸런싱**: 다수의 면접 세션 동시 처리
- **캐싱 전략**: Redis를 활용한 실시간 데이터 캐싱
- **비동기 처리**: WebSocket과 asyncio를 활용한 실시간 처리

### 📈 성능 최적화
- **병렬 처리**: 여러 분석 도구 동시 실행
- **스트리밍 처리**: 실시간 오디오/비디오 스트리밍
- **압축 기술**: 대용량 미디어 파일 효율적 처리
- **CDN 활용**: 글로벌 사용자를 위한 콘텐츠 배포

### 🔒 보안 및 프라이버시
- **데이터 암호화**: 민감한 면접 데이터 암호화 저장
- **접근 제어**: 역할 기반 접근 권한 관리
- **감사 로그**: 모든 면접 활동 추적 및 기록
- **GDPR 준수**: 개인정보 보호 규정 준수
