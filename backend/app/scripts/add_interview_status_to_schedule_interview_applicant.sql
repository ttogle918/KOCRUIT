-- schedule_interview_applicant 테이블에 interview_status 컬럼 추가
-- 실행 전: 현재 테이블 구조 확인
DESCRIBE schedule_interview_applicant;

-- 1. interview_status 컬럼 추가 (이미 존재하면 오류 발생)
ALTER TABLE schedule_interview_applicant 
ADD COLUMN interview_status VARCHAR(50) DEFAULT 'NOT_SCHEDULED';

-- 2. 기존 레코드들의 interview_status를 SCHEDULED로 업데이트
-- (이미 연결된 레코드들은 면접 일정이 확정된 것으로 간주)
UPDATE schedule_interview_applicant 
SET interview_status = 'SCHEDULED' 
WHERE interview_status IS NULL OR interview_status = 'NOT_SCHEDULED';

-- 3. Application 테이블의 interview_status와 동기화
UPDATE schedule_interview_applicant sia
JOIN application a ON sia.user_id = a.user_id
SET sia.interview_status = a.interview_status
WHERE a.interview_status IS NOT NULL;

-- 4. 결과 확인
SELECT 
    sia.schedule_interview_id,
    sia.user_id,
    sia.interview_status,
    a.interview_status as application_interview_status
FROM schedule_interview_applicant sia
LEFT JOIN application a ON sia.user_id = a.user_id
LIMIT 10;

-- 5. 컬럼이 제대로 추가되었는지 확인
DESCRIBE schedule_interview_applicant; 