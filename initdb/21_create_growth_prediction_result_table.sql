-- 성장가능성 예측 결과 테이블 생성 (MySQL)
USE kocruit;

CREATE TABLE IF NOT EXISTS growth_prediction_result (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    jobpost_id INT,
    company_id INT,
    
    -- 성장가능성 예측 결과 데이터 (JSON 형태로 저장)
    total_score FLOAT NOT NULL,  -- 총점
    detail JSON,  -- 항목별 상세 점수
    comparison_chart_data JSON,  -- 비교 차트 데이터
    reasons JSON,  -- 예측 근거
    boxplot_data JSON,  -- 박스플롯 데이터
    detail_explanation JSON,  -- 항목별 상세 설명
    item_table JSON,  -- 표 데이터
    narrative TEXT,  -- 자동 요약 설명
    
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
    INDEX idx_growth_prediction_application_id (application_id),
    INDEX idx_growth_prediction_jobpost_id (jobpost_id),
    INDEX idx_growth_prediction_company_id (company_id),
    INDEX idx_growth_prediction_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 생성 확인
SELECT 'growth_prediction_result table created successfully' as status; 