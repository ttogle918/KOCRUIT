-- interview_question 테이블 스키마 업데이트
-- 기존 테이블 백업 및 새 스키마로 재생성

-- 1. 기존 테이블 백업
CREATE TABLE interview_question_backup AS SELECT * FROM interview_question;

-- 2. 기존 테이블 삭제
DROP TABLE interview_question;

-- 3. 새로운 스키마로 테이블 재생성
CREATE TABLE interview_question (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    type           ENUM('common', 'personal', 'company', 'job', 'executive', 'second', 'final') NOT NULL,
    question_text  TEXT NOT NULL,
    category       VARCHAR(50),
    difficulty     VARCHAR(20),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (application_id) REFERENCES application(id)
);

-- 4. 기존 데이터 복원 (가능한 경우)
INSERT INTO interview_question (application_id, type, question_text, category, created_at)
SELECT 
    application_id,
    CASE 
        WHEN type IS NULL OR type = '' THEN 'common'
        ELSE type
    END as type,
    question_text,
    '기존 데이터' as category,
    NOW() as created_at
FROM interview_question_backup
WHERE question_text IS NOT NULL AND question_text != '';

-- 5. 백업 테이블 삭제 (선택사항)
-- DROP TABLE interview_question_backup; 