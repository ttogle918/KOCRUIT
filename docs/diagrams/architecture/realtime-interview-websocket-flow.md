# 🔄 실시간 면접 WebSocket 통신 플로우

## WebSocket 연결 및 세션 관리

```mermaid
graph TB
    subgraph "🌐 클라이언트 측"
        FRONTEND[React Frontend]
        WEBSOCKET_CLIENT[WebSocket Client]
        AUDIO_CAPTURE[오디오 캡처]
        UI_UPDATE[UI 업데이트]
    end
    
    subgraph "🚪 API Gateway"
        FASTAPI[FastAPI Server]
        WS_ROUTER[WebSocket Router]
        CONNECTION_MANAGER[Connection Manager]
    end
    
    subgraph "🔄 실시간 처리 엔진"
        AUDIO_PROCESSOR[오디오 프로세서]
        STT_ENGINE[STT 엔진]
        SPEAKER_DIARIZATION[화자 분리]
        AI_ANALYZER[AI 분석기]
    end
    
    subgraph "💾 데이터 레이어"
        REDIS_SESSION[(Redis<br/>세션 데이터)]
        MYSQL_RESULT[(MySQL<br/>결과 저장)]
        CACHE[(캐시)]
    end
    
    subgraph "📊 실시간 피드백"
        SCORE_CALCULATOR[점수 계산기]
        FEEDBACK_GENERATOR[피드백 생성기]
        NOTIFICATION[알림 시스템]
    end
    
    %% 연결 관계
    FRONTEND --> WEBSOCKET_CLIENT
    WEBSOCKET_CLIENT --> AUDIO_CAPTURE
    AUDIO_CAPTURE --> WEBSOCKET_CLIENT
    WEBSOCKET_CLIENT --> UI_UPDATE
    
    WEBSOCKET_CLIENT <--> FASTAPI
    FASTAPI --> WS_ROUTER
    WS_ROUTER --> CONNECTION_MANAGER
    
    CONNECTION_MANAGER --> AUDIO_PROCESSOR
    AUDIO_PROCESSOR --> STT_ENGINE
    STT_ENGINE --> SPEAKER_DIARIZATION
    SPEAKER_DIARIZATION --> AI_ANALYZER
    
    AI_ANALYZER --> SCORE_CALCULATOR
    SCORE_CALCULATOR --> FEEDBACK_GENERATOR
    FEEDBACK_GENERATOR --> NOTIFICATION
    
    CONNECTION_MANAGER --> REDIS_SESSION
    AI_ANALYZER --> MYSQL_RESULT
    SCORE_CALCULATOR --> CACHE
    
    NOTIFICATION --> WEBSOCKET_CLIENT
    
    %% 스타일링
    classDef client fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef gateway fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef processing fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef feedback fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class FRONTEND,WEBSOCKET_CLIENT,AUDIO_CAPTURE,UI_UPDATE client
    class FASTAPI,WS_ROUTER,CONNECTION_MANAGER gateway
    class AUDIO_PROCESSOR,STT_ENGINE,SPEAKER_DIARIZATION,AI_ANALYZER processing
    class REDIS_SESSION,MYSQL_RESULT,CACHE data
    class SCORE_CALCULATOR,FEEDBACK_GENERATOR,NOTIFICATION feedback
```

## WebSocket 메시지 플로우 시퀀스

```mermaid
sequenceDiagram
    participant C as 클라이언트
    participant WS as WebSocket
    participant CM as Connection Manager
    participant AP as Audio Processor
    participant STT as STT Engine
    participant SD as Speaker Diarization
    participant AI as AI Analyzer
    participant SC as Score Calculator
    participant R as Redis
    participant DB as MySQL
    
    Note over C,DB: 1. 연결 설정
    C->>WS: WebSocket 연결 요청
    WS->>CM: 세션 생성
    CM->>R: 세션 데이터 저장
    CM->>WS: 연결 승인
    WS->>C: 연결 성공
    
    Note over C,DB: 2. 실시간 오디오 처리
    loop 면접 진행 중
        C->>WS: audio_chunk 전송
        WS->>CM: 오디오 데이터 전달
        CM->>AP: 오디오 처리 요청
        AP->>STT: 음성 인식
        STT->>AP: 텍스트 반환
        AP->>SD: 화자 분리
        SD->>AP: 화자 정보 반환
        AP->>AI: 분석 요청
        AI->>AI: AI 분석 수행
        AI->>SC: 분석 결과 전달
        SC->>SC: 점수 계산
        SC->>R: 실시간 점수 저장
        SC->>WS: 피드백 데이터
        WS->>C: 실시간 피드백 전송
    end
    
    Note over C,DB: 3. 면접 종료
    C->>WS: session_end 전송
    WS->>CM: 세션 종료 요청
    CM->>AI: 최종 분석 요청
    AI->>SC: 최종 점수 계산
    SC->>DB: 최종 결과 저장
    CM->>R: 세션 데이터 정리
    CM->>WS: 종료 완료
    WS->>C: 면접 완료 알림
```

## WebSocket 메시지 타입 및 구조

```mermaid
graph TD
    subgraph "📤 클라이언트 → 서버 메시지"
        AUDIO_CHUNK[audio_chunk<br/>오디오 데이터]
        SPEAKER_NOTE[speaker_note<br/>화자 메모]
        EVAL_REQUEST[evaluation_request<br/>평가 요청]
        SESSION_END[session_end<br/>세션 종료]
    end
    
    subgraph "📥 서버 → 클라이언트 메시지"
        CONNECTION_ACK[connection_ack<br/>연결 확인]
        AUDIO_PROCESSED[audio_processed<br/>오디오 처리 완료]
        REAL_TIME_FEEDBACK[real_time_feedback<br/>실시간 피드백]
        SCORE_UPDATE[score_update<br/>점수 업데이트]
        SESSION_COMPLETE[session_complete<br/>세션 완료]
        ERROR_MESSAGE[error_message<br/>오류 메시지]
    end
    
    subgraph "🔄 메시지 처리 플로우"
        MESSAGE_PARSER[메시지 파서]
        ROUTER[라우터]
        HANDLER[핸들러]
        RESPONSE[응답 생성]
    end
    
    AUDIO_CHUNK --> MESSAGE_PARSER
    SPEAKER_NOTE --> MESSAGE_PARSER
    EVAL_REQUEST --> MESSAGE_PARSER
    SESSION_END --> MESSAGE_PARSER
    
    MESSAGE_PARSER --> ROUTER
    ROUTER --> HANDLER
    HANDLER --> RESPONSE
    
    RESPONSE --> CONNECTION_ACK
    RESPONSE --> AUDIO_PROCESSED
    RESPONSE --> REAL_TIME_FEEDBACK
    RESPONSE --> SCORE_UPDATE
    RESPONSE --> SESSION_COMPLETE
    RESPONSE --> ERROR_MESSAGE
    
    %% 스타일링
    classDef client fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef server fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef processing fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class AUDIO_CHUNK,SPEAKER_NOTE,EVAL_REQUEST,SESSION_END client
    class CONNECTION_ACK,AUDIO_PROCESSED,REAL_TIME_FEEDBACK,SCORE_UPDATE,SESSION_COMPLETE,ERROR_MESSAGE server
    class MESSAGE_PARSER,ROUTER,HANDLER,RESPONSE processing
```

## 실시간 오디오 처리 파이프라인

```mermaid
graph LR
    subgraph "🎤 오디오 입력"
        MICROPHONE[마이크 입력]
        AUDIO_STREAM[오디오 스트림]
        CHUNK_SPLITTER[청크 분할]
    end
    
    subgraph "🔄 전처리"
        NOISE_REDUCTION[노이즈 제거]
        NORMALIZATION[정규화]
        FILTERING[필터링]
    end
    
    subgraph "🎯 음성 인식"
        STT_MODEL[STT 모델]
        TEXT_CONVERSION[텍스트 변환]
        CONFIDENCE_SCORE[신뢰도 점수]
    end
    
    subgraph "👥 화자 분리"
        VOICE_FEATURES[음성 특징 추출]
        SPEAKER_ID[화자 식별]
        SPEAKER_SEGMENTATION[화자 구간 분할]
    end
    
    subgraph "🤖 AI 분석"
        CONTENT_ANALYSIS[내용 분석]
        EMOTION_ANALYSIS[감정 분석]
        KEYWORD_EXTRACTION[키워드 추출]
    end
    
    subgraph "📊 실시간 평가"
        SCORE_CALCULATION[점수 계산]
        FEEDBACK_GENERATION[피드백 생성]
        REAL_TIME_UPDATE[실시간 업데이트]
    end
    
    MICROPHONE --> AUDIO_STREAM
    AUDIO_STREAM --> CHUNK_SPLITTER
    CHUNK_SPLITTER --> NOISE_REDUCTION
    NOISE_REDUCTION --> NORMALIZATION
    NORMALIZATION --> FILTERING
    FILTERING --> STT_MODEL
    STT_MODEL --> TEXT_CONVERSION
    TEXT_CONVERSION --> CONFIDENCE_SCORE
    CONFIDENCE_SCORE --> VOICE_FEATURES
    VOICE_FEATURES --> SPEAKER_ID
    SPEAKER_ID --> SPEAKER_SEGMENTATION
    SPEAKER_SEGMENTATION --> CONTENT_ANALYSIS
    CONTENT_ANALYSIS --> EMOTION_ANALYSIS
    EMOTION_ANALYSIS --> KEYWORD_EXTRACTION
    KEYWORD_EXTRACTION --> SCORE_CALCULATION
    SCORE_CALCULATION --> FEEDBACK_GENERATION
    FEEDBACK_GENERATION --> REAL_TIME_UPDATE
    
    %% 스타일링
    classDef input fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef preprocess fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef stt fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef speaker fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef ai fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef evaluation fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    
    class MICROPHONE,AUDIO_STREAM,CHUNK_SPLITTER input
    class NOISE_REDUCTION,NORMALIZATION,FILTERING preprocess
    class STT_MODEL,TEXT_CONVERSION,CONFIDENCE_SCORE stt
    class VOICE_FEATURES,SPEAKER_ID,SPEAKER_SEGMENTATION speaker
    class CONTENT_ANALYSIS,EMOTION_ANALYSIS,KEYWORD_EXTRACTION ai
    class SCORE_CALCULATION,FEEDBACK_GENERATION,REAL_TIME_UPDATE evaluation
```

## WebSocket 연결 상태 관리

```mermaid
stateDiagram-v2
    [*] --> Connecting: WebSocket 연결 시도
    Connecting --> Connected: 연결 성공
    Connecting --> Disconnected: 연결 실패
    
    Connected --> AudioProcessing: 오디오 데이터 수신
    AudioProcessing --> Connected: 처리 완료
    AudioProcessing --> Error: 처리 오류
    
    Connected --> SessionEnd: 세션 종료 요청
    SessionEnd --> Disconnected: 정상 종료
    
    Connected --> Heartbeat: Ping/Pong
    Heartbeat --> Connected: 응답 수신
    Heartbeat --> Disconnected: 타임아웃
    
    Error --> Reconnecting: 재연결 시도
    Reconnecting --> Connected: 재연결 성공
    Reconnecting --> Disconnected: 재연결 실패
    
    Disconnected --> [*]: 연결 해제
    
    note right of Connected
        - 세션 데이터 Redis 저장
        - 실시간 피드백 전송
        - 오디오 스트림 처리
    end note
    
    note right of AudioProcessing
        - STT 처리
        - 화자 분리
        - AI 분석
        - 점수 계산
    end note
```

## 성능 최적화 및 확장성

### 🚀 성능 최적화 전략
- **비동기 처리**: asyncio를 활용한 논블로킹 I/O
- **메모리 관리**: 오디오 청크 스트리밍으로 메모리 사용량 최적화
- **캐싱**: Redis를 활용한 세션 데이터 캐싱
- **압축**: WebSocket 메시지 압축으로 대역폭 절약

### 📈 확장성 고려사항
- **로드 밸런싱**: 다수의 WebSocket 서버 인스턴스 운영
- **세션 클러스터링**: Redis Cluster를 활용한 세션 공유
- **CDN 활용**: 글로벌 사용자를 위한 엣지 서버 배포
- **모니터링**: 실시간 연결 상태 및 성능 모니터링
