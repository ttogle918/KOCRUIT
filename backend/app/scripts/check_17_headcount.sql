-- 17번 공고의 headcount 확인
-- 정확한 모집 인원 수 파악

USE kocruit;

-- 17번 공고 정보 확인
SELECT 
    id,
    title,
    headcount,
    status
FROM jobpost 
WHERE id = 17;

-- 현재 최종 선발 현황
SELECT 
    '현재 최종 선발 현황' as info,
    COUNT(*) as total_applicants,
    SUM(CASE WHEN final_status = 'SELECTED' THEN 1 ELSE 0 END) as selected_count,
    SUM(CASE WHEN final_status = 'NOT_SELECTED' THEN 1 ELSE 0 END) as not_selected_count,
    SUM(CASE WHEN final_status = 'PENDING' THEN 1 ELSE 0 END) as pending_count
FROM application 
WHERE job_post_id = 17;

-- 최종 선발자 목록 (점수 순)
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