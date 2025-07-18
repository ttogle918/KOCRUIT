# Agent 테스트 파일 가이드

이 폴더에는 AI Agent 시스템의 다양한 기능을 테스트하는 스크립트들이 포함되어 있습니다.

## 테스트 파일 목록

### 1. 실시간 면접 시스템 테스트
- **파일**: `test_realtime_interview.py`
- **기능**: WebSocket 연결, 음성 인식, 화자 분리, AI 평가
- **상세 가이드**: [README_REALTIME_INTERVIEW.md](README_REALTIME_INTERVIEW.md)

### 2. 면접 질문 생성 워크플로우 테스트
- **파일**: `test_interview_workflow.py`
- **기능**: LangGraph 기반 면접 질문 자동 생성, 면접 유형별 질문 생성
- **테스트 항목**: 일반면접, 임원면접, 기술면접 워크플로우

### 3. 면접 패널 자동 할당 테스트
- **파일**: `test_interview_panel.py`
- **기능**: 면접관 자동 할당, 패널 구성, 면접 일정 관리
- **테스트 항목**: 자동 할당, 수동 할당, 패널 멤버 조회

### 4. AI 지원서 평가 테스트
- **파일**: `test_application_evaluation.py`
- **기능**: 지원서 자동 평가, 점수 계산, 피드백 생성
- **상세 가이드**: [README_APPLICATION_EVALUATION.md](README_APPLICATION_EVALUATION.md)

### 3. 챗봇 시스템 테스트
- **파일**: `test_chatbot.py`
- **기능**: 대화 시스템, 컨텍스트 관리, 응답 생성
- **상세 가이드**: [README_CHATBOT.md](README_CHATBOT.md)

### 4. 메모리 관리 테스트
- **파일**: `test_memory.py`
- **기능**: Redis 캐시, 세션 관리, 대화 히스토리
- **관련 파일**: `redis_monitor.py`, `clear_cache.py`

### 5. RAG 시스템 테스트
- **파일**: `test_rag.py`
- **기능**: 문서 검색, 벡터 데이터베이스, 지식 베이스
- **관련 폴더**: `chroma_db/`

## 빠른 테스트 실행

### 모든 테스트 실행
```bash
# agent 폴더에서 실행
cd agent

# 실시간 면접 테스트
docker cp test_realtime_interview.py kocruit_agent:/app/
docker exec -it kocruit_agent python test_realtime_interview.py

# 면접 질문 생성 워크플로우 테스트
docker cp test_interview_workflow.py kocruit_agent:/app/
docker exec -it kocruit_agent python test_interview_workflow.py

# 면접 패널 자동 할당 테스트
docker cp test_interview_panel.py kocruit_agent:/app/
docker exec -it kocruit_agent python test_interview_panel.py

# 지원서 평가 테스트
docker cp test_application_evaluation.py kocruit_agent:/app/
docker exec -it kocruit_agent python test_application_evaluation.py

# 챗봇 테스트
docker cp test_chatbot.py kocruit_agent:/app/
docker exec -it kocruit_agent python test_chatbot.py

# 메모리 테스트
docker cp test_memory.py kocruit_agent:/app/
docker exec -it kocruit_agent python test_memory.py

# RAG 테스트
docker cp test_rag.py kocruit_agent:/app/
docker exec -it kocruit_agent python test_rag.py
```

### 개별 테스트 실행
```bash
# 특정 테스트만 실행
docker exec -it kocruit_agent python test_realtime_interview.py
docker exec -it kocruit_agent python test_interview_workflow.py
docker exec -it kocruit_agent python test_interview_panel.py
docker exec -it kocruit_agent python test_application_evaluation.py
docker exec -it kocruit_agent python test_chatbot.py
docker exec -it kocruit_agent python test_memory.py
docker exec -it kocruit_agent python test_rag.py
```

## 테스트 환경 설정

### 1. Docker 컨테이너 상태 확인
```bash
docker ps
```

### 2. 의존성 확인
```bash
# FastAPI 서버에 websockets 설치 (실시간 면접 테스트용)
docker exec -it kocruit_fastapi pip install websockets
docker restart kocruit_fastapi
```

### 3. Redis 연결 확인
```bash
# Redis 상태 확인
curl http://localhost:8001/monitor/health
```

## 테스트 결과 해석

### 성공적인 테스트 결과
- ✅ 모든 테스트 항목이 성공적으로 완료
- 📨 예상된 응답 형식으로 결과 반환
- 🔄 실시간 통신 정상 작동
- 🤖 AI 기능 정상 동작

### 일반적인 오류 및 해결 방법

#### WebSocket 연결 실패
```bash
# 해결 방법
docker exec -it kocruit_fastapi pip install websockets
docker restart kocruit_fastapi
```

#### Redis 연결 오류
```bash
# 해결 방법
docker restart kosa-redis
docker exec -it kocruit_agent python clear_cache.py
```

#### 모듈 Import 오류
```bash
# 해결 방법
docker exec -it kocruit_agent pip install -r requirements.txt
```

## 테스트 파일 구조

```
agent/
├── test_realtime_interview.py          # 실시간 면접 테스트
├── test_interview_workflow.py          # 면접 질문 생성 워크플로우 테스트
├── test_interview_panel.py             # 면접 패널 자동 할당 테스트
├── test_application_evaluation.py      # 지원서 평가 테스트
├── test_chatbot.py                     # 챗봇 테스트
├── test_memory.py                      # 메모리 관리 테스트
├── test_rag.py                         # RAG 시스템 테스트
├── README_REALTIME_INTERVIEW.md        # 실시간 면접 상세 가이드
├── README_APPLICATION_EVALUATION.md    # 지원서 평가 상세 가이드
├── README_CHATBOT.md                   # 챗봇 상세 가이드
└── README_TESTS.md                     # 이 파일 (테스트 통합 가이드)
```

## 개발자 참고사항

### 새로운 테스트 추가
1. 테스트 파일을 `agent/` 폴더에 생성
2. 관련 README 파일 작성
3. 이 파일에 테스트 정보 추가

### 테스트 실행 자동화
```bash
# 모든 테스트를 한 번에 실행하는 스크립트 예시
#!/bin/bash
cd agent
for test_file in test_*.py; do
    echo "Running $test_file..."
    docker cp "$test_file" kocruit_agent:/app/
    docker exec -it kocruit_agent python "$test_file"
    echo "Completed $test_file"
    echo "---"
done
```

### 테스트 데이터 관리
- 테스트용 샘플 데이터는 `TestingExamples.txt` 참조
- 실제 데이터는 `data/` 폴더 사용
- 테스트 결과는 `logs/` 폴더에 저장 