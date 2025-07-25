-- 1. 기존 상태값 일괄 변경
-- NOT_SCHEDULED를 AI_INTERVIEW_PENDING으로 변경
UPDATE application 
SET interview_status = 'AI_INTERVIEW_PENDING' 
WHERE interview_status = 'NOT_SCHEDULED';

-- AI_INTERVIEW_NOT_SCHEDULED를 AI_INTERVIEW_PENDING으로 변경
UPDATE application 
SET interview_status = 'AI_INTERVIEW_PENDING' 
WHERE interview_status = 'AI_INTERVIEW_NOT_SCHEDULED';

-- SCHEDULED를 AI_INTERVIEW_SCHEDULED로 변경
UPDATE application 
SET interview_status = 'AI_INTERVIEW_SCHEDULED' 
WHERE interview_status = 'SCHEDULED';

-- COMPLETED를 AI_INTERVIEW_COMPLETED로 변경
UPDATE application 
SET interview_status = 'AI_INTERVIEW_COMPLETED' 
WHERE interview_status = 'COMPLETED';

-- 2. 변경 결과 확인
SELECT interview_status, COUNT(*) as count 
FROM application 
GROUP BY interview_status 
ORDER BY interview_status;

-- 3. ENUM 재정의 (MySQL에서 실행)
-- ALTER TABLE application MODIFY COLUMN interview_status ENUM(
--   'AI_INTERVIEW_PENDING',      -- AI 면접 대기
--   'AI_INTERVIEW_SCHEDULED',    -- AI 면접 일정 확정
--   'AI_INTERVIEW_IN_PROGRESS',  -- AI 면접 진행 중
--   'AI_INTERVIEW_COMPLETED',    -- AI 면접 완료
--   'AI_INTERVIEW_PASSED',       -- AI 면접 합격
--   'AI_INTERVIEW_FAILED',       -- AI 면접 불합격
--   'FIRST_INTERVIEW_SCHEDULED', -- 1차 면접 일정 확정
--   'FIRST_INTERVIEW_IN_PROGRESS', -- 1차 면접 진행 중
--   'FIRST_INTERVIEW_COMPLETED', -- 1차 면접 완료
--   'FIRST_INTERVIEW_PASSED',    -- 1차 면접 합격
--   'FIRST_INTERVIEW_FAILED',    -- 1차 면접 불합격
--   'SECOND_INTERVIEW_SCHEDULED', -- 2차 면접 일정 확정
--   'SECOND_INTERVIEW_IN_PROGRESS', -- 2차 면접 진행 중
--   'SECOND_INTERVIEW_COMPLETED', -- 2차 면접 완료
--   'SECOND_INTERVIEW_PASSED',   -- 2차 면접 합격
--   'SECOND_INTERVIEW_FAILED',   -- 2차 면접 불합격
--   'FINAL_INTERVIEW_SCHEDULED', -- 최종 면접 일정 확정
--   'FINAL_INTERVIEW_IN_PROGRESS', -- 최종 면접 진행 중
--   'FINAL_INTERVIEW_COMPLETED', -- 최종 면접 완료
--   'FINAL_INTERVIEW_PASSED',    -- 최종 면접 합격
--   'FINAL_INTERVIEW_FAILED',    -- 최종 면접 불합격
--   'CANCELLED'                  -- 면접 취소
-- ) DEFAULT 'AI_INTERVIEW_PENDING'; 