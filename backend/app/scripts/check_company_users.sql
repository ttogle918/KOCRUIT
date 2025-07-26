-- company_user 테이블의 실제 면접관 데이터 확인
-- 평가 더미 데이터 생성 전에 실제 존재하는 evaluator_id 확인

-- 1. 전체 company_user 목록 확인
SELECT 
    cu.id as evaluator_id,
    u.name as evaluator_name,
    u.email as evaluator_email,
    c.name as company_name,
    cu.ranks as rank,
    cu.joined_at
FROM company_user cu
JOIN users u ON cu.id = u.id
LEFT JOIN company c ON cu.company_id = c.id
ORDER BY cu.id;

-- 2. 면접관 수 확인
SELECT 
    COUNT(*) as total_interviewers,
    COUNT(DISTINCT cu.company_id) as total_companies
FROM company_user cu;

-- 3. 회사별 면접관 수
SELECT 
    c.name as company_name,
    COUNT(cu.id) as interviewer_count
FROM company_user cu
JOIN company c ON cu.company_id = c.id
GROUP BY c.id, c.name
ORDER BY interviewer_count DESC;

-- 4. 면접관 ID 범위 확인
SELECT 
    MIN(cu.id) as min_evaluator_id,
    MAX(cu.id) as max_evaluator_id,
    COUNT(cu.id) as total_count
FROM company_user cu;

-- 5. 실제 면접관 ID 목록 (평가 더미 데이터용)
SELECT cu.id as evaluator_id
FROM company_user cu
ORDER BY cu.id; 