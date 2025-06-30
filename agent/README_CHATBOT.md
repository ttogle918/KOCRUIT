# LangGraph RAG 챗봇

LangGraph와 RAG(Retrieval-Augmented Generation)를 활용한 대화 기억 챗봇입니다.

## 주요 기능

- **대화 기억**: Redis를 활용한 대화 히스토리 저장 및 관리
- **RAG 시스템**: ChromaDB를 활용한 벡터 검색 및 컨텍스트 제공
- **세션 관리**: 사용자별 세션 ID를 통한 대화 분리
- **지식 베이스**: 동적으로 문서를 추가하여 챗봇의 지식 확장

## 설치 및 설정

### 1. 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
OPENAI_API_KEY=your_openai_api_key_here
REDIS_URL=redis://localhost:6379
```

### 3. Redis 서버 실행
```bash
# Docker를 사용하는 경우
docker run -d -p 6379:6379 redis:latest

# 또는 로컬 Redis 설치
redis-server
```

## 사용법

### 1. 서버 실행
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. API 엔드포인트

#### 새로운 세션 생성
```bash
GET /chat/session/new
```
새로운 대화 세션 ID를 생성합니다.

#### 챗봇과 대화
```bash
POST /chat/
```
```json
{
    "message": "안녕하세요!",
    "session_id": "optional_session_id"
}
```

#### 지식 베이스에 문서 추가
```bash
POST /chat/add-knowledge/
```
```json
{
    "documents": [
        "문서 내용 1",
        "문서 내용 2"
    ],
    "metadata": [
        {"source": "source1", "topic": "topic1"},
        {"source": "source2", "topic": "topic2"}
    ]
}
```

#### 대화 히스토리 삭제
```bash
DELETE /chat/clear/{session_id}
```

## 테스트

테스트 스크립트를 실행하여 챗봇 기능을 확인할 수 있습니다:

```bash
python test_chatbot.py
```

## 아키텍처

### 컴포넌트 구조

1. **ConversationMemory**: Redis를 활용한 대화 히스토리 관리
2. **RAGSystem**: ChromaDB를 활용한 벡터 검색 및 컨텍스트 제공
3. **ChatbotNode**: LLM과 대화 처리 로직
4. **ChatbotGraph**: LangGraph를 활용한 워크플로우 관리

### 데이터 흐름

1. 사용자 메시지 입력
2. 세션 ID로 대화 히스토리 조회
3. RAG 시스템으로 관련 컨텍스트 검색
4. LLM에 컨텍스트와 히스토리를 포함하여 질문
5. 응답을 대화 히스토리에 저장
6. 결과 반환

## 설정 옵션

### 메모리 설정
- 대화 히스토리 보관 기간: 24시간 (Redis TTL)
- 최근 메시지 조회 제한: 10개

### RAG 설정
- 문서 청크 크기: 1000자
- 청크 오버랩: 200자
- 검색 결과 수: 3개

### LLM 설정
- 모델: GPT-4o-mini
- Temperature: 0.7

## 확장 가능성

1. **다중 모달 지원**: 이미지, 오디오 등 다양한 입력 형식 지원
2. **감정 분석**: 사용자 감정에 따른 응답 조정
3. **개인화**: 사용자별 맞춤형 응답 생성
4. **실시간 학습**: 대화를 통한 지식 베이스 자동 업데이트

## 문제 해결

### Redis 연결 오류
- Redis 서버가 실행 중인지 확인
- `REDIS_URL` 환경 변수 설정 확인

### OpenAI API 오류
- `OPENAI_API_KEY` 환경 변수 설정 확인
- API 키의 유효성 및 잔액 확인

### ChromaDB 오류
- `./chroma_db` 디렉토리 권한 확인
- 디스크 공간 확인