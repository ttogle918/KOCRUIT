-- -- interview_question_log 테이블에 면접 유형 구분 필드 추가
-- -- AI 면접과 실무진 면접을 구분할 수 있도록 함

-- -- 1. interview_type ENUM 타입 생성
-- CREATE TABLE IF NOT EXISTS interview_type_enum (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     type_name VARCHAR(50) NOT NULL UNIQUE
-- );

-- -- 2. 면접 유형 데이터 삽입
-- INSERT IGNORE INTO interview_type_enum (type_name) VALUES 
-- ('AI_INTERVIEW'),      -- AI 면접
-- ('FIRST_INTERVIEW'),   -- 1차 면접 (실무진)
-- ('SECOND_INTERVIEW'),  -- 2차 면접 (임원)
-- ('FINAL_INTERVIEW');   -- 최종 면접

-- -- 3. interview_question_log 테이블에 interview_type 컬럼 추가
-- ALTER TABLE interview_question_log 
-- ADD COLUMN interview_type VARCHAR(50) DEFAULT 'AI_INTERVIEW' AFTER job_post_id;

-- -- 4. 기존 데이터의 interview_type을 AI_INTERVIEW로 설정 (기본값)
-- UPDATE interview_question_log 
-- SET interview_type = 'AI_INTERVIEW' 
-- WHERE interview_type IS NULL OR interview_type = '';

-- -- 5. interview_type 컬럼을 NOT NULL로 변경
-- ALTER TABLE interview_question_log 
-- MODIFY COLUMN interview_type VARCHAR(50) NOT NULL DEFAULT 'AI_INTERVIEW';

-- -- 6. interview_type에 인덱스 추가 (조회 성능 향상)
-- CREATE INDEX idx_interview_question_log_type ON interview_question_log(interview_type);

-- -- 7. application_id와 interview_type 복합 인덱스 추가
-- CREATE INDEX idx_interview_question_log_app_type ON interview_question_log(application_id, interview_type);

-- -- 8. 변경 결과 확인
-- SELECT 
--     interview_type, 
--     COUNT(*) as count
-- FROM interview_question_log 
-- GROUP BY interview_type 
-- ORDER BY interview_type;

-- -- 9. 샘플 데이터 확인
-- SELECT 
--     id,
--     application_id,
--     job_post_id,
--     interview_type,
--     question_text,
--     created_at
-- FROM interview_question_log 
-- ORDER BY created_at DESC 
-- LIMIT 10; 