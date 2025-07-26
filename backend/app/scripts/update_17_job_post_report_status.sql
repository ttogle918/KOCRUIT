-- 17번 공고의 보고서 상태 업데이트
-- 최종 선발자가 선정된 후 보고서 버튼들이 활성화되도록 설정

USE kocruit;

-- JobPost 테이블에 보고서 상태 컬럼이 없으면 추가
ALTER TABLE jobpost 
ADD COLUMN IF NOT EXISTS interview_report_done BOOLEAN DEFAULT FALSE COMMENT '면접 보고서 완료 여부',
ADD COLUMN IF NOT EXISTS final_report_done BOOLEAN DEFAULT FALSE COMMENT '최종 보고서 완료 여부';

-- 17번 공고의 보고서 상태를 TRUE로 설정
UPDATE jobpost 
SET 
    interview_report_done = TRUE,
    final_report_done = TRUE
WHERE id = 17;

-- 변경사항 확인
SELECT 
    id,
    title,
    interview_report_done,
    final_report_done
FROM jobpost 
WHERE id = 17;

-- 최종 선발자 확인
SELECT 
    a.id,
    a.job_post_id,
    a.user_id,
    a.status,
    a.document_status,
    u.name as applicant_name
FROM application a
JOIN users u ON a.user_id = u.id
WHERE a.job_post_id = 17 
AND a.status = 'PASSED'
AND a.document_status = 'PASSED'; 