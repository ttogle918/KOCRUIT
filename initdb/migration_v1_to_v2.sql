-- 1. 안전한 롤백을 위한 전체 데이터 백업
CREATE TABLE application_backup_migration AS SELECT * FROM application;

-- 2. 신규 테이블 생성: application_stage
CREATE TABLE `application_stage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `stage_name` varchar(50) NOT NULL COMMENT 'DOCUMENT, WRITTEN_TEST, AI_INTERVIEW, PRACTICAL_INTERVIEW, EXECUTIVE_INTERVIEW, FINAL',
  `stage_order` int NOT NULL DEFAULT 1,
  `status` enum('PENDING','SCHEDULED','IN_PROGRESS','COMPLETED','PASSED','FAILED','CANCELED') DEFAULT 'PENDING',
  `score` decimal(5,2) DEFAULT NULL,
  `pass_reason` text,
  `fail_reason` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_application_stage_app_id` (`application_id`),
  KEY `idx_application_stage_name` (`stage_name`),
  CONSTRAINT `fk_application_stage_app` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. 데이터 이관 (Migration)
-- 각 전형 단계별로 컬럼 데이터를 Row로 변환하여 삽입합니다.

-- 3-1. 서류 전형 (DOCUMENT)
INSERT INTO application_stage (application_id, stage_name, stage_order, status, created_at, updated_at)
SELECT 
    id, 
    'DOCUMENT', 
    1, 
    CASE 
        WHEN document_status = 'PENDING' THEN 'PENDING'
        WHEN document_status = 'REVIEWING' THEN 'IN_PROGRESS'
        WHEN document_status = 'PASSED' THEN 'PASSED'
        WHEN document_status = 'REJECTED' THEN 'FAILED'
        ELSE 'PENDING'
    END,
    applied_at,
    applied_at
FROM application;

-- 3-2. 필기 전형 (WRITTEN_TEST) - 데이터가 있는 경우만
INSERT INTO application_stage (application_id, stage_name, stage_order, status, score)
SELECT 
    id, 
    'WRITTEN_TEST', 
    2,
    CASE 
        WHEN written_test_status = 'PENDING' THEN 'PENDING'
        WHEN written_test_status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
        WHEN written_test_status = 'PASSED' THEN 'PASSED'
        WHEN written_test_status = 'FAILED' THEN 'FAILED'
        ELSE 'PENDING'
    END,
    written_test_score
FROM application
WHERE written_test_status IS NOT NULL AND written_test_status != 'PENDING';

-- 3-3. AI 면접 (AI_INTERVIEW)
INSERT INTO application_stage (application_id, stage_name, stage_order, status, score, pass_reason, fail_reason)
SELECT 
    id, 
    'AI_INTERVIEW', 
    3,
    CASE 
        WHEN ai_interview_status = 'PENDING' THEN 'PENDING'
        WHEN ai_interview_status = 'SCHEDULED' THEN 'SCHEDULED'
        WHEN ai_interview_status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
        WHEN ai_interview_status = 'COMPLETED' THEN 'COMPLETED'
        WHEN ai_interview_status = 'PASSED' THEN 'PASSED'
        WHEN ai_interview_status = 'FAILED' THEN 'FAILED'
        WHEN ai_interview_status = 'CANCELLED' THEN 'CANCELED'
        ELSE 'PENDING'
    END,
    ai_interview_score,
    ai_interview_pass_reason,
    ai_interview_fail_reason
FROM application
WHERE ai_interview_status IS NOT NULL;

-- 3-4. 실무 면접 (PRACTICAL_INTERVIEW)
INSERT INTO application_stage (application_id, stage_name, stage_order, status, score)
SELECT 
    id, 
    'PRACTICAL_INTERVIEW', 
    4,
    CASE 
        WHEN practical_interview_status = 'PENDING' THEN 'PENDING'
        WHEN practical_interview_status = 'SCHEDULED' THEN 'SCHEDULED'
        WHEN practical_interview_status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
        WHEN practical_interview_status = 'COMPLETED' THEN 'COMPLETED'
        WHEN practical_interview_status = 'PASSED' THEN 'PASSED'
        WHEN practical_interview_status = 'FAILED' THEN 'FAILED'
        WHEN practical_interview_status = 'CANCELLED' THEN 'CANCELED'
        ELSE 'PENDING'
    END,
    practical_score
FROM application
WHERE practical_interview_status IS NOT NULL;

-- 3-5. 임원 면접 (EXECUTIVE_INTERVIEW)
INSERT INTO application_stage (application_id, stage_name, stage_order, status, score)
SELECT 
    id, 
    'EXECUTIVE_INTERVIEW', 
    5,
    CASE 
        WHEN executive_interview_status = 'PENDING' THEN 'PENDING'
        WHEN executive_interview_status = 'SCHEDULED' THEN 'SCHEDULED'
        WHEN executive_interview_status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
        WHEN executive_interview_status = 'COMPLETED' THEN 'COMPLETED'
        WHEN executive_interview_status = 'PASSED' THEN 'PASSED'
        WHEN executive_interview_status = 'FAILED' THEN 'FAILED'
        WHEN executive_interview_status = 'CANCELLED' THEN 'CANCELED'
        ELSE 'PENDING'
    END,
    executive_score
FROM application
WHERE executive_interview_status IS NOT NULL;

-- 4. application 테이블 정리 (불필요 컬럼 삭제 및 신규 컬럼 정리)
-- 주의: FK 제약조건이나 인덱스가 걸려있다면 먼저 해제해야 할 수 있습니다.

-- 4-1. current_stage, overall_status 컬럼 정리 (또는 추가)
-- 이미 status(전체상태), interview_stage(현재단계)가 있으므로 이를 재활용하거나 이름을 변경합니다.
-- 여기서는 기존 interview_stage -> current_stage 로 의미를 확장하고, status -> overall_status로 매핑합니다.

ALTER TABLE application CHANGE COLUMN interview_stage current_stage ENUM('DOCUMENT', 'WRITTEN_TEST', 'AI_INTERVIEW', 'PRACTICAL_INTERVIEW', 'EXECUTIVE_INTERVIEW', 'FINAL_RESULT') DEFAULT 'DOCUMENT';
ALTER TABLE application CHANGE COLUMN status overall_status VARCHAR(20) DEFAULT 'IN_PROGRESS';

-- 4-2. 불필요한 컬럼 삭제 (백업이 있으므로 과감하게 삭제)
ALTER TABLE application 
  DROP COLUMN document_status,
  DROP COLUMN written_test_status,
  DROP COLUMN written_test_score,
  DROP COLUMN ai_interview_status,
  DROP COLUMN ai_interview_score,
  DROP COLUMN ai_interview_pass_reason,
  DROP COLUMN ai_interview_fail_reason,
  DROP COLUMN practical_interview_status,
  DROP COLUMN practical_score,
  DROP COLUMN executive_interview_status,
  DROP COLUMN executive_score,
  DROP COLUMN interview_status, -- 구버전 통합 컬럼
  DROP COLUMN pass_reason,      -- 단계별 reason으로 이동됨
  DROP COLUMN fail_reason;      -- 단계별 reason으로 이동됨

-- 4-3. (옵션) final_status 정리
-- overall_status와 중복될 수 있으나, 최종 합격 여부만 따로 본다면 유지.
-- 일단 유지합니다.

