-- 17번 공고의 최종 선발 수정
-- headcount만큼만 선발하도록 조정

USE kocruit;

-- 17번 공고의 headcount 확인
SELECT headcount INTO @headcount FROM jobpost WHERE id = 17;

SELECT 
    '17번 공고 headcount' as info,
    @headcount as required_headcount;

-- 현재 최종 선발자 수 확인
SELECT COUNT(*) INTO @current_selected
FROM application a
WHERE a.job_post_id = 17
AND a.final_status = 'SELECTED';

SELECT @current_selected as current_selected_count;

-- 모든 최종 선발자를 NOT_SELECTED로 초기화
UPDATE application 
SET final_status = 'NOT_SELECTED'
WHERE job_post_id = 17
AND final_status = 'SELECTED';

-- headcount만큼만 최고 점수 순으로 선발 (ROW_NUMBER 사용)
UPDATE application a
JOIN (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY final_score DESC) as rn
    FROM application 
    WHERE job_post_id = 17
    AND document_status = 'PASSED'
    AND executive_score IS NOT NULL
) ranked ON a.id = ranked.id
SET 
    a.final_status = 'SELECTED',
    a.pass_reason = CONCAT('최종 선발 (점수: ', ROUND(a.final_score, 1), '점)')
WHERE ranked.rn <= @headcount;

-- 최종 결과 확인
SELECT 
    '수정된 최종 선발 결과' as info,
    COUNT(*) as total_selected,
    AVG(a.final_score) as avg_final_score,
    MIN(a.final_score) as min_final_score,
    MAX(a.final_score) as max_final_score
FROM application a
WHERE a.job_post_id = 17
AND a.final_status = 'SELECTED';

-- 최종 선발자 목록
SELECT 
    a.id,
    u.name as applicant_name,
    a.ai_interview_score,
    a.practical_score,
    a.executive_score,
    ROUND(a.final_score, 1) as final_score,
    a.final_status,
    a.pass_reason
FROM application a
JOIN users u ON a.user_id = u.id
WHERE a.job_post_id = 17
AND a.final_status = 'SELECTED'
ORDER BY a.final_score DESC; 