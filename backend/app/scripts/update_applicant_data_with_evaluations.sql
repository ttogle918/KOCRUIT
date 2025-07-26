-- 평가 더미 데이터에 맞춰 지원자 데이터 업데이트
-- 기존 데이터 정리 후 새로운 평가 결과에 맞춰 상태 및 점수 업데이트

-- 1. 현재 지원자 상태 확인
SELECT 
    '현재 지원자 상태' as info,
    a.interview_status,
    COUNT(*) as count,
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

-- 2. 평가 데이터가 있는 지원자들의 최신 상태로 업데이트
UPDATE application a
JOIN (
    SELECT 
        sia.user_id,
        ie.evaluation_type,
        ie.total_score,
        ROW_NUMBER() OVER (PARTITION BY sia.user_id ORDER BY ie.created_at DESC) as rn
    FROM schedule_interview_applicant sia
    JOIN interview_evaluation ie ON sia.schedule_interview_id = ie.interview_id
) latest_eval ON a.user_id = latest_eval.user_id AND latest_eval.rn = 1
SET 
    a.interview_status = CASE 
        WHEN latest_eval.evaluation_type = 'PRACTICAL' THEN
            CASE 
                WHEN latest_eval.total_score >= 80 THEN 'FIRST_INTERVIEW_PASSED'
                WHEN latest_eval.total_score >= 70 THEN 'FIRST_INTERVIEW_PASSED'
                ELSE 'FIRST_INTERVIEW_FAILED'
            END
        WHEN latest_eval.evaluation_type = 'EXECUTIVE' THEN
            CASE 
                WHEN latest_eval.total_score >= 80 THEN 'SECOND_INTERVIEW_PASSED'
                WHEN latest_eval.total_score >= 75 THEN 'SECOND_INTERVIEW_PASSED'
                ELSE 'SECOND_INTERVIEW_FAILED'
            END
        ELSE a.interview_status
    END,
    a.practical_score = CASE 
        WHEN latest_eval.evaluation_type = 'PRACTICAL' THEN latest_eval.total_score
        ELSE a.practical_score
    END,
    a.executive_score = CASE 
        WHEN latest_eval.evaluation_type = 'EXECUTIVE' THEN latest_eval.total_score
        ELSE a.executive_score
    END
WHERE a.document_status = 'PASSED';

-- 3. AI 면접 점수가 없는 지원자들에게 기본 점수 부여 (평가 데이터가 없는 경우)
UPDATE application a
SET 
    a.ai_interview_score = CASE 
        WHEN a.ai_interview_score IS NULL THEN FLOOR(70 + RAND() * 25)  -- 70-94점 랜덤
        ELSE a.ai_interview_score
    END,
    a.interview_status = CASE 
        WHEN a.interview_status IS NULL OR a.interview_status = '' THEN 'AI_INTERVIEW_PASSED'
        ELSE a.interview_status
    END
WHERE a.document_status = 'PASSED'
AND (a.ai_interview_score IS NULL OR a.interview_status IS NULL OR a.interview_status = '');

-- 4. 최종 점수 계산 (AI + 실무진 + 임원진 점수의 가중 평균)
UPDATE application a
SET 
    a.final_score = CASE 
        WHEN a.ai_interview_score IS NOT NULL 
             AND a.practical_score IS NOT NULL 
             AND a.executive_score IS NOT NULL THEN
            (a.ai_interview_score * 0.3 + a.practical_score * 0.4 + a.executive_score * 0.3)
        WHEN a.ai_interview_score IS NOT NULL 
             AND a.practical_score IS NOT NULL THEN
            (a.ai_interview_score * 0.4 + a.practical_score * 0.6)
        WHEN a.ai_interview_score IS NOT NULL THEN
            a.ai_interview_score
        ELSE NULL
    END
WHERE a.document_status = 'PASSED';

-- 5. 최종 합격/불합격 결정
UPDATE application a
SET 
    a.status = CASE 
        WHEN a.interview_status = 'SECOND_INTERVIEW_PASSED' THEN 'PASSED'
        WHEN a.interview_status IN ('AI_INTERVIEW_FAILED', 'FIRST_INTERVIEW_FAILED', 'SECOND_INTERVIEW_FAILED') THEN 'REJECTED'
        ELSE 'WAITING'
    END,
    a.pass_reason = CASE 
        WHEN a.interview_status = 'SECOND_INTERVIEW_PASSED' THEN 
            CONCAT('AI 면접: ', COALESCE(a.ai_interview_score, 0), '점, ',
                   '실무진 면접: ', COALESCE(a.practical_score, 0), '점, ',
                   '임원진 면접: ', COALESCE(a.executive_score, 0), '점으로 종합 평가 우수')
        ELSE NULL
    END,
    a.fail_reason = CASE 
        WHEN a.interview_status IN ('AI_INTERVIEW_FAILED', 'FIRST_INTERVIEW_FAILED', 'SECOND_INTERVIEW_FAILED') THEN 
            CASE 
                WHEN a.interview_status = 'AI_INTERVIEW_FAILED' THEN 'AI 면접 기준 미달'
                WHEN a.interview_status = 'FIRST_INTERVIEW_FAILED' THEN '실무진 면접 기준 미달'
                WHEN a.interview_status = 'SECOND_INTERVIEW_FAILED' THEN '임원진 면접 기준 미달'
                ELSE '면접 기준 미달'
            END
        ELSE NULL
    END
WHERE a.document_status = 'PASSED';

-- 6. 업데이트 후 최종 상태 확인
SELECT 
    '업데이트 후 최종 상태' as info,
    a.interview_status,
    COUNT(*) as count,
    AVG(a.ai_interview_score) as avg_ai_score,
    AVG(a.practical_score) as avg_practical_score,
    AVG(a.executive_score) as avg_executive_score,
    AVG(a.final_score) as avg_final_score
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

-- 7. 최종 합격/불합격 통계
SELECT 
    '최종 결과' as info,
    a.status,
    COUNT(*) as count,
    AVG(a.final_score) as avg_final_score
FROM application a
WHERE a.document_status = 'PASSED'
GROUP BY a.status
ORDER BY 
    CASE a.status
        WHEN 'PASSED' THEN 1
        WHEN 'WAITING' THEN 2
        WHEN 'REJECTED' THEN 3
        ELSE 4
    END;

-- 8. 상세 지원자 목록 (샘플)
SELECT 
    a.id,
    u.name as applicant_name,
    a.interview_status,
    a.ai_interview_score,
    a.practical_score,
    a.executive_score,
    a.final_score,
    a.status as final_status,
    a.pass_reason,
    a.fail_reason
FROM application a
JOIN users u ON a.user_id = u.id
WHERE a.document_status = 'PASSED'
ORDER BY a.final_score DESC
LIMIT 10; 