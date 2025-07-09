# LangGraph RAG 챗봇

LangGraph와 RAG(Retrieval-Augmented Generation)를 활용한 대화 기억 챗봇입니다.

## 주요 기능

- **대화 기억**: Redis를 활용한 대화 히스토리 저장 및 관리
- **RAG 시스템**: ChromaDB를 활용한 벡터 검색 및 컨텍스트 제공
- **세션 관리**: 사용자별 세션 ID를 통한 대화 분리
- **지식 베이스**: 동적으로 문서를 추가하여 챗봇의 지식 확장
- **향상된 페이지 컨텍스트 처리**: 전체 페이지 내용을 읽고 구조화된 정보 제공

## 새로운 페이지 컨텍스트 처리 기능

### 기존 문제점
- 입력칸의 placeholder만 읽어오는 제한적인 기능
- placeholder를 제목으로 잘못 인식하는 문제
- 관련 요소들을 그룹화하지 못하는 한계

### 개선된 기능
1. **전체 페이지 내용 읽기**: 페이지의 모든 텍스트 내용을 수집
2. **제목과 입력칸 구별**: 실제 라벨(label)과 placeholder를 정확히 구별
3. **관련 요소 그룹화**: 이름 패턴을 기반으로 관련 필드들을 자동 그룹화
4. **구조화된 분석**: 폼, 제목, 버튼, 링크, 테이블 등을 체계적으로 분석

### 수집하는 정보
- **페이지 구조**: 메인 제목, 하위 제목, 구성 요소
- **제목 구조**: H1~H6 태그의 계층적 구조
- **입력 필드**: 라벨, 필드명, 현재값, 필수여부, 타입별 그룹화
- **폼 구조**: 폼과 관련 입력 필드의 관계
- **액션 요소**: 버튼, 링크, 테이블 데이터
- **관련 필드 그룹**: 개인정보, 회사정보, 계정정보 등 패턴 기반 그룹화

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
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### 2. API 엔드포인트

#### 새로운 세션 생성
```bash
GET /chat/session/new
```
새로운 대화 세션 ID를 생성합니다.

#### 챗봇과 대화 (향상된 페이지 컨텍스트 포함)
```bash
POST /chat/
```
```json
{
    "message": "안녕하세요!",
    "session_id": "optional_session_id",
    "page_context": {
        "pathname": "/postrecruitment",
        "pageTitle": "채용공고 등록",
        "pageStructure": {
            "hasForms": true,
            "hasInputs": true,
            "mainHeading": "채용공고 등록"
        },
        "domElements": {
            "inputs": [
                {
                    "label": "채용공고 제목",
                    "name": "title",
                    "value": "프론트엔드 개발자",
                    "required": true
                }
            ],
            "headings": [
                {
                    "level": "h1",
                    "text": "채용공고 등록"
                }
            ]
        }
    }
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

### 기본 기능 테스트
```bash
python test_chatbot.py
```

### 향상된 페이지 컨텍스트 테스트
```bash
python test_enhanced_context.py
```

### 메모리 관리 테스트
```bash
python test_memory.py
```

### RAG 시스템 테스트
```bash
python test_rag.py
```

## 아키텍처

### 컴포넌트 구조

1. **ConversationMemory**: Redis를 활용한 대화 히스토리 관리
2. **RAGSystem**: ChromaDB를 활용한 벡터 검색 및 컨텍스트 제공
3. **ChatbotNode**: 향상된 페이지 컨텍스트 처리 및 LLM 통합
4. **ChatbotGraph**: LangGraph 기반 워크플로우 관리

### 페이지 컨텍스트 처리 흐름

1. **프론트엔드**: 페이지 DOM 요소 수집 및 구조화
2. **백엔드**: 수집된 정보를 분석하고 그룹화
3. **LLM**: 구조화된 컨텍스트를 활용한 정확한 응답 생성

### 주요 개선사항

- **정확한 라벨 인식**: placeholder 대신 실제 라벨 사용
- **관련 요소 그룹화**: 패턴 기반 자동 그룹화
- **구조화된 정보**: 계층적이고 체계적인 정보 제공
- **확장 가능한 구조**: 새로운 요소 타입 쉽게 추가 가능