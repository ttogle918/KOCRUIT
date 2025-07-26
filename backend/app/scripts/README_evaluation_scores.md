# 평가 점수 생성 스크립트

## 개요
`generate_evaluation_scores_from_criteria.py`는 평가 기준 데이터를 기반으로 실제 면접 평가 점수를 랜덤으로 생성하는 스크립트입니다.

## 기능
- ✅ 평가 기준의 `evaluation_items`를 기반으로 점수 생성
- ✅ 평가자별로 다른 편향 적용 (관대/엄격/중간)
- ✅ 실무진/임원진 구분하여 평가자 배정
- ✅ 각 평가 항목별 상세 점수 및 코멘트 생성
- ✅ 가중 평균을 통한 총점 계산
- ✅ 중복 데이터 방지 (기존 평가 데이터 확인)

## 사용법

### 1. 기본 실행
```bash
# Docker 컨테이너 내에서 실행
docker exec -it kocruit_fastapi python app/scripts/generate_evaluation_scores_from_criteria.py <job_post_id>

# 예시
docker exec -it kocruit_fastapi python app/scripts/generate_evaluation_scores_from_criteria.py 17
```

### 2. 실행 전 확인사항
- [ ] 평가 기준 데이터가 생성되어 있어야 함
- [ ] `evaluation_criteria` 테이블에 `interview_stage` 컬럼이 있어야 함
- [ ] 평가자 데이터가 존재해야 함 (3001-3006)

## 평가자 설정

### 실무진 평가자 (practical)
- ID: 3001, 3002, 3003
- 편향: 약간 관대, 약간 엄격, 중간

### 임원진 평가자 (executive)
- ID: 3004, 3005, 3006
- 편향: 관대, 엄격, 약간 관대

## 생성되는 데이터 구조

### 평가 항목별 점수
```json
{
  "item_name": "Java/Spring 역량",
  "score": 8.5,
  "max_score": 10,
  "weight": 0.25,
  "weighted_score": 2.13,
  "comment": "Java/Spring 역량에 대해 충분한 역량을 보여줍니다."
}
```

### 전체 평가 데이터
```json
{
  "application_id": 123,
  "evaluator_id": 3001,
  "evaluation_type": "PRACTICAL",
  "total_score": 8.2,
  "evaluation_items": [...],
  "summary": "실무진 면접에서 양호한 성과를 보였습니다...",
  "status": "completed"
}
```

## 점수 생성 로직

### 기본 점수 범위
- 최소: 6.0점
- 최대: 9.5점
- 소수점: 1자리까지

### 평가자별 편향
- 관대한 평가자: +0.2~0.3점
- 엄격한 평가자: -0.1~0.2점
- 중간 평가자: ±0.0점

### 코멘트 생성
- 9.0점 이상: 매우 우수
- 7.5점 이상: 양호
- 6.0점 이상: 보통
- 6.0점 미만: 부족

## 실행 순서

1. **평가 기준 생성**
   ```bash
   # job_based 평가 기준 생성
   python app/scripts/generate_resume_based_evaluation_criteria.py 17 --type job_based
   
   # resume_based 평가 기준 생성
   python app/scripts/generate_resume_based_evaluation_criteria.py 17 --type resume_based
   ```

2. **평가 점수 생성**
   ```bash
   # 평가 기준을 기반으로 점수 생성
   python app/scripts/generate_evaluation_scores_from_criteria.py 17
   ```

3. **Application 점수 업데이트**
   ```bash
   # 생성된 평가 점수를 application 테이블에 반영
   python app/scripts/update_application_scores.py
   ```

## 주의사항

- 기존 평가 데이터가 있으면 스킵됩니다
- 평가 기준에 `evaluation_items`가 없으면 해당 기준은 스킵됩니다
- 평가자 ID가 존재하지 않으면 해당 평가자는 제외됩니다
- 데이터베이스 연결 오류 시 자동으로 롤백됩니다

## 문제 해결

### 평가 기준이 없다는 오류
```bash
# 평가 기준 먼저 생성
python app/scripts/generate_resume_based_evaluation_criteria.py 17 --type both
```

### interview_stage 컬럼 오류
```bash
# 컬럼 추가
python app/scripts/add_interview_stage_column.py
```

### 평가자 데이터 없음
```sql
-- 평가자 데이터 확인
SELECT * FROM company_user WHERE id IN (3001, 3002, 3003, 3004, 3005, 3006);
``` 