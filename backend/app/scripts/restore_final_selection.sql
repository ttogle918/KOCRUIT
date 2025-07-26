-- DB 초기화 후 최종 선발 데이터 복원
-- 17번 공고의 최종 선발자 데이터 복원

USE kocruit;

-- 1. 17번 공고의 headcount 확인
SELECT headcount FROM jobpost WHERE id = 17;

-- 2. 임원 면접까지 완료된 지원자들을 점수 순으로 정렬하여 최종 선발
UPDATE application a
SET 
    a.final_status = 'SELECTED',
    a.pass_reason = CONCAT('최종 선발 (점수: ', ROUND(a.final_score, 1), '점)')
WHERE a.job_post_id = 17
AND a.document_status = 'PASSED'
AND a.executive_score IS NOT NULL
AND a.id IN (
    SELECT id FROM (
        SELECT a2.id
        FROM application a2
        WHERE a2.job_post_id = 17
        AND a2.document_status = 'PASSED'
        AND a2.executive_score IS NOT NULL
        ORDER BY a2.final_score DESC
        LIMIT (SELECT headcount FROM jobpost WHERE id = 17)
    ) AS temp
);

-- 3. 나머지 지원자들을 NOT_SELECTED로 설정
UPDATE application a
SET 
    a.final_status = 'NOT_SELECTED'
WHERE a.job_post_id = 17
AND a.document_status = 'PASSED'
AND a.executive_score IS NOT NULL
AND a.final_status != 'SELECTED';

-- 4. 최종 결과 확인
SELECT 
    '17번 공고 최종 선발 결과' as info,
    COUNT(*) as total_selected,
    AVG(a.final_score) as avg_final_score,
    MIN(a.final_score) as min_final_score,
    MAX(a.final_score) as max_final_score
FROM application a
WHERE a.job_post_id = 17
AND a.final_status = 'SELECTED';

-- 5. 최종 선발자 목록
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