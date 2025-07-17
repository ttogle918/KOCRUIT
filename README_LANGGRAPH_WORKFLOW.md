# LangGraph 면접 질문 생성 워크플로우

## 개요

이 프로젝트는 LangGraph를 활용하여 체계적이고 확장 가능한 면접 질문 생성 워크플로우를 구현합니다. 기존의 단순한 함수 호출 방식에서 복잡한 워크플로우 기반 시스템으로 발전시켜, 더 정교하고 맞춤형 면접 질문을 생성할 수 있습니다.

## 주요 특징

### 🚀 LangGraph 워크플로우 기반
- **복잡한 워크플로우**: 여러 단계를 거쳐 체계적으로 질문 생성
- **조건부 실행**: 면접 유형에 따라 다른 처리 로직 적용
- **확장 가능**: 새로운 노드와 엣지를 쉽게 추가 가능
- **상태 관리**: 각 단계의 결과를 상태로 관리하여 다음 단계에서 활용

### 🎯 면접 유형별 특화
- **일반 면접**: 기본적인 인성/기술/경험 질문
- **임원면접**: 전략적 사고, 리더십, 조직 문화 적합성
- **2차 면접**: 1차 피드백 기반 심화 질문
- **최종 면접**: 최종 채용 결정을 위한 종합 평가

### 🔧 통합 분석 시스템
- **포트폴리오 분석**: 지원자의 포트폴리오 링크 수집 및 분석
- **이력서 분석**: AI 기반 이력서 요약 및 핵심 정보 추출
- **평가 도구 생성**: 면접 체크리스트, 강점/약점 분석, 가이드라인

## 아키텍처

### 워크플로우 구조

```
[면접 요구사항 분석] → [포트폴리오 분석] → [이력서 분석] → [질문 생성] → [평가 도구 생성] → [결과 통합]
```

### 노드별 기능

1. **analyze_interview_requirements**: 면접 유형별 요구사항 분석
2. **portfolio_analyzer**: 포트폴리오 링크 수집 및 내용 분석
3. **resume_analyzer**: AI 기반 이력서 분석 리포트 생성
4. **question_generator**: 면접 유형별 맞춤형 질문 생성
5. **evaluation_tools**: 면접 평가 도구 생성
6. **result_integrator**: 모든 결과 통합 및 최종 정리

## 사용법

### 1. 기본 사용법

```python
from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions

# 종합 면접 질문 생성
result = generate_comprehensive_interview_questions(
    resume_text="지원자 이력서 내용...",
    job_info="채용공고 정보...",
    company_name="네이버",
    applicant_name="홍길동",
    interview_type="general"
)

print(f"생성된 질문 수: {result['total_questions']}")
print(f"질문들: {result['questions']}")
```

### 2. 면접 유형별 사용법

#### 일반 면접
```python
result = generate_comprehensive_interview_questions(
    resume_text=resume_text,
    job_info=job_info,
    company_name="네이버",
    interview_type="general"
)
```

#### 임원면접
```python
result = generate_comprehensive_interview_questions(
    resume_text=resume_text,
    job_info=job_info,
    company_name="스타트업",
    interview_type="executive"
)
```

#### 2차 면접
```python
result = generate_comprehensive_interview_questions(
    resume_text=resume_text,
    job_info=job_info,
    company_name="네이버",
    interview_type="second",
    first_interview_feedback="1차 면접 피드백 내용..."
)
```

#### 최종 면접
```python
result = generate_comprehensive_interview_questions(
    resume_text=resume_text,
    job_info=job_info,
    company_name="네이버",
    interview_type="final",
    previous_feedback="이전 면접 피드백 내용..."
)
```

### 3. API 사용법

#### 프로젝트 기반 질문 생성
```bash
curl -X POST "http://localhost:8000/api/v1/interview-questions/project-questions" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_id": 1,
    "company_name": "네이버",
    "name": "홍길동"
  }'
```

#### 직무 기반 질문 생성
```bash
curl -X POST "http://localhost:8000/api/v1/interview-questions/job-questions" \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": 41,
    "company_name": "네이버"
  }'
```

#### 임원면접 질문 생성
```bash
curl -X POST "http://localhost:8000/api/v1/interview-questions/executive-interview" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_id": 1,
    "application_id": 41,
    "company_name": "네이버",
    "name": "홍길동"
  }'
```

## 워크플로우 커스터마이징

### 새로운 노드 추가

```python
def custom_analyzer(state: Dict[str, Any]) -> Dict[str, Any]:
    """커스텀 분석 노드"""
    # 분석 로직 구현
    analysis_result = perform_custom_analysis(state)
    
    return {
        **state,
        "custom_analysis": analysis_result,
        "next": "next_node"
    }

# 워크플로우에 노드 추가
workflow.add_node("custom_analyzer", custom_analyzer)
```

### 새로운 면접 유형 추가

```python
# interview_requirements 함수에서 새로운 유형 추가
requirements = {
    "custom": {
        "needs_personal_questions": True,
        "needs_company_questions": True,
        "needs_custom_analysis": True,
        # ... 추가 요구사항
    }
}
```

## 테스트

### 워크플로우 테스트 실행

```bash
python test_interview_workflow.py
```

### 개별 테스트

```python
# 일반 면접 테스트
python -c "
from test_interview_workflow import test_general_interview_workflow
test_general_interview_workflow()
"

# 임원면접 테스트
python -c "
from test_interview_workflow import test_executive_interview_workflow
test_executive_interview_workflow()
"
```

## 성능 최적화

### 캐싱 전략
- Redis 캐싱을 통한 중복 계산 방지
- 워크플로우 단계별 결과 캐싱
- 면접 유형별 캐시 키 분리

### 병렬 처리
- 독립적인 노드들의 병렬 실행
- 포트폴리오 분석과 이력서 분석 동시 진행

### 리소스 관리
- LLM 호출 최적화
- 메모리 사용량 모니터링
- 에러 처리 및 복구

## 모니터링 및 로깅

### 워크플로우 실행 추적
```python
# 각 노드에서 실행 상태 로깅
import logging

logger = logging.getLogger(__name__)

def question_generator(state: Dict[str, Any]) -> Dict[str, Any]:
    logger.info(f"질문 생성 시작: {state.get('interview_type')}")
    # ... 로직 실행
    logger.info(f"질문 생성 완료: {len(questions)}개 생성")
    return result
```

### 성능 메트릭
- 워크플로우 실행 시간
- 각 노드별 실행 시간
- 질문 생성 품질 점수
- 에러율 및 복구율

## 확장 계획

### 단기 계획
- [ ] 실시간 면접 진행 중 질문 생성
- [ ] 음성 기반 면접 질문 생성
- [ ] 다국어 지원 (영어, 일본어 등)

### 중기 계획
- [ ] 면접 진행 상황 실시간 분석
- [ ] 지원자 응답 기반 후속 질문 생성
- [ ] 면접 결과 자동 평가 및 피드백

### 장기 계획
- [ ] AI 면접관 시스템 구축
- [ ] 면접 데이터 기반 학습 시스템
- [ ] 예측 모델을 통한 채용 성공률 예측

## 문제 해결

### 일반적인 문제들

1. **LangGraph import 오류**
   ```bash
   pip install langgraph
   ```

2. **Redis 연결 오류**
   ```bash
   # Redis 서버 시작
   docker-compose up redis
   ```

3. **메모리 부족 오류**
   ```python
   # 배치 크기 조정
   batch_size = 5  # 기본값에서 줄이기
   ```

### 디버깅 팁

1. **워크플로우 상태 확인**
   ```python
   # 각 노드에서 상태 로깅
   print(f"Current state: {state}")
   ```

2. **개별 노드 테스트**
   ```python
   # 노드별 독립 테스트
   test_state = {"resume_text": "테스트 이력서..."}
   result = portfolio_analyzer(test_state)
   print(result)
   ```

## 기여 가이드

### 코드 스타일
- PEP 8 준수
- 타입 힌트 사용
- 문서화 주석 작성

### 테스트 작성
- 각 노드별 단위 테스트
- 워크플로우 통합 테스트
- 성능 테스트

### PR 프로세스
1. 기능 브랜치 생성
2. 테스트 코드 작성
3. 문서 업데이트
4. PR 생성 및 리뷰

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 연락처

프로젝트 관련 문의사항이 있으시면 이슈를 생성해 주세요. 