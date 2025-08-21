# 필기 합격자 명단 문제 해결 가이드

## 문제 상황
필기 합격자 명단이 표시되지 않는 문제가 발생했습니다.

## 원인 분석
1. **데이터베이스에 필기 합격자 데이터가 없음**
2. **API 엔드포인트 연결 문제**
3. **필기시험 자동 채점이 실행되지 않음**

## 해결 방법

### 1단계: 데이터베이스 상태 확인 및 테스트 데이터 생성

```bash
# 백엔드 디렉토리로 이동
cd backend

# 테스트 데이터 생성 스크립트 실행
python test_written_test_data.py
```

이 스크립트는:
- 기존 필기 합격자 데이터 상태를 확인
- 데이터가 없으면 테스트 데이터를 자동 생성
- 상위 3명의 지원자를 필기합격자로 설정

### 2단계: API 테스트

```bash
# API 테스트 실행
python test_written_test_api.py
```

이 스크립트는:
- 필기합격자 API 엔드포인트 테스트
- 필기시험 결과 API 테스트
- 공개 jobpost API 테스트

### 3단계: 통합 테스트 실행

```bash
# 모든 테스트를 한 번에 실행
python run_written_test_tests.py
```

### 4단계: 수동 필기시험 자동 채점 실행

만약 테스트 데이터가 부족하다면, 실제 필기시험 자동 채점을 실행할 수 있습니다:

```bash
# 특정 jobpost의 필기시험 자동 채점
curl -X POST "http://localhost:8000/api/v1/ai-evaluate/written-test/auto-grade/jobpost/{jobpost_id}"
```

## 프론트엔드 확인

1. **사이드바에서 '필기 합격자 명단' 버튼 클릭**
2. **직접 URL 접근**: `/written-test-passed/{jobpost_id}`
3. **지원자 목록에서 필기 합격자 확인**

## API 엔드포인트

### 필기합격자 조회
```
GET /api/v1/ai-evaluate/written-test/passed/{jobpost_id}
```

### 필기시험 결과 조회
```
GET /api/v1/ai-evaluate/written-test/results/{jobpost_id}
```

### 필기시험 자동 채점
```
POST /api/v1/ai-evaluate/written-test/auto-grade/jobpost/{jobpost_id}
```

## 데이터베이스 스키마

### Application 테이블
- `written_test_status`: ENUM('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED')
- `written_test_score`: FLOAT (필기시험 점수)

### 필기합격자 조건
- `written_test_status = 'PASSED'`
- `written_test_score`가 설정되어 있음

## 문제 해결 체크리스트

- [ ] 백엔드 서버가 실행 중인지 확인
- [ ] 데이터베이스 연결이 정상인지 확인
- [ ] 필기합격자 데이터가 존재하는지 확인
- [ ] API 엔드포인트가 정상 응답하는지 확인
- [ ] 프론트엔드에서 페이지 접근이 가능한지 확인

## 추가 디버깅

### 로그 확인
```bash
# 백엔드 로그 확인
docker-compose logs backend

# 프론트엔드 로그 확인
docker-compose logs frontend
```

### 데이터베이스 직접 확인
```sql
-- 필기합격자 조회
SELECT 
    a.id,
    u.name as user_name,
    a.written_test_score,
    a.written_test_status
FROM application a
JOIN "user" u ON a.user_id = u.id
WHERE a.written_test_status = 'PASSED';
```

## 예상 결과

성공적으로 해결되면:
1. 필기합격자 명단 페이지에 데이터가 표시됨
2. 각 지원자의 필기 점수가 표시됨
3. 지원자 클릭 시 상세 정보 확인 가능
4. 이메일 발송 기능 사용 가능 