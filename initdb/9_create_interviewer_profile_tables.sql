-- 면접관 프로필 테이블 생성 (통합 시스템)
-- 개별 면접관 특성 분석과 상대적 비교 분석을 통합한 시스템

-- 면접관 프로필 테이블
CREATE TABLE IF NOT EXISTS interviewer_profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 기존 테이블 연결
    evaluator_id INT NOT NULL UNIQUE,
    latest_evaluation_id INT,
    
    -- 개별 특성 분석 (0-100)
    strictness_score DECIMAL(5,2) DEFAULT 50.0,       -- 엄격도
    leniency_score DECIMAL(5,2) DEFAULT 50.0,         -- 관대함
    consistency_score DECIMAL(5,2) DEFAULT 50.0,      -- 일관성
    
    -- 평가 패턴 분석 (0-100)
    tech_focus_score DECIMAL(5,2) DEFAULT 50.0,       -- 기술 중심도
    personality_focus_score DECIMAL(5,2) DEFAULT 50.0, -- 인성 중심도
    detail_level_score DECIMAL(5,2) DEFAULT 50.0,     -- 상세도
    
    -- 신뢰도 지표 (0-100)
    experience_score DECIMAL(5,2) DEFAULT 50.0,       -- 경험치
    accuracy_score DECIMAL(5,2) DEFAULT 50.0,         -- 정확도
    
    -- 통계 데이터
    total_interviews INT DEFAULT 0,                   -- 총 면접 횟수
    avg_score_given DECIMAL(5,2) DEFAULT 0.0,        -- 평균 부여 점수
    score_variance DECIMAL(5,2) DEFAULT 0.0,         -- 점수 분산
    pass_rate DECIMAL(5,2) DEFAULT 0.0,              -- 합격률
    
    -- 평가 세부 통계
    avg_tech_score DECIMAL(5,2) DEFAULT 0.0,         -- 평균 기술 점수
    avg_personality_score DECIMAL(5,2) DEFAULT 0.0,  -- 평균 인성 점수
    avg_memo_length DECIMAL(8,2) DEFAULT 0.0,        -- 평균 메모 길이
    
    -- 상대적 위치 (전체 면접관 대비)
    strictness_percentile DECIMAL(5,2) DEFAULT 50.0,  -- 엄격도 백분위
    consistency_percentile DECIMAL(5,2) DEFAULT 50.0, -- 일관성 백분위
    
    -- 메타데이터
    last_evaluation_date DATETIME,                   -- 마지막 평가 날짜
    profile_version INT DEFAULT 1,                   -- 프로필 버전
    confidence_level DECIMAL(5,2) DEFAULT 0.0,       -- 프로필 신뢰도
    is_active BOOLEAN DEFAULT TRUE,                  -- 활성 상태
    
    -- 타임스탬프
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 외래키 제약조건
    FOREIGN KEY (evaluator_id) REFERENCES company_user(id) ON DELETE CASCADE,
    FOREIGN KEY (latest_evaluation_id) REFERENCES interview_evaluation(id) ON DELETE SET NULL,
    
    -- 인덱스
    INDEX idx_interviewer_profile_evaluator (evaluator_id),
    INDEX idx_interviewer_profile_scores (strictness_score, consistency_score),
    INDEX idx_interviewer_profile_focus (tech_focus_score, personality_focus_score)
);

-- 면접관 프로필 변경 이력 테이블
CREATE TABLE IF NOT EXISTS interviewer_profile_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 연결 정보
    interviewer_profile_id INT NOT NULL,
    evaluation_id INT,
    
    -- 변경 전후 값 (JSON)
    old_values TEXT,                                  -- JSON 형태로 저장
    new_values TEXT,                                  -- JSON 형태로 저장
    
    -- 변경 정보
    change_type VARCHAR(50) NOT NULL,                -- 'evaluation_added', 'profile_updated', 'manual_adjustment'
    change_reason TEXT,                              -- 변경 사유
    
    -- 메타데이터
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 외래키 제약조건
    FOREIGN KEY (interviewer_profile_id) REFERENCES interviewer_profile(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluation_id) REFERENCES interview_evaluation(id) ON DELETE SET NULL,
    
    -- 인덱스
    INDEX idx_profile_history_evaluator (interviewer_profile_id),
    INDEX idx_profile_history_date (created_at)
);

-- 기존 면접관들의 초기 프로필 데이터 생성
INSERT IGNORE INTO interviewer_profile (evaluator_id, created_at, updated_at)
SELECT DISTINCT evaluator_id, NOW(), NOW()
FROM interview_evaluation
WHERE evaluator_id IS NOT NULL;

-- 초기 데이터 확인
SELECT 
    '면접관 프로필 테이블 생성 완료' as status,
    COUNT(*) as total_profiles
FROM interviewer_profile; 