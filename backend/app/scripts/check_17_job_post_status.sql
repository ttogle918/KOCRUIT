-- 17번 공고의 현재 지원자 상태 확인
-- 임원 면접 탈락자와 최종 합격자 현황 파악

USE kocruit;

-- 17번 공고 정보 확인
SELECT 
    id,
    title,
    headcount,
    status
FROM jobpost 
WHERE id = 17;

-- 17번 공고의 모든 지원자 상태 확인
SELECT 
    a.id,
    u.name as applicant_name,
    a.status,
    a.document_status,
    a.interview_status,
    a.ai_interview_score,
    a.practical_score,
    a.executive_score,
    ROUND(a.final_score, 1) as final_score,
    a.pass_reason
FROM application a
JOIN users u ON a.user_id = u.id
WHERE a.job_post_id = 17
ORDER BY a.final_score DESC;

-- 임원 면접 평가 결과 확인
SELECT 
    a.id,
    u.name as applicant_name,
    ie.evaluation_type,
    ie.total_score,
    ie.summary,
    ie.status as evaluation_status
FROM application a
JOIN users u ON a.user_id = u.id
LEFT JOIN interview_evaluation ie ON a.id = ie.interview_id
WHERE a.job_post_id = 17
AND ie.evaluation_type = 'EXECUTIVE'
ORDER BY ie.total_score DESC;

-- 현재 최종 합격자 수 확인
SELECT 
    COUNT(*) as current_passed_count,
    (SELECT headcount FROM jobpost WHERE id = 17) as required_headcount
FROM application a
WHERE a.job_post_id = 17
AND a.status = 'PASSED'
AND a.document_status = 'PASSED'; 