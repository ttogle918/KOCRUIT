-- 기존 면접 평가 데이터 복원 스크립트

-- 1. 먼저 interview_evaluation 테이블에 메인 평가 데이터 삽입
INSERT INTO interview_evaluation (id, interview_id, evaluator_id, is_ai, evaluation_type, total_score, summary, created_at, updated_at, status) VALUES
(12, 12, NULL, 0, 'HUMAN', 25.0, '기존 평가 데이터', '2025-07-17 06:30:49', '2025-07-17 06:30:49', 'SUBMITTED'),
(13, 13, NULL, 0, 'HUMAN', 21.0, '기존 평가 데이터', '2025-07-17 06:30:49', '2025-07-17 06:30:49', 'SUBMITTED'),
(14, 14, NULL, 1, 'AI', 22.5, '기존 평가 데이터', '2025-07-17 06:30:49', '2025-07-17 06:30:49', 'SUBMITTED'),
(15, 15, NULL, 0, 'HUMAN', 17.0, '기존 평가 데이터', '2025-07-17 06:30:49', '2025-07-17 06:30:49', 'SUBMITTED'),
(16, 16, NULL, 0, 'HUMAN', 29.0, '기존 평가 데이터', '2025-07-17 06:30:49', '2025-07-17 06:30:49', 'SUBMITTED');

-- 2. 그 다음 interview_evaluation_item 테이블에 개별 평가 항목 삽입
-- 평가 ID 12
INSERT INTO interview_evaluation_item (evaluation_id, evaluate_type, evaluate_score, grade, comment, created_at) VALUES
(12, '인성_예의', 4.50, 'A', '매우 예의 바르고 정중함', '2025-07-17 06:30:49'),
(12, '인성_성실성', 4.00, 'A', '성실하고 책임감이 강함', '2025-07-17 06:30:49'),
(12, '인성_적극성', 4.00, 'A', '적극적으로 참여하고 의견 제시', '2025-07-17 06:30:49'),
(12, '역량_기술력', 4.50, 'A', '기술력이 매우 우수함', '2025-07-17 06:30:49'),
(12, '역량_문제해결', 4.00, 'A', '문제 해결 능력이 뛰어남', '2025-07-17 06:30:49'),
(12, '역량_커뮤니케이션', 4.00, 'A', '의사소통이 명확하고 효과적', '2025-07-17 06:30:49');

-- 평가 ID 13
INSERT INTO interview_evaluation_item (evaluation_id, evaluate_type, evaluate_score, grade, comment, created_at) VALUES
(13, '인성_예의', 3.50, 'B', '기본적인 예의는 갖춤', '2025-07-17 06:30:49'),
(13, '인성_성실성', 4.00, 'A', '성실함', '2025-07-17 06:30:49'),
(13, '인성_적극성', 3.00, 'B', '적극성 부족', '2025-07-17 06:30:49'),
(13, '역량_기술력', 4.00, 'A', '기술력은 우수함', '2025-07-17 06:30:49'),
(13, '역량_문제해결', 3.00, 'B', '문제 해결 능력 보통', '2025-07-17 06:30:49'),
(13, '역량_커뮤니케이션', 2.50, 'C', '의사소통 개선 필요', '2025-07-17 06:30:49');

-- 평가 ID 14
INSERT INTO interview_evaluation_item (evaluation_id, evaluate_type, evaluate_score, grade, comment, created_at) VALUES
(14, '인성_예의', 4.00, 'A', 'AI 평가: 예의 바른 태도', '2025-07-17 06:30:49'),
(14, '인성_성실성', 3.50, 'B', 'AI 평가: 성실함', '2025-07-17 06:30:49'),
(14, '인성_적극성', 4.00, 'A', 'AI 평가: 적극적 참여', '2025-07-17 06:30:49'),
(14, '역량_기술력', 4.00, 'A', 'AI 평가: 기술력 우수', '2025-07-17 06:30:49'),
(14, '역량_문제해결', 3.50, 'B', 'AI 평가: 문제 해결 능력 보통', '2025-07-17 06:30:49'),
(14, '역량_커뮤니케이션', 3.50, 'B', 'AI 평가: 의사소통 보통', '2025-07-17 06:30:49');

-- 평가 ID 15
INSERT INTO interview_evaluation_item (evaluation_id, evaluate_type, evaluate_score, grade, comment, created_at) VALUES
(15, '인성_예의', 3.00, 'B', '기본 예의는 있음', '2025-07-17 06:30:49'),
(15, '인성_성실성', 2.50, 'C', '성실성 부족', '2025-07-17 06:30:49'),
(15, '인성_적극성', 2.00, 'C', '적극성 매우 부족', '2025-07-17 06:30:49'),
(15, '역량_기술력', 2.50, 'C', '기술력 부족', '2025-07-17 06:30:49'),
(15, '역량_문제해결', 2.00, 'C', '문제 해결 능력 부족', '2025-07-17 06:30:49'),
(15, '역량_커뮤니케이션', 3.00, 'B', '의사소통은 보통', '2025-07-17 06:30:49');

-- 평가 ID 16
INSERT INTO interview_evaluation_item (evaluation_id, evaluate_type, evaluate_score, grade, comment, created_at) VALUES
(16, '인성_예의', 5.00, 'A', '완벽한 예의', '2025-07-17 06:30:49'),
(16, '인성_성실성', 5.00, 'A', '완벽한 성실성', '2025-07-17 06:30:49'),
(16, '인성_적극성', 5.00, 'A', '완벽한 적극성', '2025-07-17 06:30:49'),
(16, '역량_기술력', 5.00, 'A', '완벽한 기술력', '2025-07-17 06:30:49'),
(16, '역량_문제해결', 4.50, 'A', '뛰어난 문제 해결 능력', '2025-07-17 06:30:49'),
(16, '역량_커뮤니케이션', 4.50, 'A', '뛰어난 의사소통 능력', '2025-07-17 06:30:49');

-- 2. 평가 메인 데이터 확인/생성 (필요한 경우)
-- 평가 ID 12-16이 interview_evaluation 테이블에 존재하는지 확인
SELECT id, interview_id, evaluation_type, total_score, created_at 
FROM interview_evaluation 
WHERE id IN (12, 13, 14, 15, 16);

-- 3. 삽입된 데이터 확인
SELECT 
    evaluation_id,
    evaluate_type,
    evaluate_score,
    grade,
    comment,
    created_at
FROM interview_evaluation_item 
WHERE evaluation_id IN (12, 13, 14, 15, 16)
ORDER BY evaluation_id, evaluate_type;

-- 4. 평가별 총점 계산 확인
SELECT 
    evaluation_id,
    COUNT(*) as item_count,
    AVG(evaluate_score) as avg_score,
    MIN(evaluate_score) as min_score,
    MAX(evaluate_score) as max_score
FROM interview_evaluation_item 
WHERE evaluation_id IN (12, 13, 14, 15, 16)
GROUP BY evaluation_id
ORDER BY evaluation_id; 