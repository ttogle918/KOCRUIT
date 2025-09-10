# 🤖 Kocruit AI Agent

> **LangGraph 기반 AI 에이전트 시스템**

## 📋 개요

Kocruit의 AI Agent는 LangGraph를 기반으로 구축된 지능형 에이전트 시스템입니다. 이력서 분석, 면접 평가, 질문 생성 등 채용 프로세스의 핵심 AI 기능을 담당합니다.

## 🛠️ 기술 스택

- **Framework**: FastAPI + LangGraph
- **LLM**: OpenAI GPT-4
- **Vector DB**: ChromaDB
- **Computer Vision**: MediaPipe
- **Speech Processing**: SpeechRecognition
- **Caching**: Redis
- **Workflow**: LangGraph StateGraph

## 🏗️ 아키텍처

```
agent/
├── agents/              # AI 에이전트들
│   ├── ai_interview_workflow.py
│   ├── interview_question_workflow.py
│   ├── application_evaluation_agent.py
│   ├── chatbot_graph.py
│   └── graph_agent.py
├── tools/               # AI 도구들
│   ├── resume_tools/
│   ├── interview_tools/
│   └── evaluation_tools/
├── utils/               # 유틸리티
├── data/                # 학습 데이터
└── main.py              # 메인 서버
```

## 🚀 주요 에이전트

### 🎤 AI 면접 에이전트
**파일**: `agents/ai_interview_workflow.py`

**기능**:
- 비디오 업로드 및 분석
- MediaPipe를 통한 표정/자세 분석
- 음성 인식 및 감정 분석
- 실시간 평가 및 피드백

**워크플로우**:
```python
initialize_session → generate_scenario_questions → 
start_real_time_analysis → process_audio_analysis → 
process_behavior_analysis → process_game_test → 
calculate_final_score
```

### ❓ 면접 질문 생성 에이전트
**파일**: `agents/interview_question_workflow.py`

**기능**:
- 채용공고 요구사항 분석
- 지원자 이력서/포트폴리오 분석
- 맞춤형 면접 질문 생성
- 질문 난이도 및 타입 분류

**워크플로우**:
```python
analyze_requirements → analyze_portfolio → 
analyze_resume → generate_questions → 
evaluate_questions → result_integrator
```

### 📊 지원서 평가 에이전트
**파일**: `agents/application_evaluation_agent.py`

**기능**:
- 이력서 점수 계산
- 통과/불합격 사유 생성
- 경쟁력 비교 분석
- 키워드 매칭 평가

### 💬 챗봇 에이전트
**파일**: `agents/chatbot_graph.py`

**기능**:
- 자연어 대화 처리
- RAG 기반 질문 답변
- 컨텍스트 기억 및 관리
- 멀티턴 대화 지원

## 🔧 AI 도구들

### 📝 이력서 분석 도구
```python
# tools/resume_tools/
- comprehensive_analysis_tool.py    # 종합 분석
- detailed_analysis_tool.py         # 상세 분석
- competitiveness_comparison_tool.py # 경쟁력 비교
- keyword_matching_tool.py          # 키워드 매칭
- highlight_tool.py                 # 형광펜 하이라이팅
```

### 🎤 면접 도구들
```python
# tools/interview_tools/
- video_analysis_tool.py            # 비디오 분석
- audio_analysis_tool.py            # 오디오 분석
- emotion_analysis_tool.py          # 감정 분석
- speaker_diarization_tool.py       # 화자 분리
```

### 📊 평가 도구들
```python
# tools/evaluation_tools/
- scoring_tool.py                   # 점수 계산
- ranking_tool.py                   # 순위 매기기
- feedback_generator_tool.py        # 피드백 생성
- report_generator_tool.py          # 리포트 생성
```

## 🧠 RAG 시스템

### 벡터 데이터베이스
- **ChromaDB**: 임베딩 벡터 저장
- **임베딩 모델**: OpenAI text-embedding-ada-002
- **메타데이터**: 문서 정보 및 태그 관리

### 검색 및 검색
```python
# RAG 워크플로우
1. 쿼리 임베딩 생성
2. 벡터 유사도 검색
3. 관련 문서 검색
4. 컨텍스트 증강
5. LLM 응답 생성
```

## 🚀 실행 방법

### 1. 환경 설정
```bash
# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경 변수 설정
```bash
# .env 파일 생성
echo "OPENAI_API_KEY=your-openai-key" > .env
echo "REDIS_URL=redis://localhost:6379" >> .env
echo "CHROMA_PERSIST_DIRECTORY=./chroma_db" >> .env
```

### 3. 데이터베이스 초기화
```bash
# ChromaDB 초기화
python -c "from utils.vector_store import init_vector_store; init_vector_store()"

# 학습 데이터 로드
python -c "from utils.data_loader import load_training_data; load_training_data()"
```

### 4. 서버 실행
```bash
# 개발 서버 실행
python main.py

# 프로덕션 서버 실행
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### 5. Docker로 실행
```bash
# Docker 이미지 빌드
docker build -t kocruit-agent .

# Docker 컨테이너 실행
docker run -p 8001:8001 --env-file .env kocruit-agent
```

## 🔄 LangGraph 워크플로우

### 상태 관리
```python
# StateGraph 정의
workflow = StateGraph(Dict[str, Any])

# 노드 추가
workflow.add_node("node_name", node_function)

# 엣지 연결
workflow.add_edge("start", "end")

# 컴파일
compiled_workflow = workflow.compile()
```

### 메모리 관리
```python
# 대화 메모리
memory = ConversationBufferMemory()

# 세션 메모리
session_memory = SessionMemory(session_id)

# 영구 메모리
persistent_memory = PersistentMemory()
```

## 📊 성능 최적화

### 캐싱 전략
```python
# LLM 결과 캐싱
@cache_llm_result
def analyze_resume(resume_text: str) -> Dict:
    # 분석 로직
    pass

# Redis 캐싱
@redis_cache(expire=3600)
def get_embeddings(text: str) -> List[float]:
    # 임베딩 생성
    pass
```

### 병렬 처리
```python
# 비동기 처리
async def process_multiple_documents(documents: List[str]):
    tasks = [analyze_document(doc) for doc in documents]
    results = await asyncio.gather(*tasks)
    return results
```

## 🧪 테스트

### 단위 테스트
```bash
# 에이전트 테스트
pytest tests/agents/

# 도구 테스트
pytest tests/tools/

# 워크플로우 테스트
pytest tests/workflows/
```

### 통합 테스트
```bash
# 전체 워크플로우 테스트
pytest tests/integration/

# API 테스트
pytest tests/api/
```

## 📈 모니터링

### 로깅
```python
# 구조화된 로깅
import structlog

logger = structlog.get_logger()

logger.info("Agent started", 
           agent_type="interview", 
           session_id=session_id)
```

### 메트릭 수집
```python
# 성능 메트릭
from prometheus_client import Counter, Histogram

request_count = Counter('agent_requests_total', 'Total requests')
request_duration = Histogram('agent_request_duration_seconds', 'Request duration')
```

## 🔒 보안

### API 키 관리
```python
# 환경 변수에서 API 키 로드
import os
from dotenv import load_dotenv

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
```

### 데이터 보호
```python
# 민감한 데이터 마스킹
def mask_sensitive_data(text: str) -> str:
    # 개인정보 마스킹 로직
    pass
```

## 🚀 배포

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  agent:
    build: .
    ports:
      - "8001:8001"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
```

### Kubernetes
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kocruit-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kocruit-agent
  template:
    spec:
      containers:
      - name: agent
        image: kocruit-agent:latest
        ports:
        - containerPort: 8001
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
