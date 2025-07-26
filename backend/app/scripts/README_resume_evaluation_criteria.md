# 평가 기준 생성 스크립트

## 개요
`generate_resume_based_evaluation_criteria.py`는 LangGraph를 사용하여 면접 평가 기준을 자동으로 생성하는 스크립트입니다.

## 기능
- ✅ 공고 기반 평가 기준 생성 (`job_based`)
- ✅ 이력서 기반 평가 기준 생성 (`resume_based`)
- ✅ 실무진/임원진 면접 단계별 맞춤형 평가 기준
- ✅ 서류 통과자 필터링 (기본값)
- ✅ 캐시 클리어 옵션
- ✅ 중복 데이터 방지

## 사용법

### 1. 기본 실행 (서류 통과자만)
```bash
# 모든 타입 생성 (기본값)
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17

# job_based만 생성
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --type job_based

# resume_based만 생성
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --type resume_based
```

### 2. 캐시 클리어와 함께 실행
```bash
# 캐시 클리어 후 생성 (다양한 결과를 위해 권장)
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --clear-cache

# 특정 타입만 캐시 클리어 후 생성
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --type resume_based --clear-cache
```

### 3. 모든 지원자 대상 (서류 통과 여부 무관)
```bash
# 모든 지원자 대상으로 생성
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --all-applicants

# 캐시 클리어와 함께 모든 지원자 대상
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --all-applicants --clear-cache
```

### 4. 면접 단계 지정
```bash
# 실무진 면접만
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --stages practical

# 임원진 면접만
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --stages executive
```

## 옵션 설명

### 필수 인자
- `job_post_id`: 평가 기준을 생성할 공고 ID

### 선택 옵션
- `--type`: 생성할 평가 기준 타입
  - `job_based`: 공고 기반 평가 기준 (한 번만 생성)
  - `resume_based`: 이력서 기반 평가 기준
  - `both`: 둘 다 생성 (기본값)

- `--stages`: 생성할 면접 단계
  - `practical`: 실무진 면접
  - `executive`: 임원진 면접
  - 기본값: `practical executive`

- `--clear-cache`: 평가 기준 생성 전 캐시 클리어
  - 다양한 결과를 위해 권장
  - LLM API 호출 증가로 비용 발생 가능

- `--all-applicants`: 서류 통과 여부와 관계없이 모든 지원자 대상
  - 기본값: 서류 통과자만 (`DocumentStatus.PASSED`)

## 실행 순서

### 1단계: 데이터베이스 스키마 확인
```bash
# interview_stage 컬럼이 있는지 확인
docker exec -it kocruit_fastapi python app/scripts/add_interview_stage_column.py
```

### 2단계: 평가 기준 생성
```bash
# 캐시 클리어 후 서류 통과자 대상으로 생성 (권장)
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --clear-cache
```

### 3단계: 평가 점수 생성
```bash
# 생성된 평가 기준을 기반으로 점수 생성
docker exec -it kocruit_fastapi python app/scripts/generate_evaluation_scores_from_criteria.py 17
```

### 4단계: Application 점수 업데이트
```bash
# 생성된 평가 점수를 application 테이블에 반영
docker exec -it kocruit_fastapi python app/scripts/update_application_scores.py
```

## 생성되는 데이터 구조

### job_based 평가 기준
```json
{
  "job_post_id": 17,
  "resume_id": null,
  "application_id": null,
  "evaluation_type": "job_based",
  "interview_stage": "practical",
  "evaluation_items": [
    {
      "item_name": "Java/Spring 역량",
      "description": "Java와 Spring Framework에 대한 이해도",
      "max_score": 10,
      "weight": 0.25,
      "scoring_criteria": {...},
      "evaluation_questions": [...]
    }
  ]
}
```

### resume_based 평가 기준
```json
{
  "job_post_id": 17,
  "resume_id": 123,
  "application_id": 456,
  "evaluation_type": "resume_based",
  "interview_stage": "practical",
  "evaluation_items": [
    {
      "item_name": "프로젝트 경험",
      "description": "지원자의 프로젝트 경험에 대한 평가",
      "max_score": 10,
      "weight": 0.30,
      "scoring_criteria": {...},
      "evaluation_questions": [...]
    }
  ]
}
```

## 주의사항

### 캐시 관련
- 캐시로 인해 동일한 결과가 나올 수 있음
- 다양한 결과를 위해 `--clear-cache` 옵션 사용 권장
- 캐시 클리어 시 LLM API 호출 증가로 비용 발생

### 데이터 중복 방지
- `job_based`: 공고별로 한 번만 생성 (중복 방지)
- `resume_based`: 지원자별로 한 번만 생성 (중복 방지)

### 서류 통과 상태
- 기본값: `DocumentStatus.PASSED`인 지원자만 대상
- `--all-applicants` 옵션으로 모든 지원자 대상 가능

## 문제 해결

### 평가 기준이 생성되지 않는 경우
```bash
# 캐시 클리어 후 재시도
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --clear-cache
```

### 서류 통과자가 없다는 오류
```bash
# 모든 지원자 대상으로 시도
docker exec -it kocruit_fastapi python app/scripts/generate_resume_based_evaluation_criteria.py 17 --all-applicants
```

### interview_stage 컬럼 오류
```bash
# 컬럼 추가
docker exec -it kocruit_fastapi python app/scripts/add_interview_stage_column.py
```

### 데이터 확인
```bash
# 생성된 평가 기준 확인
docker exec -it kocruit_fastapi python -c "
from app.core.database import get_db
from app.models.evaluation_criteria import EvaluationCriteria
db = next(get_db())
criteria = db.query(EvaluationCriteria).filter(EvaluationCriteria.job_post_id == 17).all()
print(f'평가 기준 개수: {len(criteria)}')
for c in criteria[:5]:
    print(f'ID: {c.id}, Type: {c.evaluation_type}, Stage: {c.interview_stage}')
"
``` 