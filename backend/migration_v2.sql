-- 1. application_stage 테이블 생성
CREATE TABLE IF NOT EXISTS application_stage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    stage_name VARCHAR(50) NOT NULL,
    stage_order INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    score DECIMAL(5, 2),
    pass_reason TEXT,
    fail_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE
);

-- 2. application 테이블에 새로운 컬럼 추가 (존재하지 않을 경우에만)
-- MySQL에서는 IF NOT EXISTS 구문이 ALTER TABLE ADD COLUMN에 바로 지원되지 않는 버전이 많아 프로시저 사용
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DELIMITER //
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(255), 
    IN colName VARCHAR(255), 
    IN colType VARCHAR(255)
)
BEGIN
    DECLARE colCount INT;
    SELECT count(*) INTO colCount FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = tableName AND column_name = colName;
    
    IF colCount = 0 THEN
        SET @s = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', colName, ' ', colType);
        PREPARE stmt FROM @s;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL AddColumnIfNotExists('application', 'current_stage', "VARCHAR(50) NOT NULL DEFAULT 'DOCUMENT' COMMENT '현재 진행 중인 전형 단계'");
CALL AddColumnIfNotExists('application', 'overall_status', "VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS' COMMENT '전체 지원 상태'");
CALL AddColumnIfNotExists('application', 'final_score', "DECIMAL(5, 2) COMMENT '최종 합산 점수'");
CALL AddColumnIfNotExists('application', 'ai_interview_video_url', "VARCHAR(400) COMMENT 'AI 면접 비디오 URL'");

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- 3. 기존 데이터 마이그레이션 (옵션: 필요 시 주석 해제하여 사용)
-- 기존 status 컬럼들의 값을 application_stage로 옮기는 로직이 필요하다면 추가
-- 예: INSERT INTO application_stage (application_id, stage_name, status) SELECT id, 'DOCUMENT', document_status FROM application WHERE document_status IS NOT NULL;

