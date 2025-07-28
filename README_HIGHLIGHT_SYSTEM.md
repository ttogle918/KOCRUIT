# 형광펜 하이라이팅 시스템 (Highlight System)

## 📋 목차
- [시스템 개요](#시스템-개요)
- [아키텍처](#아키텍처)
- [하이라이트 카테고리](#하이라이트-카테고리)
- [API 사용법](#api-사용법)
- [프론트엔드 사용법](#프론트엔드-사용법)
- [Agent 도구](#agent-도구)
- [워크플로우](#워크플로우)
- [데이터베이스](#데이터베이스)
- [성능 최적화](#성능-최적화)
- [트러블슈팅](#트러블슈팅)

## 🎯 시스템 개요

형광펜 하이라이팅 시스템은 지원자의 이력서를 AI가 분석하여 5가지 카테고리로 분류하고 시각적으로 하이라이트하는 기능입니다. 

### 주요 기능
- **다중 카테고리 분석**: 기술 매칭, 인재상 매칭, 경험, 위험 요소, 추상 표현
- **LangGraph 워크플로우**: 구조화된 AI 분석 파이프라인
- **실시간 분석**: OpenAI GPT 모델을 활용한 고품질 텍스트 분석
- **캐싱 시스템**: Redis를 통한 분석 결과 캐싱으로 성능 최적화
- **시각적 표현**: 프론트엔드에서 직관적인 색상 코딩으로 표시

### 시스템 흐름
```
이력서 텍스트 → LangGraph 워크플로우 → AI 분석 → 5가지 카테고리 분류 → 
결과 정리 → DB 저장 → 프론트엔드 표시 → 시각적 하이라이트
```

## 🏗️ 아키텍처

### 전체 구조
```
Frontend (React) ←→ Backend (FastAPI) ←→ Agent (LangGraph) ←→ OpenAI API
                    ↓
                Database (MySQL)
                    ↓
                Cache (Redis)
```

### 컴포넌트별 역할

#### 1. Agent 워크플로우 (`agent/agents/highlight_workflow.py`)
- **역할**: AI 분석 워크플로우 엔진
- **기능**: 
  - LangGraph 기반 구조화된 분석 파이프라인
  - 5가지 카테고리별 전문화된 프롬프트
  - 비동기 병렬 처리
  - 결과 검증 및 품질 평가

#### 2. Agent 도구 (`agent/tools/highlight_tool.py`)
- **역할**: 외부 인터페이스 도구
- **기능**:
  - 워크플로우 호출 인터페이스
  - 캐싱 및 에러 처리
  - API 호환성 유지

#### 3. Backend API (`backend/app/api/v1/highlight_api.py`)
- **역할**: API 엔드포인트 제공
- **기능**:
  - Agent 서버와 통신
  - 분석 결과 DB 저장
  - 캐시 관리

#### 4. Frontend (`frontend/src/components/ResumeCard.jsx`)
- **역할**: 시각적 표현
- **기능**:
  - 하이라이트 텍스트 렌더링
  - 카테고리별 색상 적용
  - 툴팁 및 통계 표시

## 🎨 하이라이트 카테고리

### 1. 🔴 위험 요소 (Risk) - 최고 우선순위
- **색상**: 빨간색 (`#EF4444`)
- **배경색**: 연한 빨간색 (`#FEE2E2`)
- **설명**: 직무 적합성 우려 및 인재상 충돌 요소
- **분석 기준**:
  - 직무 적합성 우려 (기술 부족, 경험 부족, 학습 중)
  - 인재상 충돌 (회사 가치관과 충돌, 문화 부합성 문제)
  - 부정적 태도나 표현 (회사나 직무에 대한 부정적 시각)
- **예시**: "아직 학습 중입니다", "개인적으로 일하는 것을 선호합니다"

### 2. 🩶 면접 추가 확인 필요 (Vague) - 높은 우선순위
- **색상**: 회색 (`#6B7280`)
- **배경색**: 연한 회색 (`#F3F4F6`)
- **설명**: 면접에서 추가 확인이 필요한 부분
- **분석 기준**:
  - 구체성 부족 (미래형 표현, 추상적 표현)
  - 검증 필요 표현 (구체적 근거 없는 표현)
  - 추가 질문 유발 표현 (수치나 결과가 불분명한 성과)
- **예시**: "열심히 하겠습니다", "매출을 크게 증가시켰습니다"

### 3. 💜 경험/성과 (Experience) - 중간 우선순위
- **색상**: 보라색 (`#8B5CF6`)
- **배경색**: 연한 보라색 (`#EDE9FE`)
- **설명**: 구체적이고 의미 있는 경험
- **분석 기준**:
  - 구체적 성과가 있는 경험
  - 문제 해결 경험
  - 리더십 경험
  - 학습 및 성장 경험
- **예시**: "매출 20% 증가", "팀을 이끌어 프로젝트 완료"

### 4. 💛 인재상 매칭 (Value Fit) - 낮은 우선순위
- **색상**: 노란색 (`#F59E0B`)
- **배경색**: 연한 노란색 (`#FEF3C7`)
- **설명**: 회사의 인재상 가치가 실제 행동/사례로 구현된 구절
- **분석 기준**:
  - 정확한 매칭 (키워드 그대로 언급)
  - 문맥적 매칭 (유사어/동의어/관련 개념)
  - 실제 행동이나 사례로 가치가 드러나는 경우
- **예시**: "혁신적 해결책 제시", "협업을 통한 성과 달성"

### 5. 💙 기술 매칭 (Skill Fit) - 최저 우선순위
- **색상**: 파란색 (`#3B82F6`)
- **배경색**: 연한 파란색 (`#DBEAFE`)
- **설명**: 채용공고의 핵심 기술과 직접적으로 매칭되는 표현
- **분석 기준**:
  - 기술 키워드 매칭 (대/소문자, 한/영 구분 없음)
  - 실제 사용 경험 (학습 예정 제외)
  - 유사 키워드 매칭
- **예시**: "Java와 Spring으로 개발", "AWS 환경에 배포"

## 🔌 API 사용법

### 1. 하이라이트 분석 요청
```bash
POST /api/v1/ai/highlight-resume-by-application
Content-Type: application/json

{
  "application_id": 123,
  "jobpost_id": 456,
  "company_id": 789
}
```

### 2. 저장된 결과 조회
```bash
GET /api/v1/ai/highlight-results/{application_id}
```

### 3. 결과 삭제
```bash
DELETE /api/v1/ai/highlight-results/{application_id}
```

### 응답 형식
```json
{
  "application_id": 123,
  "jobpost_id": 456,
  "company_id": 789,
  "yellow": [
    {
      "sentence": "혁신적인 아이디어로 문제를 해결했습니다",
      "category": "value_fit",
      "reason": "혁신 가치 실현"
    }
  ],
  "red": [...],
  "gray": [...],
  "purple": [...],
  "blue": [...],
  "highlights": [...],
  "metadata": {
    "total_highlights": 15,
    "quality_score": 0.85,
    "color_distribution": {
      "yellow": 3,
      "red": 2,
      "gray": 4,
      "purple": 3,
      "blue": 3
    },
    "issues": []
  }
}
```

## 🖥️ 프론트엔드 사용법

### ResumeCard 컴포넌트
```jsx
import ResumeCard from './components/ResumeCard';

<ResumeCard 
  resume={resumeData}
  applicationId={123}
  jobpostId={456}
  loading={false}
  bookmarked={false}
  onBookmarkToggle={handleBookmarkToggle}
/>
```

### 형광펜 기능 활성화
- **형광펜 켜기**: "형광펜 켜기" 버튼 클릭
- **형광펜 끄기**: "형광펜 끄기" 버튼 클릭
- **자동 분석**: 버튼 클릭 시 자동으로 분석 시작

### 시각적 표현
- 각 카테고리별 색상으로 하이라이트
- 툴팁으로 카테고리 및 이유 표시
- 전체 통계 정보 제공

## 🤖 Agent 도구

### highlight_resume_content
```python
from agent.tools.highlight_tool import highlight_resume_content

result = highlight_resume_content(
    resume_content="이력서 내용...",
    jobpost_id=123,
    company_id=456
)
```

### highlight_resume_by_application_id
```python
from agent.tools.highlight_tool import highlight_resume_by_application_id

result = highlight_resume_by_application_id(
    application_id=123,
    resume_content="이력서 내용...",
    jobpost_id=456,
    company_id=789
)
```

## 🔄 워크플로우

### LangGraph 워크플로우 구조
```
analyze_content → generate_criteria → perform_highlighting → validate_highlights → finalize_results
```

### 각 노드별 기능

#### 1. analyze_content
- 이력서 내용 구조화 분석
- 섹션별 분리 및 메타데이터 추출

#### 2. generate_criteria
- 하이라이팅 기준 생성
- 카테고리별 키워드 및 규칙 정의

#### 3. perform_highlighting
- LLM 기반 고급 하이라이팅 수행
- 카테고리별 전문화된 프롬프트 사용
- 비동기 병렬 처리

#### 4. validate_highlights
- 하이라이팅 결과 검증
- 품질 점수 계산
- 색상 분포 균형 확인

#### 5. finalize_results
- 최종 결과 정리
- 메타데이터 생성
- 응답 형식 구성

### 워크플로우 직접 실행
```python
from agent.agents.highlight_workflow import process_highlight_workflow

result = process_highlight_workflow(
    resume_content="이력서 내용...",
    jobpost_id=123,
    company_id=456
)
```

## 🗄️ 데이터베이스

### highlight_result 테이블
```sql
CREATE TABLE highlight_result (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT NOT NULL,
    jobpost_id INT,
    company_id INT,
    yellow JSON,
    red JSON,
    gray JSON,
    purple JSON,
    blue JSON,
    highlights JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_application_id (application_id)
);
```

### 데이터 저장
- 분석 결과는 JSON 형태로 저장
- application_id로 빠른 조회 가능
- 메타데이터 포함하여 품질 추적

## ⚡ 성능 최적화

### 1. Redis 캐싱
- 분석 결과 캐싱으로 중복 분석 방지
- 캐시 TTL: 24시간
- 키 형식: `highlight:{application_id}`

### 2. 비동기 처리
- LangGraph 워크플로우의 병렬 처리
- 각 카테고리별 동시 분석
- 타임아웃 설정: 5분

### 3. LLM 최적화
- 전문화된 프롬프트로 정확도 향상
- 응답 형식 표준화
- 에러 처리 및 fallback 메커니즘

### 4. 프론트엔드 최적화
- 지연 로딩 (형광펜 버튼 클릭 시 분석)
- 결과 캐싱
- 로딩 상태 표시

## 🔧 트러블슈팅

### 일반적인 문제

#### 1. 분석 시간 초과
**증상**: "하이라이팅 분석 시간이 초과되었습니다" 메시지
**해결책**:
- 네트워크 상태 확인
- OpenAI API 상태 확인
- 잠시 후 재시도

#### 2. 하이라이트가 표시되지 않음
**증상**: 형광펜을 켜도 하이라이트가 보이지 않음
**해결책**:
- 브라우저 개발자 도구에서 네트워크 탭 확인
- API 응답 상태 확인
- 캐시 삭제 후 재시도

#### 3. 색상이 잘못 표시됨
**증상**: 카테고리와 색상이 매칭되지 않음
**해결책**:
- 프론트엔드 색상 매핑 확인
- API 응답의 category 필드 확인

### 로그 확인
```bash
# Agent 서버 로그
docker logs kocruit_agent

# Backend 서버 로그
docker logs kocruit_fastapi

# Redis 로그
docker logs kosa-redis
```

### 디버깅 모드
```python
# 상세 로그 활성화
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📝 변경 이력

### v2.0 (현재)
- LangGraph 워크플로우 도입
- 복잡한 프롬프트를 워크플로우로 이전
- 기존 복잡한 도구 제거
- 성능 및 안정성 개선

### v1.0 (이전)
- 기본 형광펜 기능
- 단순한 키워드 매칭
- 기본적인 색상 분류

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 