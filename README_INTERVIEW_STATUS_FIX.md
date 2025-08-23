# 면접 상태 필드 문제 해결 가이드

## 문제 상황
실무진 면접과 임원진 면접 페이지에서 지원자가 표시되지 않는 문제가 발생했습니다.

## 원인 분석
기존에는 `interview_status` 필드 하나로 모든 면접 단계를 관리했지만, 이를 단계별로 세분화하여 다음 3개 필드로 분리했습니다:
- `ai_interview_status`: AI 면접 상태
- `practical_interview_status`: 실무진 면접 상태  
- `executive_interview_status`: 임원진 면접 상태

## 해결 방법

### 1. 백엔드 API 엔드포인트 추가
- `/applications/job/{job_post_id}/applicants-with-practical-interview`: 실무진 면접 지원자 목록
- `/applications/job/{job_post_id}/applicants-with-executive-interview`: 임원진 면접 지원자 목록

### 2. 프론트엔드 수정
- `PracticalInterviewModal.jsx`: 실무진 면접 API 엔드포인트 호출
- `ExecutiveInterviewModal.jsx`: 임원진 면접 API 엔드포인트 호출
- `AiInterviewSystem.jsx`: `practical_interview_status`와 `executive_interview_status` 표시

### 3. 지원자 필터링 조건
- **실무진 면접 페이지**: `ai_interview_status = 'PASSED'`인 지원자 중 `practical_interview_status`가 진행/완료/합격/불합격 상태
- **임원진 면접 페이지**: `practical_interview_status = 'PASSED'`인 지원자 중 `executive_interview_status`가 진행/완료/합격/불합격 상태

## 테스트 방법

### 1. API 테스트 페이지
`/interview/status-test/{job_post_id}` 경로에서 각 API 엔드포인트를 테스트할 수 있습니다.

### 2. 데이터베이스 상태 확인
```sql
-- AI 면접 합격자 수 확인
SELECT COUNT(*) FROM application WHERE ai_interview_status = 'PASSED';

-- 실무진 면접 합격자 수 확인  
SELECT COUNT(*) FROM application WHERE practical_interview_status = 'PASSED';

-- 임원진 면접 합격자 수 확인
SELECT COUNT(*) FROM application WHERE executive_interview_status = 'PASSED';
```

## 문제 해결 체크리스트

### 실무진 면접 페이지에 지원자가 안 뜨는 경우:
- [ ] `ai_interview_status`가 'PASSED'인 지원자가 있는지 확인
- [ ] `practical_interview_status`가 적절한 상태인지 확인
- [ ] API 엔드포인트가 올바르게 호출되는지 확인

### 임원진 면접 페이지에 지원자가 안 뜨는 경우:
- [ ] `practical_interview_status`가 'PASSED'인 지원자가 있는지 확인
- [ ] `executive_interview_status`가 적절한 상태인지 확인
- [ ] API 엔드포인트가 올바르게 호출되는지 확인

## 상태 값 설명

### InterviewStatus Enum
- `PENDING`: 대기중
- `SCHEDULED`: 일정 확정
- `IN_PROGRESS`: 진행중
- `COMPLETED`: 완료
- `PASSED`: 합격
- `FAILED`: 불합격

## 추가 작업 필요사항

1. **면접 평가 완료 시 상태 업데이트**: 실무진/임원진 면접 평가가 완료되면 해당 `practical_interview_status` 또는 `executive_interview_status`를 업데이트
2. **상태 변경 히스토리**: 면접 상태 변경 이력을 추적할 수 있는 시스템 구축
3. **자동 상태 전환**: 면접 단계별 자동 상태 전환 로직 구현

## 관련 파일 목록

### 백엔드
- `backend/app/api/v1/applications.py`: API 엔드포인트
- `backend/app/models/application.py`: 데이터베이스 모델
- `backend/check_interview_status.py`: 상태 확인 스크립트

### 프론트엔드
- `frontend/src/pages/interview/AiInterviewSystem.jsx`: 메인 면접 시스템
- `frontend/src/components/interview/PracticalInterviewModal.jsx`: 실무진 면접 모달
- `frontend/src/components/interview/ExecutiveInterviewModal.jsx`: 임원진 면접 모달
- `frontend/src/pages/interview/InterviewStatusTest.jsx`: API 테스트 페이지
