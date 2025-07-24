-- AI 면접 전체 일정 구조 생성 SQL (수정된 버전 - 테이블 별칭 명시)
-- 실제 공고 ID 17번에 맞춰 생성된 INSERT 구문

-- 1. AI 면접용 schedule 생성
-- 공고 ID 17번 (공공기관 IT사업 PM/PL 모집)용 AI 면접 일정

INSERT INTO schedule (
    schedule_type, 
    user_id, 
    job_post_id, 
    title, 
    description, 
    location, 
    scheduled_at, 
    status
) VALUES (
    'ai_interview',
    NULL,  -- AI 면접은 면접관 불필요
    17,    -- 공공기관 IT사업 PM/PL 모집 공고 ID
    'AI 면접 - 공공기관 IT사업 PM/PL 모집',
    '공공기관 IT사업 PM/PL 모집 AI 면접 일정',
    '온라인',
    NOW(),
    'COMPLETED'
);

-- 2. AI 면접용 schedule_interview 생성
-- 공고 ID 17번에 대응하는 세부 일정 생성

INSERT INTO schedule_interview (
    schedule_id,
    user_id,
    schedule_date,
    status
) VALUES (
    (SELECT s.id FROM schedule s WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'),
    NULL,  -- AI 면접은 면접관 불필요
    NOW(),
    'COMPLETED'
);

-- 3. AI 면접 지원자 연결 생성 (schedule_interview_applicant)
-- 실제 지원자 데이터에 맞춰 연결 (15명의 지원자)

INSERT INTO schedule_interview_applicant (
    user_id,
    schedule_interview_id,
    interview_status
) VALUES 
(43, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(46, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(47, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(50, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(51, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(52, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(58, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(59, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(60, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(61, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(62, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(64, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(66, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(68, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED'),
(70, (SELECT si.id FROM schedule_interview si JOIN schedule s ON si.schedule_id = s.id WHERE s.job_post_id = 17 AND s.schedule_type = 'ai_interview'), 'AI_INTERVIEW_COMPLETED');

-- 4. AI 면접 전용 일정 생성 (ai_interview_schedule 테이블)
-- 기존 로직과의 호환성을 위해 생성

INSERT INTO ai_interview_schedule (
    application_id,
    job_post_id,
    applicant_user_id,
    scheduled_at,
    status
) VALUES 
(43, 17, 43, NOW(), 'COMPLETED'),
(46, 17, 46, NOW(), 'COMPLETED'),
(47, 17, 47, NOW(), 'COMPLETED'),
(50, 17, 50, NOW(), 'COMPLETED'),
(51, 17, 51, NOW(), 'COMPLETED'),
(52, 17, 52, NOW(), 'COMPLETED'),
(58, 17, 58, NOW(), 'COMPLETED'),
(59, 17, 59, NOW(), 'COMPLETED'),
(60, 17, 60, NOW(), 'COMPLETED'),
(61, 17, 61, NOW(), 'COMPLETED'),
(62, 17, 62, NOW(), 'COMPLETED'),
(64, 17, 64, NOW(), 'COMPLETED'),
(66, 17, 66, NOW(), 'COMPLETED'),
(68, 17, 68, NOW(), 'COMPLETED'),
(70, 17, 70, NOW(), 'COMPLETED');

-- 5. 생성 결과 확인 쿼리
-- AI 면접 일정 수 확인
SELECT 
    'AI 면접 일정 수' as description,
    COUNT(*) as count
FROM schedule s
WHERE s.schedule_type = 'ai_interview'

UNION ALL

-- AI 면접 세부 일정 수 확인
SELECT 
    'AI 면접 세부 일정 수' as description,
    COUNT(*) as count
FROM schedule_interview si
JOIN schedule s ON si.schedule_id = s.id
WHERE s.schedule_type = 'ai_interview'

UNION ALL

-- AI 면접 지원자 연결 수 확인
SELECT 
    'AI 면접 지원자 연결 수' as description,
    COUNT(*) as count
FROM schedule_interview_applicant sia
JOIN schedule_interview si ON sia.schedule_interview_id = si.id
JOIN schedule s ON si.schedule_id = s.id
WHERE s.schedule_type = 'ai_interview'

UNION ALL

-- AI 면접 전용 일정 수 확인
SELECT 
    'AI 면접 전용 일정 수' as description,
    COUNT(*) as count
FROM ai_interview_schedule ais;

-- 6. 상세 확인 쿼리
-- 공고별 AI 면접 지원자 현황
SELECT 
    jp.title as job_title,
    jp.id as job_post_id,
    COUNT(sia.id) as applicant_count
FROM schedule_interview_applicant sia
JOIN schedule_interview si ON sia.schedule_interview_id = si.id
JOIN schedule s ON si.schedule_id = s.id
JOIN jobpost jp ON s.job_post_id = jp.id
WHERE s.schedule_type = 'ai_interview'
GROUP BY jp.id, jp.title
ORDER BY jp.id;

-- 7. 지원자별 상세 정보 확인
SELECT 
    u.name as applicant_name,
    u.id as user_id,
    a.id as application_id,
    a.ai_interview_score,
    a.interview_status,
    sia.interview_status as schedule_interview_status
FROM schedule_interview_applicant sia
JOIN schedule_interview si ON sia.schedule_interview_id = si.id
JOIN schedule s ON si.schedule_id = s.id
JOIN users u ON sia.user_id = u.id
JOIN application a ON sia.user_id = a.user_id
WHERE s.schedule_type = 'ai_interview'
  AND s.job_post_id = 17
ORDER BY u.id; 