-- AI 인사이트 테이블 생성
CREATE TABLE IF NOT EXISTS ai_insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_post_id INT NOT NULL,
    analysis_type VARCHAR(50) NOT NULL,
    analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    analysis_status VARCHAR(20) DEFAULT 'completed',
    langgraph_execution_id VARCHAR(100),
    execution_time FLOAT,
    score_analysis JSON,
    correlation_analysis JSON,
    trend_analysis JSON,
    recommendations JSON,
    predictions JSON,
    advanced_insights JSON,
    pattern_analysis JSON,
    risk_assessment JSON,
    optimization_suggestions JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_post_id) REFERENCES jobpost(id) ON DELETE CASCADE,
    INDEX idx_job_post_id (job_post_id),
    INDEX idx_analysis_date (analysis_date),
    INDEX idx_analysis_type (analysis_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI 인사이트 비교 분석 테이블 생성
CREATE TABLE IF NOT EXISTS ai_insights_comparisons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_post_id INT NOT NULL,
    compared_job_post_id INT NOT NULL,
    comparison_metrics JSON,
    similarity_score FLOAT,
    key_differences JSON,
    advanced_comparison JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_post_id) REFERENCES jobpost(id) ON DELETE CASCADE,
    FOREIGN KEY (compared_job_post_id) REFERENCES jobpost(id) ON DELETE CASCADE,
    INDEX idx_job_post_id (job_post_id),
    INDEX idx_compared_job_post_id (compared_job_post_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 생성 확인을 위한 샘플 데이터 삽입 (선택사항)
-- INSERT INTO ai_insights (job_post_id, analysis_type, analysis_status) VALUES (1, 'basic', 'completed'); 