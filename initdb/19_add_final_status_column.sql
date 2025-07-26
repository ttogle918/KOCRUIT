-- Application 테이블에 final_status 컬럼 추가
-- 최종 선발 결과를 별도로 관리하기 위한 컬럼

USE kocruit;

-- Application 테이블에 final_status 컬럼 추가
ALTER TABLE application 
ADD COLUMN final_status ENUM('PENDING', 'SELECTED', 'NOT_SELECTED') DEFAULT 'PENDING' NOT NULL COMMENT '최종 선발 상태';

-- 기존 데이터에 대해 final_status 초기화
-- 임원 면접까지 완료된 지원자들을 대상으로 최종 선발 상태 설정
UPDATE application 
SET final_status = 'SELECTED'
WHERE job_post_id = 17 
AND document_status = 'PASSED'
AND status = 'PASSED'
AND executive_score IS NOT NULL;

-- 임원 면접까지 완료되었지만 최종 선발되지 않은 지원자들
UPDATE application 
SET final_status = 'NOT_SELECTED'
WHERE job_post_id = 17 
AND document_status = 'PASSED'
AND status != 'PASSED'
AND executive_score IS NOT NULL;

-- 변경사항 확인
SELECT 
    final_status,
    COUNT(*) as count
FROM application 
WHERE job_post_id = 17
GROUP BY final_status;

-- 17번 공고의 최종 선발 현황
SELECT 
    '17번 공고 최종 선발 현황' as info,
    COUNT(*) as total_applicants,
    SUM(CASE WHEN final_status = 'SELECTED' THEN 1 ELSE 0 END) as selected_count,
    SUM(CASE WHEN final_status = 'NOT_SELECTED' THEN 1 ELSE 0 END) as not_selected_count,
    SUM(CASE WHEN final_status = 'PENDING' THEN 1 ELSE 0 END) as pending_count
FROM application 
WHERE job_post_id = 17; 