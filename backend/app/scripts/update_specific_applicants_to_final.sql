-- 59, 61, 68번 지원자들을 최종 합격자로 업데이트
-- 음성/영상 데이터가 있는 지원자들의 완전한 평가 데이터 생성

-- 1. 대상 지원자 확인
SELECT 
    '대상 지원자 확인' as info,
    a.id,
    u.name as applicant_name,
    a.interview_status,
    a.ai_interview_score,
    a.practical_score,
    a.executive_score,
    a.final_score,
    a.status
FROM application a
JOIN users u ON a.user_id = u.id
WHERE a.id IN (59, 61, 68)
AND a.document_status = 'PASSED';

-- 2. 대상 지원자들의 AI 면접 분석 데이터 삽입 (음성/영상 데이터 기반)
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
    NULL as evaluator_id,
    TRUE as is_ai,  -- AI 평가
    'AI_INTERVIEW' as evaluation_type,
    CASE 
        WHEN a.id = 59 THEN 92  -- 59번: 매우 우수
        WHEN a.id = 61 THEN 88  -- 61번: 우수
        WHEN a.id = 68 THEN 90  -- 68번: 매우 우수
    END as total_score,
    CASE 
        WHEN a.id = 59 THEN '음성 분석 결과 매우 우수한 의사소통 능력을 보유. 영상 분석에서도 자신감 있고 전문적인 태도를 보여줌. 기술적 질문에 대한 답변도 정확하고 논리적임.'
        WHEN a.id = 61 THEN '음성 분석에서 명확하고 자신감 있는 답변을 보여줌. 영상 분석에서도 적절한 표정과 제스처를 사용하여 전문성을 드러냄. 전반적으로 우수한 면접 태도.'
        WHEN a.id = 68 THEN '음성 분석에서 뛰어난 발음과 명확한 의사전달 능력을 보유. 영상 분석에서도 자신감 있고 전문적인 모습을 보여줌. 기술적 역량과 소통 능력 모두 우수함.'
    END as summary,
    'SUBMITTED' as status,
    NOW() - INTERVAL FLOOR(RAND() * 30) DAY as created_at,
    NOW() - INTERVAL FLOOR(RAND() * 30) DAY as updated_at
FROM application a
JOIN schedule_interview_applicant sia ON a.user_id = sia.user_id
WHERE a.id IN (59, 61, 68)
AND a.document_status = 'PASSED';

-- 3. AI 면접 세부 평가 항목 데이터 삽입
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
    '음성 분석' as evaluate_type,
    CASE 
        WHEN a.id = 59 THEN 5
        WHEN a.id = 61 THEN 4
        WHEN a.id = 68 THEN 5
    END as evaluate_score,
    CASE 
        WHEN a.id = 59 THEN 'A'
        WHEN a.id = 61 THEN 'A'
        WHEN a.id = 68 THEN 'A'
    END as grade,
    CASE 
        WHEN a.id = 59 THEN '매우 명확하고 자신감 있는 발음. 적절한 속도와 톤으로 전문성을 드러냄.'
        WHEN a.id = 61 THEN '명확하고 이해하기 쉬운 발음. 적절한 속도로 의사전달이 원활함.'
        WHEN a.id = 68 THEN '뛰어난 발음과 명확한 의사전달. 전문가다운 자신감 있는 톤.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE a.id IN (59, 61, 68)
AND ie.evaluation_type = 'AI_INTERVIEW';

-- 4. 영상 분석 평가 항목
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
    '영상 분석' as evaluate_type,
    CASE 
        WHEN a.id = 59 THEN 5
        WHEN a.id = 61 THEN 4
        WHEN a.id = 68 THEN 5
    END as evaluate_score,
    CASE 
        WHEN a.id = 59 THEN 'A'
        WHEN a.id = 61 THEN 'A'
        WHEN a.id = 68 THEN 'A'
    END as grade,
    CASE 
        WHEN a.id = 59 THEN '자신감 있고 전문적인 표정과 제스처. 적절한 눈 맞춤과 자세로 신뢰감을 줌.'
        WHEN a.id = 61 THEN '적절한 표정과 제스처 사용. 전문성을 보여주는 자신감 있는 태도.'
        WHEN a.id = 68 THEN '뛰어난 비언어적 소통 능력. 전문가다운 자신감과 신뢰감을 주는 태도.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE a.id IN (59, 61, 68)
AND ie.evaluation_type = 'AI_INTERVIEW';

-- 5. 기술 역량 평가 항목
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
        WHEN a.id = 59 THEN 5
        WHEN a.id = 61 THEN 4
        WHEN a.id = 68 THEN 5
    END as evaluate_score,
    CASE 
        WHEN a.id = 59 THEN 'A'
        WHEN a.id = 61 THEN 'A'
        WHEN a.id = 68 THEN 'A'
    END as grade,
    CASE 
        WHEN a.id = 59 THEN '뛰어난 기술적 이해도와 실무 적용 능력. 깊이 있는 기술적 지식을 보유함.'
        WHEN a.id = 61 THEN '충분한 기술적 역량과 실무 적용 가능성. 양호한 기술적 이해도를 보유함.'
        WHEN a.id = 68 THEN '탁월한 기술적 역량과 실무 적용 능력. 전문가 수준의 기술적 지식을 보유함.'
    END as comment,
    ie.created_at
FROM interview_evaluation ie
JOIN schedule_interview_applicant sia ON ie.interview_id = sia.schedule_interview_id
JOIN application a ON sia.user_id = a.user_id
WHERE a.id IN (59, 61, 68)
AND ie.evaluation_type = 'AI_INTERVIEW';

-- 6. 대상 지원자들의 AI 면접 점수 업데이트
UPDATE application a
JOIN schedule_interview_applicant sia ON a.user_id = sia.user_id
JOIN interview_evaluation ie ON sia.schedule_interview_id = ie.interview_id
SET 
    a.ai_interview_score = ie.total_score,
    a.interview_status = 'AI_INTERVIEW_PASSED'
WHERE a.id IN (59, 61, 68)
AND ie.evaluation_type = 'AI_INTERVIEW'
AND a.document_status = 'PASSED';

-- 7. 대상 지원자들의 실무진 면접 평가 데이터 생성 (이미 있을 수 있으므로 확인 후 삽입)
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
    NULL as evaluator_id,
    FALSE as is_ai,
    'PRACTICAL' as evaluation_type,
    CASE 
        WHEN a.id = 59 THEN 95  -- 59번: 매우 우수
        WHEN a.id = 61 THEN 88  -- 61번: 우수
        WHEN a.id = 68 THEN 92  -- 68번: 매우 우수
    END as total_score,
    CASE 
        WHEN a.id = 59 THEN '뛰어난 기술력과 문제해결 능력을 보유. 리더십과 의사소통 능력도 우수하여 즉시 실무 투입 가능함. 팀워크와 협업 능력도 탁월함.'
        WHEN a.id = 61 THEN '전반적으로 양호한 역량을 보유. 기술적 능력과 실무 적응력이 우수함. 팀워크와 의사소통 능력도 양호함.'
        WHEN a.id = 68 THEN '탁월한 기술력과 문제해결 능력을 보유. 리더십과 의사소통 능력도 우수하여 즉시 실무 투입 가능함. 성장 잠재력도 뛰어남.'
    END as summary,
    'SUBMITTED' as status,
    NOW() - INTERVAL FLOOR(RAND() * 15) DAY as created_at,
    NOW() - INTERVAL FLOOR(RAND() * 15) DAY as updated_at
FROM application a
JOIN schedule_interview_applicant sia ON a.user_id = sia.user_id
WHERE a.id IN (59, 61, 68)
AND a.document_status = 'PASSED'
AND NOT EXISTS (
    SELECT 1 FROM interview_evaluation ie2 
    WHERE ie2.interview_id = sia.schedule_interview_id 
    AND ie2.evaluation_type = 'PRACTICAL'
);

-- 8. 대상 지원자들의 임원진 면접 평가 데이터 생성
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
    NULL as evaluator_id,
    FALSE as is_ai,
    'EXECUTIVE' as evaluation_type,
    CASE 
        WHEN a.id = 59 THEN 93  -- 59번: 매우 우수
        WHEN a.id = 61 THEN 87  -- 61번: 우수
        WHEN a.id = 68 THEN 91  -- 68번: 매우 우수
    END as total_score,
    CASE 
        WHEN a.id = 59 THEN '탁월한 리더십과 전략적 사고를 보유. 조직의 핵심 임원으로서 뛰어난 성과를 낼 것으로 예상됨. 조직 문화와의 완벽한 적합성을 보임.'
        WHEN a.id = 61 THEN '뛰어난 리더십과 전략적 사고를 보유. 조직의 미래 비전과 일치하며 즉시 임원진으로 투입 가능함. 성장 잠재력이 우수함.'
        WHEN a.id = 68 THEN '탁월한 리더십과 전략적 사고를 보유. 조직의 핵심 임원으로서 뛰어난 성과를 낼 것으로 예상됨. 인성과 가치관도 우수함.'
    END as summary,
    'SUBMITTED' as status,
    NOW() - INTERVAL FLOOR(RAND() * 10) DAY as created_at,
    NOW() - INTERVAL FLOOR(RAND() * 10) DAY as updated_at
FROM application a
JOIN schedule_interview_applicant sia ON a.user_id = sia.user_id
WHERE a.id IN (59, 61, 68)
AND a.document_status = 'PASSED'
AND NOT EXISTS (
    SELECT 1 FROM interview_evaluation ie2 
    WHERE ie2.interview_id = sia.schedule_interview_id 
    AND ie2.evaluation_type = 'EXECUTIVE'
);

-- 9. 대상 지원자들의 최종 상태 업데이트
UPDATE application a
SET 
    a.interview_status = 'SECOND_INTERVIEW_PASSED',
    a.practical_score = CASE 
        WHEN a.id = 59 THEN 95
        WHEN a.id = 61 THEN 88
        WHEN a.id = 68 THEN 92
    END,
    a.executive_score = CASE 
        WHEN a.id = 59 THEN 93
        WHEN a.id = 61 THEN 87
        WHEN a.id = 68 THEN 91
    END,
    a.final_score = CASE 
        WHEN a.id = 59 THEN (a.ai_interview_score * 0.3 + 95 * 0.4 + 93 * 0.3)  -- 93.1점
        WHEN a.id = 61 THEN (a.ai_interview_score * 0.3 + 88 * 0.4 + 87 * 0.3)  -- 87.7점
        WHEN a.id = 68 THEN (a.ai_interview_score * 0.3 + 92 * 0.4 + 91 * 0.3)  -- 91.3점
    END,
    a.status = 'PASSED',
    a.pass_reason = CASE 
        WHEN a.id = 59 THEN 'AI 면접: 92점, 실무진 면접: 95점, 임원진 면접: 93점으로 종합 평가 매우 우수'
        WHEN a.id = 61 THEN 'AI 면접: 88점, 실무진 면접: 88점, 임원진 면접: 87점으로 종합 평가 우수'
        WHEN a.id = 68 THEN 'AI 면접: 90점, 실무진 면접: 92점, 임원진 면접: 91점으로 종합 평가 매우 우수'
    END
WHERE a.id IN (59, 61, 68)
AND a.document_status = 'PASSED';

-- 10. 최종 결과 확인
SELECT 
    '59, 61, 68번 지원자 최종 결과' as info,
    a.id,
    u.name as applicant_name,
    a.interview_status,
    a.ai_interview_score,
    a.practical_score,
    a.executive_score,
    ROUND(a.final_score, 1) as final_score,
    a.status as final_status,
    a.pass_reason
FROM application a
JOIN users u ON a.user_id = u.id
WHERE a.id IN (59, 61, 68)
AND a.document_status = 'PASSED';

-- 11. 전체 최종 합격자 현황
SELECT 
    '전체 최종 합격자 현황' as info,
    COUNT(*) as total_passed,
    AVG(a.final_score) as avg_final_score,
    MIN(a.final_score) as min_final_score,
    MAX(a.final_score) as max_final_score
FROM application a
WHERE a.status = 'PASSED'
AND a.document_status = 'PASSED'; 