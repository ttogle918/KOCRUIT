-- 실무진 면접 통과자들의 임원 면접 평가 더미 데이터 생성 (서브쿼리 오류 해결)
-- 실제 평가 결과 형태로 데이터 삽입

-- 1. 실무진 면접 통과자들의 임원 면접 평가 데이터 생성
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
    'EXECUTIVE' as evaluation_type,
    CASE 
        WHEN RAND() < 0.25 THEN FLOOR(75 + RAND() * 15)  -- 25% 확률로 75-89점 (합격)
        WHEN RAND() < 0.55 THEN FLOOR(80 + RAND() * 15)  -- 30% 확률로 80-94점 (우수)
        ELSE FLOOR(85 + RAND() * 10)                      -- 45% 확률로 85-94점 (매우 우수)
    END as total_score,
    CASE 
        WHEN RAND() < 0.25 THEN '리더십과 전략적 사고가 양호하며 조직 문화 적합성도 우수함. 성장 잠재력이 있어 임원진으로 적합함.'
        WHEN RAND() < 0.55 THEN '뛰어난 리더십과 전략적 사고를 보유. 조직의 미래 비전과 일치하며 즉시 임원진으로 투입 가능함.'
        ELSE '탁월한 리더십과 전략적 사고를 보유. 조직의 핵심 임원으로서 뛰어난 성과를 낼 것으로 예상됨.'
    END as summary,
    'SUBMITTED' as status,
    NOW() - INTERVAL FLOOR(RAND() * 15) DAY as created_at,
    NOW() - INTERVAL FLOOR(RAND() * 15) DAY as updated_at
FROM application a
JOIN schedule_interview_applicant sia ON a.user_id = sia.user_id
WHERE a.interview_status = 'FIRST_INTERVIEW_PASSED'
AND a.document_status = 'PASSED';

-- 2. 임원 면접 평가 세부 항목 데이터 생성 - 리더십
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
    '리더십' as evaluate_type,
    CASE 
        WHEN RAND() < 0.15 THEN FLOOR(3 + RAND() * 2)    -- 15% 확률로 3-4점
        WHEN RAND() < 0.45 THEN FLOOR(4 + RAND() * 1)    -- 30% 확률로 4-5점
        ELSE 5                                            -- 55% 확률로 5점
    END as evaluate_score,
    CASE 
        WHEN RAND() < 0.15 THEN 'C'
        WHEN RAND() < 0.45 THEN 'B'
        ELSE 'A'
    END as grade,
    CASE 
        WHEN RAND() < 0.15 THEN '기본적인 리더십은 있으나 의사결정 능력 개선 필요.'
        WHEN RAND() < 0.45 THEN '양호한 리더십과 의사결정 능력을 보유함.'
        ELSE '뛰어난 리더십과 신속한 의사결정 능력을 보유함.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'EXECUTIVE'
AND a.interview_status = 'FIRST_INTERVIEW_PASSED';

-- 3. 전략적 사고 평가 항목
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
    '전략적 사고' as evaluate_type,
    CASE 
        WHEN RAND() < 0.2 THEN FLOOR(3 + RAND() * 2)     -- 20% 확률로 3-4점
        WHEN RAND() < 0.5 THEN FLOOR(4 + RAND() * 1)     -- 30% 확률로 4-5점
        ELSE 5                                            -- 50% 확률로 5점
    END as evaluate_score,
    CASE 
        WHEN RAND() < 0.2 THEN 'C'
        WHEN RAND() < 0.5 THEN 'B'
        ELSE 'A'
    END as grade,
    CASE 
        WHEN RAND() < 0.2 THEN '기본적인 전략적 사고는 있으나 비전 제시 능력 부족.'
        WHEN RAND() < 0.5 THEN '양호한 전략적 사고와 비전 제시 능력을 보유함.'
        ELSE '뛰어난 전략적 사고와 명확한 비전 제시 능력을 보유함.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'EXECUTIVE'
AND a.interview_status = 'FIRST_INTERVIEW_PASSED';

-- 4. 인성과 가치관 평가 항목
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
    '인성과 가치관' as evaluate_type,
    CASE 
        WHEN RAND() < 0.1 THEN FLOOR(3 + RAND() * 2)     -- 10% 확률로 3-4점
        WHEN RAND() < 0.4 THEN FLOOR(4 + RAND() * 1)     -- 30% 확률로 4-5점
        ELSE 5                                            -- 60% 확률로 5점
    END as evaluate_score,
    CASE 
        WHEN RAND() < 0.1 THEN 'C'
        WHEN RAND() < 0.4 THEN 'B'
        ELSE 'A'
    END as grade,
    CASE 
        WHEN RAND() < 0.1 THEN '기본적인 윤리의식은 있으나 조직 문화 적합성 검토 필요.'
        WHEN RAND() < 0.4 THEN '양호한 윤리의식과 조직 문화 적합성을 보유함.'
        ELSE '뛰어난 윤리의식과 조직 문화와의 완벽한 적합성을 보유함.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'EXECUTIVE'
AND a.interview_status = 'FIRST_INTERVIEW_PASSED';

-- 5. 성장 잠재력 평가 항목
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
    '성장 잠재력' as evaluate_type,
    CASE 
        WHEN RAND() < 0.2 THEN FLOOR(3 + RAND() * 2)     -- 20% 확률로 3-4점
        WHEN RAND() < 0.5 THEN FLOOR(4 + RAND() * 1)     -- 30% 확률로 4-5점
        ELSE 5                                            -- 50% 확률로 5점
    END as evaluate_score,
    CASE 
        WHEN RAND() < 0.2 THEN 'C'
        WHEN RAND() < 0.5 THEN 'B'
        ELSE 'A'
    END as grade,
    CASE 
        WHEN RAND() < 0.2 THEN '기본적인 성장 의지는 있으나 구체적 비전 부족.'
        WHEN RAND() < 0.5 THEN '양호한 성장 잠재력과 동기부여를 보유함.'
        ELSE '뛰어난 성장 잠재력과 강한 동기부여를 보유함.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'EXECUTIVE'
AND a.interview_status = 'FIRST_INTERVIEW_PASSED';

-- 6. 지원자의 임원 면접 상태 업데이트 (평가 완료)
UPDATE application a
JOIN schedule_interview_applicant sia ON a.user_id = sia.user_id
JOIN interview_evaluation ie ON sia.schedule_interview_id = ie.interview_id
SET a.interview_status = CASE 
    WHEN ie.total_score >= 80 THEN 'SECOND_INTERVIEW_PASSED'
    WHEN ie.total_score >= 75 THEN 'SECOND_INTERVIEW_PASSED'
    ELSE 'SECOND_INTERVIEW_FAILED'
END,
a.executive_score = ie.total_score
WHERE ie.evaluation_type = 'EXECUTIVE'
AND a.interview_status = 'FIRST_INTERVIEW_PASSED';

-- 7. 결과 확인 쿼리
SELECT 
    '임원 면접 평가 완료' as status,
    COUNT(*) as total_evaluations,
    AVG(ie.total_score) as avg_score,
    MIN(ie.total_score) as min_score,
    MAX(ie.total_score) as max_score
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE ie.evaluation_type = 'EXECUTIVE'
AND a.interview_status IN ('SECOND_INTERVIEW_PASSED', 'SECOND_INTERVIEW_FAILED');

-- 8. 전체 면접 진행 상황 요약
SELECT 
    a.interview_status,
    COUNT(*) as applicant_count,
    AVG(a.ai_interview_score) as avg_ai_score,
    AVG(a.practical_score) as avg_practical_score,
    AVG(a.executive_score) as avg_executive_score
FROM application a
WHERE a.document_status = 'PASSED'
GROUP BY a.interview_status
ORDER BY 
    CASE a.interview_status
        WHEN 'AI_INTERVIEW_PASSED' THEN 1
        WHEN 'FIRST_INTERVIEW_PASSED' THEN 2
        WHEN 'SECOND_INTERVIEW_PASSED' THEN 3
        WHEN 'FINAL_INTERVIEW_PASSED' THEN 4
        ELSE 5
    END; 