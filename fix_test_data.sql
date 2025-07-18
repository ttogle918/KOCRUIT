-- 면접관 AI 시스템 테스트 데이터 수정 스크립트

-- 1. 기존 interview_evaluation_item 데이터 삭제 (evaluation_id 불일치 해결)
DELETE FROM interview_evaluation_item WHERE evaluation_id IN (12, 13, 14, 15, 16);

-- 2. 현재 interview_evaluation 데이터의 실제 ID 확인 후 수정
-- (실제 생성된 ID로 맞춰야 함 - 아래는 예시)
-- 실제 ID를 확인하려면: SELECT id FROM interview_evaluation WHERE evaluator_id = 3108 ORDER BY id;

-- 3. 다양한 면접관 추가 (밸런스 테스트용)
-- 면접관 3109: 엄격한 평가자
INSERT INTO interview_evaluation (
    interview_id, evaluator_id, is_ai, total_score, summary, status, created_at, updated_at
) VALUES 
(41, 3109, 0, 2.80, '기준이 미달됩니다. 추가 학습이 필요합니다.', 'SUBMITTED', NOW(), NOW()),
(42, 3109, 0, 3.20, '보통 수준이지만 아쉬운 부분이 많습니다.', 'SUBMITTED', NOW(), NOW()),
(43, 3109, 0, 2.60, '전반적으로 실망스럽습니다.', 'SUBMITTED', NOW(), NOW()),
(44, 3109, 0, 3.00, '최소 기준은 충족하지만 부족합니다.', 'SUBMITTED', NOW(), NOW());

-- 면접관 3110: 관대한 평가자  
INSERT INTO interview_evaluation (
    interview_id, evaluator_id, is_ai, total_score, summary, status, created_at, updated_at
) VALUES 
(41, 3110, 0, 4.60, '훌륭한 후보자입니다! 강력 추천합니다.', 'SUBMITTED', NOW(), NOW()),
(42, 3110, 0, 4.40, '매우 만족스러운 역량을 보여줍니다.', 'SUBMITTED', NOW(), NOW()),
(43, 3110, 0, 4.80, '완벽에 가까운 지원자입니다.', 'SUBMITTED', NOW(), NOW()),
(44, 3110, 0, 4.20, '좋은 인상을 받았습니다.', 'SUBMITTED', NOW(), NOW());

-- 면접관 3111: 기술 중심 평가자
INSERT INTO interview_evaluation (
    interview_id, evaluator_id, is_ai, total_score, summary, status, created_at, updated_at
) VALUES 
(41, 3111, 0, 3.80, '기술력은 우수하나 다른 부분은 보통입니다.', 'SUBMITTED', NOW(), NOW()),
(42, 3111, 0, 3.60, '기술적 깊이가 있습니다.', 'SUBMITTED', NOW(), NOW()),
(43, 3111, 0, 4.00, '기술 전문성이 뛰어납니다.', 'SUBMITTED', NOW(), NOW());

-- 4. 실제 생성된 evaluation ID를 확인하고 interview_evaluation_item 데이터 추가
-- 먼저 실제 ID 확인:
-- SELECT id, evaluator_id, total_score FROM interview_evaluation ORDER BY id DESC LIMIT 15;

-- 예시: 실제 ID가 21, 22, 23, 24, 25라고 가정
-- 면접관 3108의 평가 항목들 (evaluation_id를 실제 값으로 변경)
INSERT INTO interview_evaluation_item (
    evaluation_id, evaluate_type, evaluate_score, grade, comment, created_at
) VALUES 
-- 평가 ID 21 (3108의 첫 번째 평가)
(21, '인성_예의', 4.5, 'A', '매우 예의 바르고 정중함', NOW()),
(21, '인성_성실성', 4.0, 'A', '성실하고 책임감이 강함', NOW()),
(21, '인성_적극성', 4.0, 'A', '적극적으로 참여하고 의견 제시', NOW()),
(21, '역량_기술력', 4.5, 'A', '기술력이 매우 우수함', NOW()),
(21, '역량_문제해결', 4.0, 'A', '문제 해결 능력이 뛰어남', NOW()),
(21, '역량_커뮤니케이션', 4.0, 'A', '의사소통이 명확하고 효과적', NOW()),

-- 평가 ID 22 (3108의 두 번째 평가)
(22, '인성_예의', 3.5, 'B', '기본적인 예의는 갖춤', NOW()),
(22, '인성_성실성', 4.0, 'A', '성실함', NOW()),
(22, '인성_적극성', 3.0, 'B', '적극성 부족', NOW()),
(22, '역량_기술력', 4.0, 'A', '기술력은 우수함', NOW()),
(22, '역량_문제해결', 3.0, 'B', '문제 해결 능력 보통', NOW()),
(22, '역량_커뮤니케이션', 2.5, 'C', '의사소통 개선 필요', NOW()),

-- 면접관 3109 (엄격한 평가자)의 평가 항목들
-- 평가 ID 26 (3109의 첫 번째 평가)
(26, '인성_예의', 3.0, 'B', '예의는 있으나 아쉬움', NOW()),
(26, '인성_성실성', 2.5, 'C', '성실성 부족', NOW()),
(26, '인성_적극성', 2.0, 'C', '적극성 매우 부족', NOW()),
(26, '역량_기술력', 3.5, 'B', '기술력 보통', NOW()),
(26, '역량_문제해결', 2.5, 'C', '문제 해결 능력 부족', NOW()),
(26, '역량_커뮤니케이션', 3.0, 'B', '의사소통 보통', NOW()),

-- 면접관 3110 (관대한 평가자)의 평가 항목들  
-- 평가 ID 30 (3110의 첫 번째 평가)
(30, '인성_예의', 4.8, 'A', '완벽한 예의', NOW()),
(30, '인성_성실성', 4.5, 'A', '매우 성실함', NOW()),
(30, '인성_적극성', 4.5, 'A', '매우 적극적', NOW()),
(30, '역량_기술력', 4.8, 'A', '뛰어난 기술력', NOW()),
(30, '역량_문제해결', 4.5, 'A', '우수한 문제 해결 능력', NOW()),
(30, '역량_커뮤니케이션', 4.8, 'A', '탁월한 의사소통', NOW()),

-- 면접관 3111 (기술 중심)의 평가 항목들
-- 평가 ID 33 (3111의 첫 번째 평가)  
(33, '인성_예의', 3.5, 'B', '예의는 보통', NOW()),
(33, '인성_성실성', 3.5, 'B', '성실성 보통', NOW()),
(33, '인성_적극성', 3.0, 'B', '적극성 보통', NOW()),
(33, '역량_기술력', 4.8, 'A', '기술력 최고 수준', NOW()),
(33, '역량_문제해결', 4.5, 'A', '기술적 문제 해결 우수', NOW()),
(33, '역량_커뮤니케이션', 3.0, 'B', '기술 설명은 좋음', NOW());

-- 5. 면접관이 회사 사용자 테이블에 있는지 확인 및 추가
-- company_user 테이블에 면접관들이 있는지 확인
-- SELECT id, name FROM company_user WHERE id IN (3108, 3109, 3110, 3111);

-- 없다면 추가 (예시 - 실제 company_id, department_id는 기존 데이터에 맞게 조정)
INSERT IGNORE INTO company_user (id, company_id, department_id, name, email, ranks) VALUES 
(3108, 1, 1, '김균형', 'kim.balance@test.com', 'senior_associate'),
(3109, 1, 1, '박엄격', 'park.strict@test.com', 'manager'),  
(3110, 1, 2, '이관대', 'lee.lenient@test.com', 'team_lead'),
(3111, 1, 1, '정기술', 'jung.tech@test.com', 'senior_associate');

-- 6. 테스트 확인 쿼리들
-- 면접관별 평가 횟수 확인
SELECT 
    evaluator_id,
    COUNT(*) as eval_count,
    AVG(total_score) as avg_score,
    MIN(total_score) as min_score,
    MAX(total_score) as max_score
FROM interview_evaluation 
WHERE evaluator_id IS NOT NULL
GROUP BY evaluator_id
ORDER BY evaluator_id;

-- 평가 항목 연결 상태 확인
SELECT 
    ie.evaluator_id,
    ie.id as eval_id,
    COUNT(iei.id) as item_count
FROM interview_evaluation ie
LEFT JOIN interview_evaluation_item iei ON ie.id = iei.evaluation_id
WHERE ie.evaluator_id IS NOT NULL
GROUP BY ie.evaluator_id, ie.id
ORDER BY ie.evaluator_id, ie.id; 