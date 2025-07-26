-- AI 면접 통과자들의 실무진 면접 평가 더미 데이터 생성 (외래키 제약조건 해결)
-- 실제 평가 결과 형태로 데이터 삽입

-- 1. AI 면접 통과자들의 실무진 면접 평가 데이터 생성
INSERT INTO interview_evaluation (
    interview_id,
    evaluator_id,
    is_ai,
    evaluation_type,
    total_score,
    summary,
    status,
    created_at,
    updated_at
)
SELECT 
    sia.schedule_interview_id as interview_id,
    NULL as evaluator_id,  -- 외래키 제약조건 문제 해결을 위해 NULL로 설정
    FALSE as is_ai,
    'PRACTICAL' as evaluation_type,
    CASE 
        WHEN RAND() < 0.3 THEN FLOOR(70 + RAND() * 20)  -- 30% 확률로 70-89점 (합격)
        WHEN RAND() < 0.6 THEN FLOOR(80 + RAND() * 15)  -- 30% 확률로 80-94점 (우수)
        ELSE FLOOR(85 + RAND() * 10)                     -- 40% 확률로 85-94점 (매우 우수)
    END as total_score,
    CASE 
        WHEN RAND() < 0.3 THEN '기술적 역량이 우수하고 실무 적응력이 뛰어남. 팀워크와 의사소통 능력도 양호함.'
        WHEN RAND() < 0.6 THEN '전반적으로 양호한 역량을 보유. 일부 영역에서 개선 여지가 있으나 충분히 실무 가능함.'
        ELSE '뛰어난 기술력과 문제해결 능력을 보유. 리더십과 의사소통 능력도 우수하여 즉시 실무 투입 가능함.'
    END as summary,
    'SUBMITTED' as status,
    NOW() - INTERVAL FLOOR(RAND() * 30) DAY as created_at,
    NOW() - INTERVAL FLOOR(RAND() * 30) DAY as updated_at
FROM application a
JOIN schedule_interview_applicant sia ON a.user_id = sia.user_id
WHERE a.interview_status = 'AI_INTERVIEW_PASSED'
AND a.document_status = 'PASSED';

-- 2. 실무진 면접 평가 세부 항목 데이터 생성
INSERT INTO interview_evaluation_item (
    evaluation_id,
    evaluate_type,
    evaluate_score,
    grade,
    comment,
    created_at
)
SELECT 
    ie.id as evaluation_id,
    '기술 역량' as evaluate_type,
    CASE 
        WHEN RAND() < 0.2 THEN FLOOR(3 + RAND() * 2)    -- 20% 확률로 3-4점
        WHEN RAND() < 0.6 THEN FLOOR(4 + RAND() * 1)    -- 40% 확률로 4-5점
        ELSE 5                                            -- 40% 확률로 5점
    END as evaluate_score,
    CASE 
        WHEN RAND() < 0.2 THEN 'C'
        WHEN RAND() < 0.6 THEN 'B'
        ELSE 'A'
    END as grade,
    CASE 
        WHEN RAND() < 0.2 THEN '기본적인 기술 이해도는 있으나 실무 적용에 제한이 있음.'
        WHEN RAND() < 0.6 THEN '충분한 기술력을 보유하고 실무 적용 가능함.'
        ELSE '뛰어난 기술력과 깊이 있는 이해도를 보유함.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'PRACTICAL'
AND a.interview_status = 'AI_INTERVIEW_PASSED';

-- 3. 경험 및 성과 평가 항목
INSERT INTO interview_evaluation_item (
    evaluation_id,
    evaluate_type,
    evaluate_score,
    grade,
    comment,
    created_at
)
SELECT 
    ie.id as evaluation_id,
    '경험 및 성과' as evaluate_type,
    CASE 
        WHEN RAND() < 0.3 THEN FLOOR(3 + RAND() * 2)    -- 30% 확률로 3-4점
        WHEN RAND() < 0.7 THEN FLOOR(4 + RAND() * 1)    -- 40% 확률로 4-5점
        ELSE 5                                            -- 30% 확률로 5점
    END as evaluate_score,
    CASE 
        WHEN RAND() < 0.3 THEN 'C'
        WHEN RAND() < 0.7 THEN 'B'
        ELSE 'A'
    END as grade,
    CASE 
        WHEN RAND() < 0.3 THEN '경험이 다소 부족하나 학습 의지는 양호함.'
        WHEN RAND() < 0.7 THEN '적절한 경험과 성과를 보유하고 있음.'
        ELSE '뛰어난 경험과 성과를 보유하고 있음.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'PRACTICAL'
AND a.interview_status = 'AI_INTERVIEW_PASSED';

-- 4. 문제해결 능력 평가 항목
INSERT INTO interview_evaluation_item (
    evaluation_id,
    evaluate_type,
    evaluate_score,
    grade,
    comment,
    created_at
)
SELECT 
    ie.id as evaluation_id,
    '문제해결 능력' as evaluate_type,
    CASE 
        WHEN RAND() < 0.25 THEN FLOOR(3 + RAND() * 2)   -- 25% 확률로 3-4점
        WHEN RAND() < 0.65 THEN FLOOR(4 + RAND() * 1)   -- 40% 확률로 4-5점
        ELSE 5                                            -- 35% 확률로 5점
    END as evaluate_score,
    CASE 
        WHEN RAND() < 0.25 THEN 'C'
        WHEN RAND() < 0.65 THEN 'B'
        ELSE 'A'
    END as grade,
    CASE 
        WHEN RAND() < 0.25 THEN '문제 인식은 가능하나 해결 방법이 다소 단순함.'
        WHEN RAND() < 0.65 THEN '논리적이고 체계적인 문제해결 능력을 보유함.'
        ELSE '창의적이고 효과적인 문제해결 능력을 보유함.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'PRACTICAL'
AND a.interview_status = 'AI_INTERVIEW_PASSED';

-- 5. 의사소통 및 협업 평가 항목
INSERT INTO interview_evaluation_item (
    evaluation_id,
    evaluate_type,
    evaluate_score,
    grade,
    comment,
    created_at
)
SELECT 
    ie.id as evaluation_id,
    '의사소통 및 협업' as evaluate_type,
    CASE 
        WHEN RAND() < 0.2 THEN FLOOR(3 + RAND() * 2)    -- 20% 확률로 3-4점
        WHEN RAND() < 0.6 THEN FLOOR(4 + RAND() * 1)    -- 40% 확률로 4-5점
        ELSE 5                                            -- 40% 확률로 5점
    END as evaluate_score,
    CASE 
        WHEN RAND() < 0.2 THEN 'C'
        WHEN RAND() < 0.6 THEN 'B'
        ELSE 'A'
    END as grade,
    CASE 
        WHEN RAND() < 0.2 THEN '기본적인 소통은 가능하나 팀워크 개선 필요.'
        WHEN RAND() < 0.6 THEN '원활한 소통과 협업 능력을 보유함.'
        ELSE '뛰어난 소통 능력과 리더십을 보유함.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'PRACTICAL'
AND a.interview_status = 'AI_INTERVIEW_PASSED';

-- 6. 성장 의지 평가 항목
INSERT INTO interview_evaluation_item (
    evaluation_id,
    evaluate_type,
    evaluate_score,
    grade,
    comment,
    created_at
)
SELECT 
    ie.id as evaluation_id,
    '성장 의지' as evaluate_type,
    CASE 
        WHEN RAND() < 0.15 THEN FLOOR(3 + RAND() * 2)   -- 15% 확률로 3-4점
        WHEN RAND() < 0.55 THEN FLOOR(4 + RAND() * 1)   -- 40% 확률로 4-5점
        ELSE 5                                            -- 45% 확률로 5점
    END as evaluate_score,
    CASE 
        WHEN RAND() < 0.15 THEN 'C'
        WHEN RAND() < 0.55 THEN 'B'
        ELSE 'A'
    END as grade,
    CASE 
        WHEN RAND() < 0.15 THEN '기본적인 학습 의지는 있으나 구체적 계획 부족.'
        WHEN RAND() < 0.55 THEN '적극적인 학습 의지와 성장 계획을 보유함.'
        ELSE '뛰어난 학습 의지와 명확한 성장 비전을 보유함.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'PRACTICAL'
AND a.interview_status = 'AI_INTERVIEW_PASSED';

-- 7. 지원자의 실무진 면접 상태 업데이트 (평가 완료)
UPDATE application a
JOIN schedule_interview_applicant sia ON a.user_id = sia.user_id
JOIN interview_evaluation ie ON sia.schedule_interview_id = ie.interview_id
SET a.interview_status = CASE 
    WHEN ie.total_score >= 80 THEN 'FIRST_INTERVIEW_PASSED'
    WHEN ie.total_score >= 70 THEN 'FIRST_INTERVIEW_PASSED'
    ELSE 'FIRST_INTERVIEW_FAILED'
END,
a.practical_score = ie.total_score
WHERE ie.evaluation_type = 'PRACTICAL'
AND a.interview_status = 'AI_INTERVIEW_PASSED';

-- 8. 결과 확인 쿼리
SELECT 
    '실무진 면접 평가 완료' as status,
    COUNT(*) as total_evaluations,
    AVG(ie.total_score) as avg_score,
    MIN(ie.total_score) as min_score,
    MAX(ie.total_score) as max_score
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'PRACTICAL'
AND a.interview_status IN ('FIRST_INTERVIEW_PASSED', 'FIRST_INTERVIEW_FAILED'); 