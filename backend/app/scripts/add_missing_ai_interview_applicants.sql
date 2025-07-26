-- 누락된 5명의 AI 면접 통과자를 schedule_interview_applicant에 연결

-- 1. 누락된 5명 확인 (user_id: 72, 74, 76, 78, 80)
SELECT 
    a.id as application_id,
    a.user_id,
    a.job_post_id,
    a.ai_interview_score,
    a.interview_status
FROM application a
WHERE a.ai_interview_score IS NOT NULL 
  AND a.ai_interview_score > 0 
  AND a.interview_status = 'AI_INTERVIEW_PASSED'
  AND a.user_id NOT IN (
    SELECT sia.user_id
    FROM schedule_interview_applicant sia
    JOIN schedule_interview si ON sia.schedule_interview_id = si.id
    JOIN schedule s ON si.schedule_id = s.id
    WHERE s.schedule_type = 'ai_interview'
  )
ORDER BY a.user_id;

-- 2. 누락된 5명을 schedule_interview_applicant에 추가
INSERT INTO schedule_interview_applicant (
    user_id, 
    schedule_interview_id, 
    interview_status
) VALUES 
(72, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(74, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(76, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(78, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(80, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED');

-- 3. 추가 후 전체 AI 면접 지원자 연결 수 확인
SELECT 
    'AI 면접 지원자 연결 수 (추가 후)' as description,
    COUNT(*) as count
FROM schedule_interview_applicant sia
JOIN schedule_interview si ON sia.schedule_interview_id = si.id
JOIN schedule s ON si.schedule_id = s.id
WHERE s.schedule_type = 'ai_interview';

-- 4. 전체 20명 확인
SELECT 
    sia.user_id,
    a.ai_interview_score,
    a.interview_status,
    '연결됨' as connection_status
FROM schedule_interview_applicant sia
JOIN schedule_interview si ON sia.schedule_interview_id = si.id
JOIN schedule s ON si.schedule_id = s.id
JOIN application a ON sia.user_id = a.user_id
WHERE s.schedule_type = 'ai_interview'
ORDER BY sia.user_id; 