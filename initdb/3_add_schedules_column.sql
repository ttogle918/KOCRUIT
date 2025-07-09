-- Migration: Add schedules column to jobpost table
-- Date: 2025-07-08
-- Purpose: Support interview schedules in job postings
-- Status: Applied manually via Python script (migrate_schedules.py)
-- 
-- This migration adds a TEXT column to store interview schedule information
-- as JSON format for job postings.

-- ALTER TABLE jobpost ADD COLUMN schedules TEXT;



-- 상위 N명(PASSED, DOCUMENT_PASSED), 나머지(REJECTED, DOCUMENT_REJECTED)로 나누려면 아래처럼 두 번 실행

-- 1) 상위 N명(예: 3배수)만 합격 처리
-- UPDATE application
-- SET document_status = 'DOCUMENT_PASSED'
-- WHERE job_post_id = 68 AND status = 'WAITING'
-- ORDER BY score DESC
-- LIMIT 15;

-- 2) 나머지 불합격 처리
-- UPDATE application
-- SET status = 'REJECTED', document_status = 'DOCUMENT_REJECTED'
-- WHERE job_post_id = 68
-- AND id NOT IN (
--     SELECT id FROM application
--     WHERE job_post_id = 68
--     ORDER BY score DESC NULLS LAST
--     LIMIT [N]
-- );

-- UPDATE application
-- SET status = 'WAITING';


-- UPDATE application
-- SET status = 'PASSED', document_status = 'DOCUMENT_PASSED'
-- WHERE job_post_id = 68;

-- UPDATE application
-- SET status = 'REJECTED', document_status = 'DOCUMENT_REJECTED'
-- WHERE job_post_id = 68;

-- commit;



-- DELETE FROM admin_user;
-- ALTER TABLE admin_user AUTO_INCREMENT = 1;

-- DELETE FROM applicant_user;
-- ALTER TABLE applicant_user AUTO_INCREMENT = 1;

-- DELETE FROM application;
-- ALTER TABLE application AUTO_INCREMENT = 1;

-- DELETE FROM application_status_history;
-- ALTER TABLE application_status_history AUTO_INCREMENT = 1;

-- DELETE FROM company;
-- ALTER TABLE company AUTO_INCREMENT = 1;

-- DELETE FROM company_user;
-- ALTER TABLE company_user AUTO_INCREMENT = 1;

-- DELETE FROM department;
-- ALTER TABLE department AUTO_INCREMENT = 1;

-- DELETE FROM email_verification_tokens;
-- ALTER TABLE email_verification_tokens AUTO_INCREMENT = 1;

-- DELETE FROM evaluation_detail;
-- ALTER TABLE evaluation_detail AUTO_INCREMENT = 1;

-- DELETE FROM field_name_score;
-- ALTER TABLE field_name_score AUTO_INCREMENT = 1;

-- DELETE FROM interview_evaluation;
-- ALTER TABLE interview_evaluation AUTO_INCREMENT = 1;

-- DELETE FROM interview_question;
-- ALTER TABLE interview_question AUTO_INCREMENT = 1;

-- DELETE FROM job;
-- ALTER TABLE job AUTO_INCREMENT = 1;

-- DELETE FROM jobpost;
-- ALTER TABLE jobpost AUTO_INCREMENT = 1;

-- DELETE FROM jobpost_role;
-- ALTER TABLE jobpost_role AUTO_INCREMENT = 1;

-- DELETE FROM notification;
-- ALTER TABLE notification AUTO_INCREMENT = 1;

-- DELETE FROM post_interview;
-- ALTER TABLE post_interview AUTO_INCREMENT = 1;

-- DELETE FROM resume;
-- ALTER TABLE resume AUTO_INCREMENT = 1;
-- DELETE FROM resume_memo;
-- ALTER TABLE resume_memo AUTO_INCREMENT = 1;

-- DELETE FROM schedule;
-- ALTER TABLE schedule AUTO_INCREMENT = 1;

-- DELETE FROM schedule_interview;
-- ALTER TABLE schedule_interview AUTO_INCREMENT = 1;

-- DELETE FROM spec;
-- ALTER TABLE spec AUTO_INCREMENT = 1;

-- DELETE FROM users;
-- ALTER TABLE users AUTO_INCREMENT = 1;

-- DELETE FROM weight;
-- ALTER TABLE weight AUTO_INCREMENT = 1;
-- commit;