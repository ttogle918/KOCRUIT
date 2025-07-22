-- 하이라이팅 결과 테이블 생성 (MySQL)
USE kocruit;

CREATE TABLE IF NOT EXISTS highlight_result (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    jobpost_id INT,
    company_id INT,
    
    -- 하이라이팅 결과 데이터 (JSON 형태로 저장)
    yellow_highlights JSON,  -- 노란색 하이라이트 (value_fit)
    red_highlights JSON,     -- 빨간색 하이라이트 (risk)
    gray_highlights JSON,    -- 회색 하이라이트 (vague)
    purple_highlights JSON,  -- 보라색 하이라이트 (experience)
    blue_highlights JSON,    -- 파란색 하이라이트 (skill_fit)
    all_highlights JSON,     -- 전체 하이라이트 (우선순위 정렬됨)
    
    -- 메타데이터
    analysis_version VARCHAR(50) DEFAULT '1.0',  -- 분석 버전
    analysis_duration FLOAT,  -- 분석 소요 시간 (초)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 외래키 제약조건
    FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
    FOREIGN KEY (jobpost_id) REFERENCES jobpost(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE SET NULL,
    
    -- 인덱스 생성 (조회 성능 향상)
    INDEX idx_highlight_result_application_id (application_id),
    INDEX idx_highlight_result_jobpost_id (jobpost_id),
    INDEX idx_highlight_result_company_id (company_id),
    INDEX idx_highlight_result_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 생성 확인
SELECT 'highlight_result table created successfully' as status; 