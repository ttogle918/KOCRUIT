-- 임원 면접 탈락자를 통과시켜 최종 합격자 수 확보
-- 17번 공고의 headcount만큼 최종 합격자 선정 (final_status 사용)

USE kocruit;

-- 17번 공고의 headcount 확인
SELECT headcount INTO @headcount FROM jobpost WHERE id = 17;
SET @target_count = @headcount + GREATEST(1, FLOOR(@headcount * 0.1)); -- headcount + 10% 또는 최소 1명

SELECT 
    '17번 공고 선발 목표' as info,
    @headcount as required_headcount,
    @target_count as target_count_with_reserve;

-- 현재 최종 선발자 수 확인 (final_status 기준)
SELECT COUNT(*) INTO @current_selected
FROM application a
WHERE a.job_post_id = 17
AND a.final_status = 'SELECTED';

SELECT @current_selected as current_selected_count;

-- 추가로 선발할 인원 수 계산
SET @additional_needed = GREATEST(0, @target_count - @current_selected);

SELECT @additional_needed as additional_needed;

-- 임원 면접까지 완료된 지원자들을 점수 순으로 정렬하여 추가 선발
-- (이미 SELECTED인 지원자 제외)
UPDATE application a
SET 
    a.final_status = 'SELECTED',
    a.pass_reason = CONCAT('임원 면접 통과 후 최종 선발 (점수: ', ROUND(a.final_score, 1), '점)')
WHERE a.job_post_id = 17
AND a.document_status = 'PASSED'
AND a.final_status != 'SELECTED'
AND a.executive_score IS NOT NULL
AND a.id IN (
    SELECT id FROM (
        SELECT a2.id
        FROM application a2
        WHERE a2.job_post_id = 17
        AND a2.document_status = 'PASSED'
        AND a2.final_status != 'SELECTED'
        AND a2.executive_score IS NOT NULL
        ORDER BY a2.final_score DESC
        LIMIT @additional_needed
    ) AS temp
);

-- 최종 결과 확인 (final_status 기준)
SELECT 
    '최종 선발 결과' as info,
    COUNT(*) as total_selected,
    AVG(a.final_score) as avg_final_score,
    MIN(a.final_score) as min_final_score,
    MAX(a.final_score) as max_final_score
FROM application a
WHERE a.job_post_id = 17
AND a.final_status = 'SELECTED';

-- 최종 선발자 목록 (final_status 기준)
SELECT 
    a.id,
    u.name as applicant_name,
    a.ai_interview_score,
    a.practical_score,
    a.executive_score,
    ROUND(a.final_score, 1) as final_score,
    a.status,
    a.final_status,
    a.pass_reason
FROM application a
JOIN users u ON a.user_id = u.id
WHERE a.job_post_id = 17
AND a.final_status = 'SELECTED'
ORDER BY a.final_score DESC; 